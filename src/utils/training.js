import { DISCOS_KG, SET_TYPES, TABLA_1RM, catIdsDe } from '../data/catalog.js';
import { fmt, mean, num, numOrNull, nz } from '../utils/format.js';

/* =========================================================================
   SERIES: tipos y estructura
   ========================================================================= */

// Garantiza que la serie tenga los datos que necesita su tipo (tandas para rest-pause, descensos para dropset)
// y mantiene reps/peso "principales" sincronizados (los usan el progreso y las marcas).
export function ensureStruct(s) {
  const out = { ...s };
  if (out.tipo === 'rp') {
    if (!Array.isArray(out.tandas) || out.tandas.length < 2) {
      const m = String(out.nota || '').toLowerCase().match(/(\d+)\s*tandas/);
      const n = Math.min(8, Math.max(2, m ? parseInt(m[1], 10) : 3));
      const t = [nz(out.reps)];
      for (let i = 1; i < n; i++) t.push(null);
      out.tandas = t;
    }
    out.reps = nz(out.tandas[0]);
  }
  if (out.tipo === 'drop') {
    if (!Array.isArray(out.drops) || out.drops.length < 2) {
      out.drops = [{ weight: nz(out.weight), reps: nz(out.reps) }, { weight: null, reps: null }];
    }
    out.weight = nz(out.drops[0].weight);
    out.reps = nz(out.drops[0].reps);
  }
  return out;
}

export function normalizeSet(s, idx) {
  const src = s || {};
  const nota = src.nota ? String(src.nota) : null;
  let tipo = SET_TYPES[src.tipo] ? src.tipo : null;
  if (!tipo) {
    const low = (nota || '').toLowerCase();
    if (/calentamiento/.test(low)) tipo = 'warm';
    else if (/rest[\s-]?pause/.test(low)) tipo = 'rp';
    else if (/drop\s?set/.test(low)) tipo = 'drop';
    else tipo = idx === 0 ? 'top' : 'backoff';
  }
  const base = { reps: nz(src.reps), weight: nz(src.weight), nota: nota, tipo: tipo };
  if (Array.isArray(src.tandas)) base.tandas = src.tandas.map(numOrNull);
  if (Array.isArray(src.drops)) base.drops = src.drops.map((d) => ({ weight: numOrNull(d && d.weight), reps: numOrNull(d && d.reps) }));
  return ensureStruct(base);
}

// Series efectivas que cuenta una serie: calentamiento no cuenta; en rest-pause y dropset
// cada tanda / descenso extra suma media serie.
export function effectiveCount(set) {
  if (!set || set.tipo === 'warm') return 0;
  let n = 1;
  if (set.tipo === 'rp') n += 0.5 * Math.max(0, (set.tandas || []).length - 1);
  if (set.tipo === 'drop') n += 0.5 * Math.max(0, (set.drops || []).length - 1);
  return n;
}

// Volumen (kg totales levantados) de una serie. El calentamiento no cuenta.
/* =========================================================================
   MARCAS, VOLUMEN SEMANAL Y OBJETIVOS POR MÚSCULO
   ========================================================================= */

export function computeScore(set) {
  if (!set) return 0;
  const w = typeof set.weight === 'number' ? set.weight : 0;
  const r = typeof set.reps === 'number' ? set.reps : 1;
  return w > 0 ? w * r : 0;
}

export function bestSerie1(ex) {
  const hist = ex.history || [];
  let best = null;
  hist.forEach((h) => {
    const w = h.sets && h.sets[0] ? h.sets[0].weight : null;
    if (typeof w === 'number' && (best === null || w > best)) best = w;
  });
  if (best === null && ex.currentSets && ex.currentSets[0]) best = ex.currentSets[0].weight;
  return typeof best === 'number' ? best : null;
}

export function latestSerie1(ex) {
  const hist = ex.history || [];
  if (hist.length) {
    const w = hist[hist.length - 1].sets && hist[hist.length - 1].sets[0] ? hist[hist.length - 1].sets[0].weight : null;
    if (typeof w === 'number') return w;
  }
  return ex.currentSets && ex.currentSets[0] && typeof ex.currentSets[0].weight === 'number' ? ex.currentSets[0].weight : null;
}

// Solo cuentan los ejercicios que están en algún día
export function activeExerciseIds(state) {
  const set = new Set();
  (state.days || []).forEach((d) => (d.ids || []).forEach((id) => { if (state.exercises[id]) set.add(id); }));
  return Array.from(set);
}

// Series efectivas semanales por músculo. Cada ejercicio cuenta SOLO para el músculo que le asignas.
// Un ejercicio compartido entre dos días (como el gemelo) cuenta en cada día en que aparece.
export function weeklySets(state) {
  const totals = {};
  catIdsDe(state).forEach((k) => { totals[k] = 0; });
  (state.days || []).forEach((day) => {
    (day.ids || []).forEach((id) => {
      const ex = state.exercises[id];
      if (!ex) return;
      totals[ex.cat] = (totals[ex.cat] || 0) + (ex.currentSets || []).reduce((acc, s) => acc + effectiveCount(s), 0);
    });
  });
  return totals;
}

// Progreso hacia los objetivos de levantamiento por músculo: media de (mejor marca / objetivo) limitada a 100 %
// y kg que faltan de media. Se ignoran los ejercicios sin objetivo numérico.
export function muscleProgress(state) {
  const out = {};
  const ids = catIdsDe(state);
  ids.forEach((k) => { out[k] = { items: [], pct: null, falta: null, ignorados: 0 }; });
  activeExerciseIds(state).forEach((id) => {
    const ex = state.exercises[id];
    const o = out[ex.cat] || (out[ex.cat] = { items: [], pct: null, falta: null, ignorados: 0 });
    const val = ex.objetivo && typeof ex.objetivo.value === 'number' && ex.objetivo.value > 0 ? ex.objetivo.value : null;
    const best = bestSerie1(ex);
    if (val === null || best === null) { o.ignorados += 1; return; }
    o.items.push({ id, name: ex.name, best, objetivo: val, pct: Math.min(1, best / val), falta: Math.max(0, val - best) });
  });
  Object.keys(out).forEach((k) => {
    const o = out[k];
    if (o.items.length) { o.pct = mean(o.items.map((i) => i.pct)) * 100; o.falta = mean(o.items.map((i) => i.falta)); }
  });
  return out;
}

export function describeSet(s) {
  if (!s) return '';
  const t = (SET_TYPES[s.tipo] || SET_TYPES.top).label;
  if (s.tipo === 'rp') return t + ' ' + fmt(s.weight) + ' kg · ' + (s.tandas || []).map((r) => (r === null ? '–' : r)).join('/') + ' reps';
  if (s.tipo === 'drop') return t + ' ' + (s.drops || []).map((d) => (d.reps === null ? '–' : d.reps) + '×' + (d.weight === null ? '–' : fmt(d.weight))).join(' → ') + ' kg';
  return t + ' ' + (s.reps === null ? '–' : s.reps) + '×' + (s.weight === null ? 'sin peso' : fmt(s.weight) + ' kg');
}

export function setVolume(s) {
  if (!s || s.tipo === 'warm') return 0;
  if (s.tipo === 'rp') return num(s.weight) * (s.tandas || []).reduce((a, r) => a + num(r), 0);
  if (s.tipo === 'drop') return (s.drops || []).reduce((a, d) => a + num(d && d.weight) * num(d && d.reps), 0);
  return num(s.weight) * num(s.reps);
}

export function setsVolume(sets) { return (sets || []).reduce((a, s) => a + setVolume(s), 0); }

export function calc1RM(peso, reps) {
  if (typeof peso !== 'number' || typeof reps !== 'number' || !(peso > 0) || !(reps >= 1) || reps > 30) return null;
  const epley = reps === 1 ? peso : peso * (1 + reps / 30);
  const brzycki = reps === 1 ? peso : (peso * 36) / (37 - reps);
  const media = (epley + brzycki) / 2;
  return {
    epley, brzycki, media, min: Math.min(epley, brzycki), max: Math.max(epley, brzycki),
    tabla: TABLA_1RM.map((t) => ({ pct: t[0], reps: t[1], kg: (media * t[0]) / 100 })),
  };
}

export function calcDiscos(barra, objetivo, discos) {
  const lista = discos || DISCOS_KG;
  if (typeof objetivo !== 'number' || !(objetivo > 0)) return null;
  const b = typeof barra === 'number' && barra > 0 ? barra : 0;
  if (objetivo < b) return { menor: true };
  let resto = (objetivo - b) / 2;
  const usados = [];
  lista.forEach((d) => { const n = Math.floor((resto + 1e-9) / d); if (n > 0) { usados.push([d, n]); resto = Math.round((resto - n * d) * 1000) / 1000; } });
  const enDiscos = Math.round(usados.reduce((a, u) => a + u[0] * u[1], 0) * 2 * 1000) / 1000;
  return { usados, resto, enDiscos, montado: Math.round((b + enDiscos) * 1000) / 1000 };
}
