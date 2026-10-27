/* =========================================================================
   FASE 3 · ENTRENOS: sesiones, calendario, rachas, récords, 1RM, sugerencias de progresión,
   resumen semanal, logros, semana de descarga y duplicar días / ejercicios.
   Todo son funciones puras: reciben el estado (y "hoy") y devuelven datos. Nada cambia solo.
   ========================================================================= */
import { addDays, fmt, fromYmd, mean, mondayOf, num, uid, ymd } from './format.js';
import { calc1RM, computeScore, effectiveCount, setsVolume } from './training.js';

/* ---------- Sesiones (a partir de los registros guardados de cada ejercicio) ---------- */

// Una sesión = un día con al menos un registro guardado. Si un ejercicio se guardó dos veces el mismo día,
// cuenta el último (así no se duplica el volumen). Los registros "de partida" (seed) no cuentan.
export function sesionesDe(state) {
  const porDia = {};
  const exs = state.exercises || {};
  Object.keys(exs).forEach((id) => {
    (exs[id].history || []).forEach((h) => {
      if (!h || h.seed || !h.date) return;
      const t = new Date(h.date);
      if (isNaN(t.getTime())) return;
      const k = ymd(t);
      const dia = porDia[k] || (porDia[k] = {});
      if (!dia[id] || new Date(dia[id].date) <= t) dia[id] = h;
    });
  });
  return Object.keys(porDia).sort().map((fecha) => {
    const ejercicios = Object.keys(porDia[fecha]).map((id) => {
      const h = porDia[fecha][id];
      const ex = exs[id];
      return { id, nombre: ex.name, cat: ex.cat, sets: h.sets || [], volumen: setsVolume(h.sets), series: (h.sets || []).reduce((a, s) => a + effectiveCount(s), 0) };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return { fecha, ejercicios, volumen: ejercicios.reduce((a, e) => a + e.volumen, 0), series: ejercicios.reduce((a, e) => a + e.series, 0) };
  });
}

export function semanaDe(fecha) { return ymd(mondayOf(fromYmd(typeof fecha === 'string' ? fecha : ymd(fecha)))); }

// { 'AAAA-MM-DD' (lunes): { sesiones, volumen, series } }
export function porSemana(sesiones) {
  const out = {};
  sesiones.forEach((s) => {
    const k = semanaDe(s.fecha);
    const w = out[k] || (out[k] = { sesiones: 0, volumen: 0, series: 0 });
    w.sesiones += 1; w.volumen += s.volumen; w.series += s.series;
  });
  return out;
}

// Racha de semanas seguidas cumpliendo el objetivo de días por semana.
// La semana en curso cuenta si ya lo has cumplido; si no, todavía no rompe la racha.
export function rachaSemanas(sesiones, objetivoDias, hoy) {
  const obj = Math.max(1, Math.round(objetivoDias || 1));
  const semanas = porSemana(sesiones);
  const cumple = (k) => !!semanas[k] && semanas[k].sesiones >= obj;
  const estaSemana = semanaDe(hoy || new Date());
  let actual = 0;
  let k = estaSemana;
  if (cumple(k)) actual = 1;
  k = ymd(addDays(fromYmd(k), -7));
  while (cumple(k)) { actual += 1; k = ymd(addDays(fromYmd(k), -7)); }
  // mejor racha de toda la historia
  let mejor = 0, run = 0, prev = null;
  Object.keys(semanas).sort().forEach((w) => {
    if (!cumple(w)) { run = 0; prev = w; return; }
    run = prev && ymd(addDays(fromYmd(prev), 7)) === w && run > 0 ? run + 1 : 1;
    if (run > mejor) mejor = run;
    prev = w;
  });
  return { actual, mejor: Math.max(mejor, actual), objetivo: obj, estaSemana: semanas[estaSemana] ? semanas[estaSemana].sesiones : 0 };
}

// Días seguidos (hasta hoy o ayer) con al menos una sesión
export function rachaDias(sesiones, hoy) {
  const dias = {};
  sesiones.forEach((s) => { dias[s.fecha] = true; });
  let d = fromYmd(ymd(hoy || new Date()));
  if (!dias[ymd(d)]) d = addDays(d, -1);
  let n = 0;
  while (dias[ymd(d)]) { n += 1; d = addDays(d, -1); }
  return n;
}

// Celdas del calendario de un mes (empieza en lunes). mes = 'AAAA-MM'.
export function calendarioMes(mes, sesiones) {
  const p = mes.split('-').map(Number);
  const primero = new Date(p[0], p[1] - 1, 1);
  const inicio = mondayOf(primero);
  const porFecha = {};
  sesiones.forEach((s) => { porFecha[s.fecha] = s; });
  const max = Math.max(1, ...sesiones.filter((s) => s.fecha.slice(0, 7) === mes).map((s) => s.volumen));
  const celdas = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(inicio, i);
    const k = ymd(d);
    const s = porFecha[k] || null;
    celdas.push({ fecha: k, dia: d.getDate(), delMes: d.getMonth() === primero.getMonth(), sesion: s, intensidad: s ? Math.max(0.25, s.volumen / max) : 0 });
  }
  // se quitan las semanas del final que ya son del mes siguiente
  while (celdas.length > 28 && celdas.slice(-7).every((c) => !c.delMes)) celdas.splice(-7, 7);
  return celdas;
}

/* ---------- Historial de un ejercicio: récords y 1RM estimado ---------- */

// Peso y repeticiones "de referencia" de una serie (rest-pause: la primera tanda; dropset: el primer descenso)
export function pesoReps(s) {
  if (!s) return { peso: null, reps: null };
  if (s.tipo === 'rp') return { peso: typeof s.weight === 'number' ? s.weight : null, reps: s.tandas && typeof s.tandas[0] === 'number' ? s.tandas[0] : null };
  if (s.tipo === 'drop' && s.drops && s.drops[0]) return { peso: typeof s.drops[0].weight === 'number' ? s.drops[0].weight : null, reps: typeof s.drops[0].reps === 'number' ? s.drops[0].reps : null };
  return { peso: typeof s.weight === 'number' ? s.weight : null, reps: typeof s.reps === 'number' ? s.reps : null };
}

// Mejor 1RM estimado de una lista de series (sin contar calentamientos)
export function mejor1RMSeries(sets) {
  let best = null;
  (sets || []).forEach((s) => {
    if (!s || s.tipo === 'warm') return;
    const pr = pesoReps(s);
    const r = calc1RM(pr.peso, pr.reps);
    if (r && (best === null || r.media > best)) best = r.media;
  });
  return best;
}

// Historial con marcas: cada registro con su volumen, 1RM estimado y si fue récord de la serie 1
export function historialEjercicio(ex) {
  let mejorScore = 0;
  let mejor1RM = null, mejorPeso = null, mejorVolumen = 0;
  // En orden de fecha; la marca de partida (seed) siempre va primero, sea cual sea su fecha
  const ordenados = (ex.history || []).filter((h) => h && h.date).slice()
    .sort((a, b) => ((a.seed ? 0 : 1) - (b.seed ? 0 : 1)) || (new Date(a.date) - new Date(b.date)));
  const registros = ordenados.map((h) => {
    const s1 = h.sets && h.sets[0];
    const score = computeScore(s1);
    const record = !h.seed && score > 0 && score > mejorScore;
    if (score > mejorScore) mejorScore = score;
    const rm = mejor1RMSeries(h.sets);
    const vol = setsVolume(h.sets);
    const w = s1 && typeof s1.weight === 'number' ? s1.weight : null;
    if (rm !== null && (mejor1RM === null || rm > mejor1RM)) mejor1RM = rm;
    if (w !== null && (mejorPeso === null || w > mejorPeso)) mejorPeso = w;
    if (vol > mejorVolumen) mejorVolumen = vol;
    return { date: h.date, seed: !!h.seed, sets: h.sets || [], volumen: vol, rm, record };
  });
  return { registros, mejor1RM, mejorPeso, mejorVolumen, records: registros.filter((r) => r.record).length };
}

/* ---------- Sugerencia de progresión (solo es una sugerencia) ---------- */

export const RANGO_REPS = { min: 6, max: 10 };

export function redondeaPeso(kg) {
  if (kg < 20) return Math.round(kg * 2) / 2; // de 0,5 en 0,5
  return Math.round(kg / 1.25) * 1.25; // discos de 1,25
}

// Devuelve { tipo: 'subir'|'mantener'|'bajar'|'sin-datos', texto, peso (sugerido o null), aviso (texto o null) }
export function sugerenciaProgresion(ex) {
  const regs = (ex.history || []).filter((h) => h && !h.seed && h.sets && h.sets[0]);
  if (!regs.length) return { tipo: 'sin-datos', texto: 'Guarda tu registro de hoy y te sugeriré cómo progresar la próxima vez.', peso: null, aviso: null };
  const ult = pesoReps(regs[regs.length - 1].sets[0]);
  if (ult.peso === null || ult.reps === null) return { tipo: 'sin-datos', texto: 'Apunta peso y repeticiones en la serie 1 para recibir sugerencias.', peso: null, aviso: null };
  const scores = regs.slice(-3).map((h) => computeScore(h.sets[0]));
  const bajando = scores.length === 3 && scores[2] < scores[1] && scores[1] < scores[0];
  const aviso = bajando ? 'Llevas dos sesiones seguidas bajando: revisa el descanso, el sueño o plantéate una semana de descarga.' : null;
  if (ult.reps >= RANGO_REPS.max) {
    const sube = Math.max(ult.peso < 20 ? 1 : 1.25, ult.peso * 0.025);
    const nuevo = redondeaPeso(ult.peso + sube);
    return { tipo: 'subir', peso: nuevo, aviso, texto: 'Hiciste ' + ult.reps + ' reps con ' + fmt(ult.peso, 2) + ' kg: sube a ' + fmt(nuevo, 2) + ' kg y busca ' + RANGO_REPS.min + '–' + (RANGO_REPS.min + 2) + ' reps.' };
  }
  if (ult.reps >= RANGO_REPS.min) {
    return { tipo: 'mantener', peso: null, aviso, texto: 'Mantén ' + fmt(ult.peso, 2) + ' kg y busca ' + (ult.reps + 1) + ' reps. Cuando llegues a ' + RANGO_REPS.max + ', sube el peso.' };
  }
  const anterior = regs.length > 1 ? pesoReps(regs[regs.length - 2].sets[0]) : null;
  if (anterior && anterior.reps !== null && anterior.reps < RANGO_REPS.min) {
    const nuevo = redondeaPeso(ult.peso * 0.9);
    return { tipo: 'bajar', peso: nuevo, aviso, texto: 'Dos sesiones por debajo de ' + RANGO_REPS.min + ' reps: baja a ' + fmt(nuevo, 2) + ' kg (−10 %) y vuelve a ' + RANGO_REPS.min + '–' + (RANGO_REPS.min + 2) + ' reps.' };
  }
  return { tipo: 'mantener', peso: null, aviso, texto: 'Mantén ' + fmt(ult.peso, 2) + ' kg. Si la próxima vez no pasas de ' + ult.reps + ' reps, baja un 5–10 %.' };
}

/* ---------- Resumen semanal ---------- */

function mediaDe(vals) { const v = vals.filter((x) => typeof x === 'number' && isFinite(x)); return v.length ? mean(v) : null; }

export function resumenSemana(state, lunes) {
  const desde = fromYmd(lunes);
  const hasta = addDays(desde, 7);
  const dentro = (iso) => { const t = new Date(iso); return t >= desde && t < hasta; };
  const sesiones = sesionesDe(state).filter((s) => { const t = fromYmd(s.fecha); return t >= desde && t < hasta; });
  let records = 0;
  Object.keys(state.exercises || {}).forEach((id) => {
    historialEjercicio(state.exercises[id]).registros.forEach((r) => { if (r.record && dentro(r.date)) records += 1; });
  });
  const pesos = ((state.peso && state.peso.historial) || []).filter((r) => dentro(r.date)).map((r) => r.kg);
  const reg = state.registro || {};
  const dias = [];
  for (let i = 0; i < 7; i++) dias.push(reg[ymd(addDays(desde, i))] || {});
  return {
    lunes, sesiones: sesiones.length, volumen: sesiones.reduce((a, s) => a + s.volumen, 0), series: sesiones.reduce((a, s) => a + s.series, 0), records,
    pesoMedio: mediaDe(pesos), pasosMedios: mediaDe(dias.map((d) => d.pasos)), suenoMedio: mediaDe(dias.map((d) => d.sueno)), energiaMedia: mediaDe(dias.map((d) => d.energia)),
  };
}

/* ---------- Semana de descarga ---------- */

// prefs.descarga = { activa, cadaSemanas (3–12), inicio ('AAAA-MM-DD', lunes de la primera semana del ciclo) }
// Cada "cadaSemanas" semanas, la última es de descarga.
export function semanaDescarga(descarga, hoy) {
  const d = descarga || {};
  if (!d.activa || !d.inicio) return { activa: false, es: false };
  const n = Math.min(12, Math.max(3, Math.round(d.cadaSemanas || 6)));
  const inicio = mondayOf(fromYmd(d.inicio));
  const lunesHoy = mondayOf(hoy || new Date());
  const semanas = Math.floor(Math.round((lunesHoy - inicio) / 86400000) / 7);
  if (semanas < 0) return { activa: true, es: false, semanaDelCiclo: null, cadaSemanas: n, proxima: ymd(addDays(inicio, (n - 1) * 7)) };
  const pos = semanas % n; // 0..n-1
  const es = pos === n - 1;
  const proxima = ymd(addDays(lunesHoy, ((n - 1 - pos + n) % n) * 7));
  return { activa: true, es, semanaDelCiclo: pos + 1, cadaSemanas: n, proxima: es ? ymd(lunesHoy) : proxima };
}

/* ---------- Logros ---------- */

export function logros(state, hoy) {
  const ses = sesionesDe(state);
  const objDias = (state.preferencias && state.preferencias.objetivoDiasSemana) || 3;
  const racha = rachaSemanas(ses, objDias, hoy);
  let records = 0;
  Object.keys(state.exercises || {}).forEach((id) => { records += historialEjercicio(state.exercises[id]).records; });
  const volTotal = ses.reduce((a, s) => a + s.volumen, 0);
  const volMax = ses.reduce((a, s) => Math.max(a, s.volumen), 0);
  const reg = state.registro || {};
  const diasRegistro = Object.keys(reg).filter((k) => reg[k] && (reg[k].sueno || reg[k].energia)).length;
  const objPasos = (state.formulario && state.formulario.objetivoPasosDiarios) || 10000;
  // mejor racha de días cumpliendo los pasos
  let rachaPasos = 0, run = 0, prev = null;
  Object.keys(reg).sort().forEach((k) => {
    const ok = num(reg[k] && reg[k].pasos) >= objPasos;
    run = ok ? (prev && ymd(addDays(fromYmd(prev), 1)) === k ? run + 1 : 1) : 0;
    if (run > rachaPasos) rachaPasos = run;
    prev = ok ? k : null;
  });
  const fotos = (state.fotosProgreso || []).length;
  const medidas = ((state.medidas && state.medidas.historial) || []).length;
  const L = [];
  const add = (id, emoji, titulo, desc, valor, meta) => L.push({ id, emoji, titulo, desc, conseguido: valor >= meta, progreso: Math.min(1, meta ? valor / meta : 0), valor, meta });
  add('ses1', '🏁', 'Primer entreno', 'Guarda tu primer registro', ses.length, 1);
  add('ses10', '💪', '10 entrenos', 'Entrena 10 días', ses.length, 10);
  add('ses25', '🔥', '25 entrenos', 'Entrena 25 días', ses.length, 25);
  add('ses50', '⚡', '50 entrenos', 'Entrena 50 días', ses.length, 50);
  add('ses100', '👑', '100 entrenos', 'Entrena 100 días', ses.length, 100);
  add('racha2', '📆', 'Racha de 2 semanas', 'Cumple tu objetivo de días 2 semanas seguidas', racha.mejor, 2);
  add('racha4', '🗓️', 'Racha de 4 semanas', 'Un mes entero cumpliendo', racha.mejor, 4);
  add('racha8', '🏅', 'Racha de 8 semanas', 'Dos meses sin fallar', racha.mejor, 8);
  add('racha12', '🏆', 'Racha de 12 semanas', 'Tres meses sin fallar', racha.mejor, 12);
  add('pr1', '🥇', 'Primer récord', 'Supera tu mejor marca de la serie 1', records, 1);
  add('pr10', '🚀', '10 récords', 'Diez récords en total', records, 10);
  add('pr25', '🌟', '25 récords', 'Veinticinco récords en total', records, 25);
  add('vol10k', '🏋️', 'Sesión de 10.000 kg', 'Levanta 10.000 kg en un solo día', volMax, 10000);
  add('vol100k', '🦍', '100.000 kg', 'Levanta 100.000 kg en total', volTotal, 100000);
  add('vol1m', '🗿', '1.000.000 kg', 'Un millón de kilos en total', volTotal, 1000000);
  add('peso', '🎯', 'Objetivo de peso', 'Alcanza tu objetivo de peso', state.peso && state.peso.objetivoAlcanzado ? 1 : 0, 1);
  add('registro7', '😴', 'Me escucho', 'Apunta sueño o energía 7 días', diasRegistro, 7);
  add('pasos7', '👟', '7 días de pasos', 'Cumple tu objetivo de pasos 7 días seguidos', rachaPasos, 7);
  add('foto1', '📸', 'Antes y después', 'Haz tu primera foto de progreso', fotos, 1);
  add('medida1', '📏', 'A medida', 'Apunta tu primera medida corporal', medidas, 1);
  return L;
}

/* ---------- Duplicar día o ejercicio ---------- */

// Copia de un ejercicio: mismas series, objetivo, comentario y músculo; sin historial (empieza de cero)
export function copiaEjercicio(ex, sufijo) {
  return { ...JSON.parse(JSON.stringify(ex)), name: ex.name + (sufijo === undefined ? ' (copia)' : sufijo), history: [], marcaAntigua: null };
}

export function duplicarEjercicio(state, dayId, exId) {
  const ex = state.exercises[exId];
  const day = (state.days || []).find((d) => d.id === dayId);
  if (!ex || !day) return { ok: false, state };
  const nid = 'custom_' + uid();
  const i = day.ids.indexOf(exId);
  const ids = day.ids.slice();
  // va justo detrás del original (y de su alterno, si lo tiene)
  const par = (day.alternos || []).find((p) => p && (p.a === exId || p.b === exId));
  let pos = i + 1;
  if (par) pos = Math.max(day.ids.indexOf(par.a), day.ids.indexOf(par.b)) + 1;
  ids.splice(pos, 0, nid);
  return {
    ok: true, id: nid,
    state: { ...state, exercises: { ...state.exercises, [nid]: copiaEjercicio(ex) }, days: state.days.map((d) => (d.id === dayId ? { ...d, ids } : d)) },
  };
}

// Copia de un día con copias de sus ejercicios (los registros del día original no se tocan)
export function duplicarDia(state, dayId) {
  const idx = (state.days || []).findIndex((d) => d.id === dayId);
  if (idx === -1) return { ok: false, state };
  const day = state.days[idx];
  const exercises = { ...state.exercises };
  const mapa = {};
  day.ids.forEach((id) => {
    if (!exercises[id]) return;
    const nid = 'custom_' + uid();
    mapa[id] = nid;
    exercises[nid] = copiaEjercicio(exercises[id], '');
  });
  const nuevo = {
    ...JSON.parse(JSON.stringify(day)), id: 'day_' + uid(), label: day.label + ' (copia)',
    ids: day.ids.filter((id) => mapa[id]).map((id) => mapa[id]),
    alternos: (day.alternos || []).filter((p) => p && mapa[p.a] && mapa[p.b]).map((p) => ({ a: mapa[p.a], b: mapa[p.b], activo: mapa[p.activo] || mapa[p.a] })),
  };
  const days = state.days.slice();
  days.splice(idx + 1, 0, nuevo);
  return { ok: true, id: nuevo.id, state: { ...state, exercises, days, meta: { ...state.meta, activeDay: nuevo.id } } };
}

/* ---------- Recordatorios de entrenamiento ---------- */

export const RECORDATORIO_ID_BASE = 3000; // ids 3000–3999 reservados para recordatorios
export const SEMANAS_RECORDATORIO = 8;

// Próximas fechas de aviso: dias = [0..6] (0 = lunes), hora = 'HH:MM'. Devuelve [{ id, at (ms) }] ordenado.
export function proximosRecordatorios(dias, hora, desde, semanas) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hora || ''));
  if (!m || !Array.isArray(dias) || !dias.length) return [];
  const hh = Math.min(23, Number(m[1])), mm = Math.min(59, Number(m[2]));
  const ahora = desde ? new Date(desde) : new Date();
  const lunes = mondayOf(ahora);
  const n = semanas || SEMANAS_RECORDATORIO;
  const out = [];
  for (let w = 0; w <= n; w++) {
    dias.forEach((d) => {
      if (d < 0 || d > 6) return;
      const f = addDays(lunes, w * 7 + d);
      f.setHours(hh, mm, 0, 0);
      if (f.getTime() > ahora.getTime() + 30000) out.push({ at: f.getTime(), dia: d });
    });
  }
  out.sort((a, b) => a.at - b.at);
  return out.slice(0, n * dias.length).map((x, i) => ({ ...x, id: RECORDATORIO_ID_BASE + i }));
}
