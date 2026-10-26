import { catIdsDe, catInfo, catsDe } from '../data/catalog.js';
import { escHtml, fmt } from '../utils/format.js';
import { effNutri } from '../utils/health.js';
import { describeSet } from '../utils/training.js';

/* =========================================================================
   EXPORTAR: TEXTO, EXCEL (CSV con ";" y UTF-8 con BOM) Y WORD (.doc)
   ========================================================================= */

export const CSV_HEADER = ['Dia', 'Equipo', 'Ejercicio', 'Musculo', 'Serie', 'Tipo', 'Repeticiones', 'Peso_kg', 'Nota_serie', 'Objetivo', 'Objetivo_kg', 'Comentarios'];

export const TIPO_CSV = { top: 'top set', backoff: 'back-off', rp: 'rest-pause', drop: 'dropset', warm: 'calentamiento' };

export function csvEsc(v) {
  const s = String(v === null || v === undefined ? '' : v);
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function csvNum(n) { return n === null || n === undefined ? '' : String(n).replace('.', ','); }

export function buildCsv(state) {
  const lines = [CSV_HEADER.join(';')];
  (state.days || []).forEach((d) => {
    (d.ids || []).forEach((id) => {
      const ex = state.exercises[id];
      if (!ex) return;
      (ex.currentSets || []).forEach((s, i) => {
        let reps, peso;
        // Varias cifras en una celda van separadas por " · " (con "/" Excel convertía "8/7" en la fecha 8-jul)
        if (s.tipo === 'rp') { reps = (s.tandas || []).map((r) => csvNum(r) || '–').join(' · '); peso = csvNum(s.weight); }
        else if (s.tipo === 'drop') { reps = (s.drops || []).map((x) => csvNum(x.reps) || '–').join(' · '); peso = (s.drops || []).map((x) => csvNum(x.weight) || '–').join(' · '); }
        else { reps = csvNum(s.reps); peso = csvNum(s.weight); }
        lines.push([d.label, d.equipo, ex.name, catInfo(catsDe(state), ex.cat).label, i + 1, TIPO_CSV[s.tipo] || 'top set', reps, peso, s.nota || '',
          ex.objetivo ? ex.objetivo.text : '', ex.objetivo && ex.objetivo.value !== null && ex.objetivo.value !== undefined ? csvNum(ex.objetivo.value) : '',
          ex.comentario || ''].map(csvEsc).join(';'));
      });
    });
  });
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

// Documento .doc: HTML con la cabecera de Word (Word, LibreOffice y Google Docs lo abren)
export function buildDocHtml(state) {
  const nombre = (state.formulario && state.formulario.nombre) || '';
  let h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Mi rutina</title>'
    + '<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111}h1{font-size:20pt}h2{font-size:14pt;margin-top:18pt;border-bottom:1px solid #999}'
    + 'table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 6px;vertical-align:top;font-size:10pt}th{background:#e8eef7;text-align:left}</style></head><body>';
  h += '<h1>Mi rutina' + (nombre ? ' — ' + escHtml(nombre) : '') + '</h1><p>Generada el ' + escHtml(new Date().toLocaleDateString('es-ES')) + '</p>';
  (state.days || []).forEach((d) => {
    h += '<h2>' + escHtml(d.label) + '</h2>';
    if (d.equipo) h += '<p><b>Llevar:</b> ' + escHtml(d.equipo) + '</p>';
    if (d.nota) h += '<p><i>' + escHtml(d.nota) + '</i></p>';
    h += '<table><tr><th>Ejercicio</th><th>Músculo</th><th>Series</th><th>Objetivo</th><th>Comentarios</th></tr>';
    (d.ids || []).forEach((id) => {
      const ex = state.exercises[id];
      if (!ex) return;
      h += '<tr><td>' + escHtml(ex.name) + (ex.altName ? '<br><i>o ' + escHtml(ex.altName) + '</i>' : '') + '</td><td>' + escHtml(catInfo(catsDe(state), ex.cat).label) + '</td><td>'
        + (ex.currentSets || []).map((s, i) => (i + 1) + '. ' + escHtml(describeSet(s)) + (s.nota ? ' (' + escHtml(s.nota) + ')' : '')).join('<br>')
        + '</td><td>' + escHtml(ex.objetivo ? ex.objetivo.text : '') + '</td><td>' + escHtml(ex.comentario || '').replace(/\n/g, '<br>') + '</td></tr>';
    });
    h += '</table>';
  });
  return h + '</body></html>';
}

// Texto plano: todo junto y con orden (rutina por días, cardio, suplementos, diana, peso y calculadora)
export function buildTxt(state) {
  const f = state.formulario || {};
  const L = [];
  const raya = '='.repeat(52);
  L.push('MI RUTINA' + (f.nombre ? ' — ' + f.nombre : ''));
  L.push('Generada el ' + new Date().toLocaleDateString('es-ES'));
  L.push('');
  (state.days || []).forEach((d, i) => {
    L.push(raya); L.push('DÍA ' + (i + 1) + ': ' + d.label.toUpperCase()); L.push(raya);
    if (d.equipo) L.push('Llevar: ' + d.equipo);
    if (d.nota) L.push('Nota del día: ' + d.nota);
    L.push('');
    (d.ids || []).forEach((id, j) => {
      const ex = state.exercises[id];
      if (!ex) return;
      L.push((j + 1) + '. ' + ex.name + '  [' + catInfo(catsDe(state), ex.cat).label + ']');
      if (ex.altName) L.push('   Alternativa: ' + ex.altName);
      (ex.currentSets || []).forEach((s, k) => L.push('   Serie ' + (k + 1) + ': ' + describeSet(s) + (s.nota ? ' (' + s.nota + ')' : '')));
      if (ex.objetivo) L.push('   Objetivo: ' + ex.objetivo.text);
      if (ex.marcaAntigua) L.push('   Marca antigua a recuperar: ' + ex.marcaAntigua.text);
      if (ex.comentario) L.push('   Comentarios: ' + String(ex.comentario).replace(/\n/g, '\n      '));
      L.push('');
    });
  });
  if ((state.cardio || []).length) {
    L.push(raya); L.push('CARDIO'); L.push(raya);
    state.cardio.forEach((c) => L.push('- ' + c.name + (c.frecuencia ? ' · ' + c.frecuencia : '') + (c.detalle ? ' · ' + c.detalle : '')));
    L.push('');
  }
  if ((state.extras.suplementos || []).length) {
    L.push(raya); L.push('SUPLEMENTACIÓN'); L.push(raya);
    state.extras.suplementos.forEach((s) => {
      L.push('- ' + s.nombre + (s.nota ? ' (' + s.nota + ')' : ''));
      s.filas.forEach((r) => L.push('    ' + r.label + ': ' + r.value));
    });
    L.push('');
  }
  L.push(raya); L.push('DIANA FÍSICA'); L.push(raya);
  [['fuerte', 'Puntos fuertes'], ['intermedio', 'Intermedios'], ['debil', 'Puntos débiles']].forEach((g) => {
    const lista = catIdsDe(state).filter((k) => state.diana.estados[k] === g[0]);
    L.push(g[1] + ': ' + (lista.length ? lista.map((k) => catsDe(state)[k].label + (state.diana.titulos[k] ? ' (' + state.diana.titulos[k] + ')' : '')).join(', ') : '—'));
  });
  L.push('');
  const hist = (state.peso.historial || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  L.push(raya); L.push('PESO CORPORAL'); L.push(raya);
  if (state.peso.objetivoKg) L.push('Objetivo: ' + state.peso.objetivoKg + ' kg');
  hist.slice(-12).forEach((r) => L.push(new Date(r.date).toLocaleDateString('es-ES') + ': ' + fmt(r.kg, 2) + ' kg'));
  L.push('');
  const ef = effNutri(state);
  if (!ef.plan.falta) {
    L.push(raya); L.push('NUTRICIÓN (' + ef.obj.label + ')'); L.push(raya);
    L.push('Calorías al día: ' + ef.plan.kcal + ' kcal');
    L.push('Proteína: ' + ef.plan.protG + ' g · Hidratos: ' + ef.plan.carbG + ' g · Grasas: ' + ef.plan.fatG + ' g');
    L.push('');
  }
  return L.join('\n');
}
