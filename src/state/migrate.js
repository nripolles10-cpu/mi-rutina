import { APP_VERSION, CATS, MUSCULOS_POR_DEFECTO, TAB_IDS, catReserva, mapaMusculos, normalizarMusculos } from '../data/catalog.js';
import { RECETAS_NUEVAS_V8 } from '../data/recetas.js';
import { CARDIO, DAYS_SEED, SEED_EXERCISES } from '../data/seed.js';
import { defaultComida, normalizeAgua, normalizeRecetas } from '../utils/comida.js';
import { clone, stripAcc, uid } from '../utils/format.js';
import { normalizeSet } from '../utils/training.js';

/* =========================================================================
   SECCIÓN 4 · ESTADO Y MIGRACIÓN
   Estado inicial, normalización y migrateState (convierte datos de versiones anteriores).
   ========================================================================= */

/* =========================================================================
   EJERCICIOS, DÍAS Y ESTADO
   ========================================================================= */

// cats (opcional): catálogo de músculos con el que validar ex.cat (por defecto, el que está en pantalla)
export function normalizeExercise(ex, cats) {
  const catalogo = cats || CATS;
  const rawSets = Array.isArray(ex.currentSets) ? ex.currentSets : Array.isArray(ex.sets) ? ex.sets : [];
  const sets = rawSets.map((s, i) => normalizeSet(s, i));
  const out = {
    ...ex,
    name: typeof ex.name === 'string' && ex.name ? ex.name : 'Ejercicio',
    cat: catalogo[ex.cat] ? ex.cat : catReserva(catalogo),
    altName: ex.altName || null,
    objetivo: ex.objetivo || null,
    marcaAntigua: ex.marcaAntigua || null,
    comentario: typeof ex.comentario === 'string' ? ex.comentario : (ex.tags || []).join(' · '),
    currentSets: sets.length ? sets : [normalizeSet({}, 0)],
    history: Array.isArray(ex.history) ? ex.history : [],
  };
  delete out.sets; delete out.tags; delete out.photo; delete out.rotacionCon;
  return out;
}

export function normalizeDay(d) {
  const ids = Array.isArray(d.ids) ? d.ids.filter((x, i, a) => typeof x === 'string' && a.indexOf(x) === i) : [];
  return { ...d, id: d.id || 'day_' + uid(), label: d.label || 'Día', equipo: d.equipo || '', nota: d.nota || '', ids: ids };
}

export const TEMAS = ['cian', 'violeta', 'verde', 'fuego'];
export const TAMANOS_LETRA = ['pequena', 'normal', 'grande', 'muygrande'];
export const MEDIDAS_TIPOS = ['cintura', 'cadera', 'pecho', 'brazo', 'muslo', 'gemelo', 'cuello', 'grasa'];

export function preferenciasPorDefecto() {
  return {
    pantallaEncendida: false,
    tema: 'cian', letra: 'normal',
    descanso: 90, // segundos de descanso que propone el modo entreno en vivo
    objetivoDiasSemana: 3, // para la racha semanal
    descarga: { activa: false, cadaSemanas: 6, inicio: null },
    recordatorios: { activos: false, dias: [0, 2, 4], hora: '18:00', ids: [] },
  };
}

// Repara las preferencias guardadas (las de versiones anteriores no tienen los campos nuevos)
export function normalizarPreferencias(p) {
  const d = preferenciasPorDefecto();
  const x = p && typeof p === 'object' ? p : {};
  const out = { ...d, ...x };
  out.pantallaEncendida = !!out.pantallaEncendida;
  if (TEMAS.indexOf(out.tema) === -1) out.tema = 'cian';
  if (TAMANOS_LETRA.indexOf(out.letra) === -1) out.letra = 'normal';
  out.descanso = typeof out.descanso === 'number' && out.descanso >= 10 && out.descanso <= 600 ? Math.round(out.descanso) : 90;
  out.objetivoDiasSemana = typeof out.objetivoDiasSemana === 'number' && out.objetivoDiasSemana >= 1 && out.objetivoDiasSemana <= 7 ? Math.round(out.objetivoDiasSemana) : 3;
  const ds = x.descarga && typeof x.descarga === 'object' ? x.descarga : {};
  out.descarga = {
    activa: !!ds.activa,
    cadaSemanas: typeof ds.cadaSemanas === 'number' && ds.cadaSemanas >= 3 && ds.cadaSemanas <= 12 ? Math.round(ds.cadaSemanas) : 6,
    inicio: typeof ds.inicio === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ds.inicio) ? ds.inicio : null,
  };
  const r = x.recordatorios && typeof x.recordatorios === 'object' ? x.recordatorios : {};
  out.recordatorios = {
    activos: !!r.activos,
    dias: Array.isArray(r.dias) ? r.dias.filter((n, i, a) => Number.isInteger(n) && n >= 0 && n <= 6 && a.indexOf(n) === i).sort() : d.recordatorios.dias,
    hora: typeof r.hora === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.hora) ? r.hora : '18:00',
    ids: Array.isArray(r.ids) ? r.ids.filter((n) => Number.isInteger(n)) : [],
  };
  return out;
}

function normalizarRegistro(reg) {
  const out = {};
  if (!reg || typeof reg !== 'object') return out;
  const n15 = (v) => (typeof v === 'number' && v >= 1 && v <= 5 ? Math.round(v) : null);
  Object.keys(reg).forEach((k) => {
    const r = reg[k];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !r || typeof r !== 'object') return;
    const pasos = typeof r.pasos === 'number' && r.pasos >= 0 && r.pasos < 200000 ? Math.round(r.pasos) : null;
    const sueno = n15(r.sueno), energia = n15(r.energia);
    if (pasos !== null || sueno !== null || energia !== null) out[k] = { pasos, sueno, energia };
  });
  return out;
}

export function buildInitialState() {
  const exercises = {};
  Object.keys(SEED_EXERCISES).forEach((id) => {
    const ex = SEED_EXERCISES[id];
    const seedSets = ex.sets.map((s, i) => normalizeSet(s, i));
    exercises[id] = normalizeExercise({
      name: ex.name, cat: ex.cat, comentario: ex.comentario || '', objetivo: ex.objetivo ? clone(ex.objetivo) : null,
      currentSets: seedSets, history: [{ date: new Date().toISOString(), sets: clone(seedSets), seed: true }],
    });
  });
  return {
    version: APP_VERSION,
    exercises,
    days: clone(DAYS_SEED).map(normalizeDay),
    diana: { estados: {}, titulos: {} },
    musculos: MUSCULOS_POR_DEFECTO.map((m) => ({ ...m })),
    cardio: CARDIO.map((c) => ({ ...c })),
    formulario: { nombre: '', edad: null, sexo: 'M', alturaCm: null, pesoInicialKg: 84, actividad: 'intenso', grasaPct: null, objetivoPesoKg: 80, objetivoPasosDiarios: 10000 },
    peso: { historial: [{ id: uid(), date: new Date().toISOString(), kg: 84 }], objetivoKg: 80, direccion: 'bajar', objetivoAlcanzado: false },
    extras: {
      movilidad: { titulo: 'Rutina de movilidad matutina', url: 'https://www.youtube.com/watch?v=Pnbwyxh4LJs&t=160s' },
      suplementos: [
        { id: 'creatina', nombre: 'Creatina', nota: 'Tomar durante un tiempo (3 meses) y luego descansar 2 semanas – 1 mes.', filas: [
          { id: 'a', label: 'Lo recomendable', value: '3 g (1 scoop)', destacado: false },
          { id: 'b', label: 'Lo normal', value: 'Entre 3–6 g', destacado: true },
          { id: 'c', label: 'Fase de carga (1ª semana)', value: '2 scoops / día', destacado: false },
          { id: 'd', label: 'Más avanzado (0,07 × tu peso, 80–85kg)', value: '6 g (2 scoops)', destacado: false },
        ] },
        { id: 'proteina', nombre: 'Proteína', nota: '', filas: [{ id: 'a', label: 'Dosis', value: '30 g (1 scoop)', destacado: false }] },
        { id: 'multi', nombre: 'Multivitamínico', nota: '', filas: [{ id: 'a', label: 'Dosis', value: '1 pastilla al día', destacado: false }] },
        { id: 'omega3', nombre: 'Omega 3', nota: '', filas: [{ id: 'a', label: 'Dosis', value: '1 pastilla al día', destacado: false }] },
        { id: 'magnesio', nombre: 'Magnesio', nota: '', filas: [{ id: 'a', label: 'Dosis', value: '1 pastilla al día', destacado: false }] },
      ],
    },
    nutricion: { objetivo: 'definicion', ritmo: 'normal', pesoActual: null, pesoObjetivo: null, edad: null, alturaCm: null, sexo: null, actividad: null, grasaPct: null, tdeeReal: null },
    comida: defaultComida(),
    preferencias: preferenciasPorDefecto(),
    // Fase 3: registro diario (pasos, sueño y energía), medidas corporales y fotos de progreso
    registro: {},
    medidas: { historial: [] },
    fotosProgreso: [],
    meta: { activeTab: 'rutina', activeDay: 'piernaA', editMode: false, progresoSec: 'progreso' },
  };
}

// Normaliza un estado ya migrado a la versión actual: se combina con la semilla para que un campo nuevo
// nunca borre lo que tenías. NO cambia la rutina del usuario: solo rellena lo que falta y repara lo roto.
export function normalizeCurrent(loaded, seed, appVersion) {
  const objetivo = appVersion || APP_VERSION;
  const lv = Number(loaded.version);
  const next = { ...seed, ...loaded, version: isFinite(lv) && lv > objetivo ? lv : objetivo };
  // Catálogo de músculos del usuario (los datos antiguos, sin catálogo propio, cargan el de serie)
  next.musculos = normalizarMusculos(loaded.musculos);
  const cats = mapaMusculos(next.musculos);
  const rawEx = loaded.exercises && typeof loaded.exercises === 'object' ? loaded.exercises : seed.exercises;
  const exercises = {};
  Object.keys(rawEx).forEach((id) => { if (rawEx[id] && typeof rawEx[id] === 'object') exercises[id] = normalizeExercise(rawEx[id], cats); });
  const rawDays = Array.isArray(loaded.days) ? loaded.days : seed.days;
  const days = rawDays.filter((d) => d && typeof d === 'object').map(normalizeDay);
  // Un día que apunta a un ejercicio que no existe: se recupera de la semilla si está ahí; si no, se quita la referencia rota.
  days.forEach((d) => {
    d.ids.forEach((id) => { if (!exercises[id] && seed.exercises[id]) exercises[id] = normalizeExercise(seed.exercises[id], cats); });
    d.ids = d.ids.filter((id) => !!exercises[id]);
  });
  next.exercises = exercises;
  next.days = days;
  next.diana = { estados: {}, titulos: {}, ...(loaded.diana || {}) };
  next.formulario = { ...seed.formulario, ...(loaded.formulario || {}) };
  const peso = { ...seed.peso, ...(loaded.peso || {}) };
  peso.historial = (Array.isArray(peso.historial) ? peso.historial : [])
    .filter((r) => r && typeof r === 'object' && typeof r.kg === 'number' && isFinite(r.kg) && !isNaN(new Date(r.date).getTime()))
    .map((r) => ({ ...r, id: r.id || uid() }));
  next.peso = peso;
  next.cardio = Array.isArray(loaded.cardio) ? loaded.cardio.filter((c) => c && typeof c === 'object').map((c) => ({ ...c, id: c.id || 'cardio_' + uid() })) : seed.cardio;
  const ex = loaded.extras || {};
  next.extras = {
    movilidad: { ...seed.extras.movilidad, ...(ex.movilidad || {}) },
    suplementos: Array.isArray(ex.suplementos) ? ex.suplementos.filter((s) => s && typeof s === 'object').map((s) => ({ ...s, id: s.id || 'sup_' + uid(), filas: Array.isArray(s.filas) ? s.filas : [] })) : seed.extras.suplementos,
  };
  next.nutricion = { ...seed.nutricion, ...(loaded.nutricion || {}) };
  // Un solo dato para el sexo y para el objetivo de peso (antes la calculadora podía tener los suyos y no
  // coincidir con Ajustes). Manda el de Ajustes; desde ahora la calculadora cambia ese mismo dato.
  if (next.formulario.sexo !== 'F') next.formulario = { ...next.formulario, sexo: 'M' };
  next.nutricion = { ...next.nutricion, sexo: null, pesoObjetivo: null };
  if (next.peso.objetivoKg === undefined || (next.peso.objetivoKg !== null && !(typeof next.peso.objetivoKg === 'number' && next.peso.objetivoKg > 0))) next.peso = { ...next.peso, objetivoKg: null, direccion: null };
  if (next.formulario.objetivoPesoKg !== next.peso.objetivoKg) next.formulario = { ...next.formulario, objetivoPesoKg: next.peso.objetivoKg };
  const c = loaded.comida || {};
  next.comida = {
    recetas: normalizeRecetas(c.recetas, seed.comida.recetas),
    favoritos: Array.isArray(c.favoritos) ? c.favoritos : [],
    diario: c.diario && typeof c.diario === 'object' ? c.diario : {},
    plan: c.plan && typeof c.plan === 'object' ? c.plan : {},
    compra: c.compra && typeof c.compra === 'object' ? c.compra : {},
    agua: normalizeAgua(c.agua),
  };
  next.preferencias = normalizarPreferencias(loaded.preferencias);
  next.registro = normalizarRegistro(loaded.registro);
  const med = loaded.medidas && typeof loaded.medidas === 'object' ? loaded.medidas : {};
  next.medidas = {
    historial: (Array.isArray(med.historial) ? med.historial : [])
      .filter((r) => r && typeof r === 'object' && MEDIDAS_TIPOS.indexOf(r.tipo) !== -1 && typeof r.valor === 'number' && isFinite(r.valor) && !isNaN(new Date(r.date).getTime()))
      .map((r) => ({ id: r.id || uid(), tipo: r.tipo, valor: r.valor, date: r.date })),
  };
  next.fotosProgreso = (Array.isArray(loaded.fotosProgreso) ? loaded.fotosProgreso : [])
    .filter((f) => f && typeof f === 'object' && typeof f.id === 'string' && !isNaN(new Date(f.date).getTime()))
    .map((f) => ({ id: f.id, date: f.date, nota: typeof f.nota === 'string' ? f.nota : '' }));
  next.meta = { ...seed.meta, ...(loaded.meta || {}) };
  if (TAB_IDS.indexOf(next.meta.activeTab) === -1) next.meta.activeTab = 'rutina';
  if (['progreso', 'calendario', 'cuerpo', 'logros'].indexOf(next.meta.progresoSec) === -1) next.meta.progresoSec = 'progreso';
  if (!days.some((d) => d.id === next.meta.activeDay)) next.meta.activeDay = days.length ? days[0].id : null;
  delete next.profile; delete next.pasos;
  return next;
}

// Datos de la APP ANTIGUA (sin campo version o con version 5 o menor): se pone la rutina nueva,
// pero se conservan peso, ajustes, cardio, suplementos, nutrición, comida y el HISTORIAL de los ejercicios
// que se llaman igual. Los ejercicios antiguos que no existen en la rutina nueva se guardan ocultos
// (con su historial) para no perder nada. Las fotos antiguas se pasan a su almacén aparte.
let PENDING_PHOTOS = null;
// Fotos que venían dentro de los datos de la app antigua: la app las recoge una vez al arrancar para guardarlas aparte
export function takePendingPhotos() { const p = PENDING_PHOTOS; PENDING_PHOTOS = null; return p; }

// Grupos antiguos → músculos separados: los aductores salían dentro de cuádriceps; hip thrust y abducción dentro de isquios.
export function fixLegacyCat(e) {
  const name = stripAcc(e.name || '').toLowerCase();
  if (e.cat === 'cuadriceps' && /aductor/.test(name)) return 'aductores';
  if (e.cat === 'isquios' && /hip\s*thrust|abduccion/.test(name)) return 'gluteo';
  return e.cat;
}

export function upgradeLegacy(loaded, seed) {
  const key = (s) => stripAcc(String(s || '').trim().toLowerCase());
  const oldExercises = loaded.exercises && typeof loaded.exercises === 'object' ? loaded.exercises : {};
  const oldByName = {};
  Object.keys(oldExercises).forEach((id) => { const e = oldExercises[id]; if (e && e.name) oldByName[key(e.name)] = { ...e, cat: fixLegacyCat(e), _oldId: id }; });
  const photos = {};
  const exercises = {};
  const usados = {};
  Object.keys(seed.exercises).forEach((id) => {
    const ex = clone(seed.exercises[id]);
    const old = oldByName[key(ex.name)];
    if (old) {
      usados[old._oldId] = true;
      const hist = (Array.isArray(old.history) ? old.history : []).map((h, i) => (i === 0 ? { ...h, seed: true } : h));
      if (hist.length) ex.history = hist;
      if (old.photo) photos[id] = old.photo;
    }
    exercises[id] = ex;
  });
  // Ejercicios antiguos sin equivalente: se guardan ocultos (no salen en ningún día) para no perder su historial
  Object.keys(oldExercises).forEach((id) => {
    const e = oldExercises[id];
    if (!e || typeof e !== 'object' || usados[id]) return;
    const nid = 'antiguo_' + id;
    exercises[nid] = { ...e, cat: fixLegacyCat(e) };
    if (e.photo) photos[nid] = e.photo;
  });
  const diana = { estados: {}, titulos: {} };
  const prof = loaded.profile || {};
  const catsSerie = mapaMusculos(MUSCULOS_POR_DEFECTO); // los datos antiguos usan los músculos de serie
  (prof.fuertes || []).forEach((x) => { if (catsSerie[x.region]) { diana.estados[x.region] = 'fuerte'; if (x.titulo) diana.titulos[x.region] = x.titulo; } });
  (prof.prioridad || []).forEach((x) => { if (catsSerie[x.region]) { diana.estados[x.region] = 'debil'; if (x.titulo) diana.titulos[x.region] = x.titulo; } });
  (prof.equilibrio || []).forEach((x) => { if (catsSerie[x.region] && x.titulo) diana.titulos[x.region] = x.titulo; });
  PENDING_PHOTOS = Object.keys(photos).length ? photos : null;
  const lm = loaded.meta || {};
  const next = {
    ...seed,
    exercises,
    days: seed.days,
    diana,
    cardio: Array.isArray(loaded.cardio) ? loaded.cardio : seed.cardio,
    formulario: { ...seed.formulario, ...(loaded.formulario || {}) },
    peso: { ...seed.peso, ...(loaded.peso || {}) },
    extras: loaded.extras ? { movilidad: { ...seed.extras.movilidad, ...((loaded.extras || {}).movilidad || {}) }, suplementos: Array.isArray((loaded.extras || {}).suplementos) ? loaded.extras.suplementos : seed.extras.suplementos } : seed.extras,
    nutricion: { ...seed.nutricion, ...(loaded.nutricion || {}) },
    comida: loaded.comida && typeof loaded.comida === 'object' ? loaded.comida : seed.comida,
    meta: { ...seed.meta, activeTab: TAB_IDS.indexOf(lm.activeTab) !== -1 ? lm.activeTab : 'rutina', editMode: false },
    version: APP_VERSION,
  };
  delete next.formulario.esNacho; delete next.formulario.completado; delete next.formulario.experiencia;
  return normalizeCurrent(next, seed);
}

// MIGRACIONES INCREMENTALES (de la versión 6 en adelante). Nunca sustituyen la rutina del usuario.
// MIGRATIONS[n] convierte datos de la versión n-1 a la versión n. Para una versión nueva de la app:
// sube APP_VERSION y añade aquí MIGRATIONS[nueva] (aunque sea vacía).
export const LEGACY_MAX_VERSION = 5;
 // version ausente o <= 5 = app antigua (se usa upgradeLegacy)
export const MIGRATIONS = {
  // v6 → v7: lumbar y abductores. El peso muerto belt pasa a Lumbar y la abducción de cadera a Abductores
  // (solo si siguen con el músculo que traían por defecto: si ya los cambiaste tú, no se tocan).
  7: (st) => {
    const exercises = { ...(st.exercises || {}) };
    if (exercises.pesoMuertoBelt && exercises.pesoMuertoBelt.cat === 'isquios') exercises.pesoMuertoBelt = { ...exercises.pesoMuertoBelt, cat: 'lumbar' };
    if (exercises.abduccion && exercises.abduccion.cat === 'gluteo') exercises.abduccion = { ...exercises.abduccion, cat: 'abductores' };
    return { ...st, exercises };
  },
  // v7 → v8: catálogo de músculos editable (lo rellena normalizeCurrent con los 15 de serie), sexo y objetivo de
  // peso unificados (normalizeCurrent) y recetas nuevas: se añaden las que no tengas ya (por id), sin tocar las tuyas.
  8: (st) => {
    const c = st.comida && typeof st.comida === 'object' ? st.comida : null;
    if (!c || !Array.isArray(c.recetas)) return st; // sin lista guardada: se usará la de serie, que ya las trae
    return { ...st, comida: { ...c, recetas: anadirRecetasNuevas(c.recetas) } };
  },
};

// (la v9 —registro diario, medidas, fotos de progreso y preferencias nuevas— la completa normalizeCurrent)
MIGRATIONS[9] = (st) => st;

// Añade las recetas nuevas de la versión 8 que falten (por id). No cambia ni duplica ninguna.
export function anadirRecetasNuevas(lista) {
  const arr = Array.isArray(lista) ? lista : [];
  const ids = {};
  arr.forEach((r) => { if (r && r.id) ids[r.id] = true; });
  const faltan = RECETAS_NUEVAS_V8().filter((r) => !ids[r.id]);
  return faltan.length ? arr.concat(faltan) : arr;
}

// appVersion: versión de destino (por defecto la de la app; las pruebas la cambian para simular una actualización)
export function migrateState(loaded, appVersion) {
  const objetivo = appVersion || APP_VERSION;
  const seed = buildInitialState();
  if (!loaded || typeof loaded !== 'object') return seed;
  const v = Number(loaded.version);
  if (!isFinite(v) || v <= LEGACY_MAX_VERSION) return upgradeLegacy(loaded, seed);
  let st = loaded;
  for (let target = Math.floor(v) + 1; target <= objetivo; target++) {
    if (MIGRATIONS[target]) st = MIGRATIONS[target](st);
  }
  return normalizeCurrent(st, seed, objetivo);
}
