/* =========================================================================
   IMPORTAR UNA RUTINA DESDE CSV O EXCEL
   Mismas columnas que al exportar (una fila por serie):
   Dia;Equipo;Ejercicio;Musculo;Serie;Tipo;Repeticiones;Peso_kg;Nota_serie;Objetivo;Objetivo_kg;Comentarios
   Solo "Dia" y "Ejercicio" son obligatorias. Separador ";" (también vale "," o tabulador).
   Decimales con coma o punto. En rest-pause y dropset las cifras van separadas por " · " o "/".
   ========================================================================= */
import { APP_VERSION, catReserva, catsDe } from '../data/catalog.js';
import { parseDecimal, parseNum, stripAcc, uid } from './format.js';
import { normalizeSet } from './training.js';

export const PLANTILLA_CSV = '\uFEFF' + [
  'Dia;Equipo;Ejercicio;Musculo;Serie;Tipo;Repeticiones;Peso_kg;Nota_serie;Objetivo;Objetivo_kg;Comentarios',
  'Pierna A;Cincha;Sentadilla;Cuádriceps;1;top set;6;100;;110 kg;110;Bajar controlado',
  'Pierna A;Cincha;Sentadilla;Cuádriceps;2;back-off;8;85;;;;',
  'Pierna A;Cincha;Extensión de cuádriceps;Cuádriceps;1;rest-pause;8 · 4 · 3;60;;;;',
  'Pecho;Muñequeras;Press inclinado;Pecho;1;calentamiento;10;40;;;;',
  'Pecho;Muñequeras;Press inclinado;Pecho;2;top set;8;70,5;;80 kg;80;',
  'Pecho;Muñequeras;Aperturas en polea;Pecho;1;dropset;10 · 8;30 · 22,5;;;;',
].join('\r\n') + '\r\n';

// Lee texto CSV: detecta el separador, respeta comillas y quita el BOM. Devuelve filas de texto.
export function parseCsv(text) {
  const t = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = t.split(/\r?\n/)[0] || '';
  const cuenta = (ch) => (firstLine.match(new RegExp(ch === '\t' ? '\t' : '\\' + ch, 'g')) || []).length;
  const sep = [';', '\t', ','].sort((a, b) => cuenta(b) - cuenta(a))[0];
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

const norm = (s) => stripAcc(String(s === null || s === undefined ? '' : s)).toLowerCase().replace(/[\s_\-()/.]/g, '');
const COLS = {
  dia: ['dia'], equipo: ['equipo', 'llevar'], ejercicio: ['ejercicio', 'nombre'], musculo: ['musculo'], serie: ['serie', 'n'],
  tipo: ['tipo', 'tipodeserie'], reps: ['repeticiones', 'reps'], peso: ['pesokg', 'peso', 'kg'], nota: ['notaserie', 'nota'],
  objetivo: ['objetivo'], objetivoKg: ['objetivokg'], comentarios: ['comentarios', 'comentario', 'tecnica'],
};
const TIPOS = { topset: 'top', top: 'top', backoff: 'backoff', restpause: 'rp', rp: 'rp', dropset: 'drop', drop: 'drop', calentamiento: 'warm', warm: 'warm' };

function musculoDe(txt, cats) {
  const n = norm(txt);
  if (!n) return null;
  const id = Object.keys(cats).find((k) => norm(k) === n || norm(cats[k].label) === n);
  return id || null;
}
const lista = (v) => String(v === null || v === undefined ? '' : v).split(/[·|/]/).map((x) => x.trim()).filter((x) => x !== '');
const numero = (v) => {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const t = String(v === null || v === undefined ? '' : v).trim();
  if (t === '' || t === '–' || t === '-') return null;
  const x = parseDecimal(t);
  return typeof x === 'number' ? x : null;
};

// Convierte filas (de CSV o Excel) en una rutina con el formato de los códigos de la app.
// prevState (opcional): para reutilizar los ejercicios que ya tienes con el mismo nombre y no perder su historial.
// Devuelve { ok, obj, avisos, resumen } o { ok: false, error }.
export function rowsToRutina(rows, prevState) {
  if (!rows || rows.length < 2) return { ok: false, error: 'El archivo está vacío o solo tiene la cabecera.' };
  const head = rows[0].map(norm);
  const idx = {};
  Object.keys(COLS).forEach((k) => { idx[k] = head.findIndex((h) => COLS[k].indexOf(h) !== -1); });
  if (idx.dia < 0 || idx.ejercicio < 0) return { ok: false, error: 'Faltan las columnas obligatorias "Dia" y "Ejercicio" en la primera fila. Usa la plantilla.' };
  const get = (r, k) => (idx[k] >= 0 ? r[idx[k]] : null);
  const avisos = [];
  const cats = catsDe(prevState); // tus músculos (también los que hayas creado)
  const reserva = catReserva(cats);
  const days = [];
  const dayByLabel = {};
  const exByKey = {}; // día|nombre → datos
  rows.slice(1).forEach((r, n) => {
    const fila = n + 2;
    const dia = String(get(r, 'dia') || '').trim();
    const nombre = String(get(r, 'ejercicio') || '').trim();
    if (!dia || !nombre) { avisos.push('Fila ' + fila + ': sin día o sin ejercicio, se ignora.'); return; }
    let d = dayByLabel[dia];
    if (!d) { d = { id: null, label: dia, equipo: '', nota: '', keys: [] }; dayByLabel[dia] = d; days.push(d); }
    const eq = String(get(r, 'equipo') || '').trim();
    if (eq && !d.equipo) d.equipo = eq;
    const key = dia + '|' + nombre;
    let ex = exByKey[key];
    if (!ex) {
      const mus = musculoDe(get(r, 'musculo'), cats);
      if (!mus && get(r, 'musculo')) avisos.push('Fila ' + fila + ': músculo "' + get(r, 'musculo') + '" desconocido, se pone ' + cats[reserva].label + ' (cámbialo en modo edición).');
      ex = { name: nombre, cat: mus || reserva, comentario: '', objetivo: null, sets: [] };
      exByKey[key] = ex; d.keys.push(key);
    }
    const com = String(get(r, 'comentarios') || '').trim();
    if (com && !ex.comentario) ex.comentario = com;
    const objTxt = String(get(r, 'objetivo') || '').trim();
    const objKg = numero(get(r, 'objetivoKg'));
    if ((objTxt || objKg !== null) && !ex.objetivo) ex.objetivo = { text: objTxt || String(objKg).replace('.', ',') + ' kg', value: objKg !== null ? objKg : parseNum(objTxt) };
    const tipoTxt = norm(get(r, 'tipo'));
    let tipo = TIPOS[tipoTxt] || null;
    if (tipoTxt && !tipo) avisos.push('Fila ' + fila + ': tipo de serie "' + get(r, 'tipo') + '" desconocido, se usa top set/back-off.');
    const nota = String(get(r, 'nota') || '').trim() || null;
    const repsRaw = get(r, 'reps'), pesoRaw = get(r, 'peso');
    let set;
    if (tipo === 'rp') {
      const tandas = lista(repsRaw).map(numero);
      set = { tipo, weight: numero(pesoRaw), tandas: tandas.length >= 2 ? tandas : [tandas[0] === undefined ? null : tandas[0], null, null], nota };
    } else if (tipo === 'drop') {
      const rs = lista(repsRaw).map(numero), ps = lista(pesoRaw).map(numero);
      const nDrops = Math.max(2, rs.length, ps.length);
      const drops = [];
      for (let i = 0; i < nDrops; i++) drops.push({ reps: rs[i] === undefined ? null : rs[i], weight: ps[i] === undefined ? null : ps[i] });
      set = { tipo, drops, nota };
    } else {
      set = { tipo, reps: numero(repsRaw), weight: numero(pesoRaw), nota };
    }
    const orden = numero(get(r, 'serie'));
    ex.sets.push({ orden: orden === null ? ex.sets.length + 1 : orden, set });
  });
  if (!days.length) return { ok: false, error: 'No hay ninguna fila con día y ejercicio.' };

  // Ids: se reutilizan los de tus ejercicios con el mismo nombre (así se conserva su historial)
  const prevEx = (prevState && prevState.exercises) || {};
  const prevDays = (prevState && prevState.days) || [];
  const usados = {};
  const exercises = {};
  const defsIguales = (a, b) => JSON.stringify([a.cat, a.currentSets, a.objetivo, a.comentario]) === JSON.stringify([b.cat, b.currentSets, b.objetivo, b.comentario]);
  days.forEach((d) => {
    const prevDay = prevDays.find((x) => norm(x.label) === norm(d.label));
    d.id = prevDay && !days.some((o) => o !== d && o.id === prevDay.id) ? prevDay.id : 'day_' + uid();
    d.ids = d.keys.map((key) => {
      const e = exByKey[key];
      const currentSets = e.sets.sort((a, b) => a.orden - b.orden).map((x, i) => normalizeSet(x.set, i));
      const def = { name: e.name, cat: e.cat, comentario: e.comentario, objetivo: e.objetivo, currentSets };
      const candidatos = Object.keys(prevEx).filter((id) => prevEx[id] && norm(prevEx[id].name) === norm(e.name));
      // Primero el que ya está en este mismo día, luego cualquiera con el mismo nombre
      candidatos.sort((a, b) => (prevDay && prevDay.ids.indexOf(b) !== -1 ? 1 : 0) - (prevDay && prevDay.ids.indexOf(a) !== -1 ? 1 : 0));
      let id = candidatos.find((c) => !usados[c]);
      // Mismo ejercicio repetido en otro día con las mismas series: se comparte (como el gemelo de la rutina de serie)
      const yaUsado = candidatos.find((c) => usados[c] && defsIguales(exercises[c], def));
      if (yaUsado) return yaUsado;
      if (!id) id = 'imp_' + uid();
      usados[id] = true;
      exercises[id] = { ...(prevEx[id] ? { altName: prevEx[id].altName || null, marcaAntigua: prevEx[id].marcaAntigua || null } : {}), ...def };
      return id;
    });
  });
  const obj = {
    app: 'gymtracker', v: 1, appVersion: APP_VERSION, creado: new Date().toISOString(), nombre: '', origen: 'csv',
    rutina: { days: days.map((d) => ({ id: d.id, label: d.label, equipo: d.equipo, nota: '', ids: d.ids })), exercises },
  };
  const nSeries = Object.keys(exercises).reduce((a, id) => a + exercises[id].currentSets.length, 0);
  return { ok: true, obj, avisos, resumen: days.length + ' días, ' + Object.keys(exercises).length + ' ejercicios y ' + nSeries + ' series' };
}
