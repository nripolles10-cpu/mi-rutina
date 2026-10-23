import { MOMENTOS, OBJETIVOS } from '../data/catalog.js';
import { NUTRI_DB, ingMacros, mkRecetas } from '../data/recetas.js';
import { fmt, num, numOrNull, stripAcc, uid } from '../utils/format.js';
import { kcalOfMacros } from '../utils/health.js';

export function defaultComida() { return { recetas: mkRecetas(), favoritos: [], diario: {}, plan: {}, compra: {}, agua: { objetivo: 3, dias: {}, unidad: 'litros' } }; }

// El agua se cuenta en litros (1 botella = 1 L). Los datos guardados antes en vasos (de 250 ml) se convierten solos.
export function normalizeAgua(a) {
  if (!a) return { objetivo: 3, dias: {}, unidad: 'litros' };
  if (a.unidad === 'litros') return { objetivo: a.objetivo || 3, dias: a.dias || {}, unidad: 'litros' };
  const dias = {};
  Object.keys(a.dias || {}).forEach((k) => { dias[k] = Math.round((a.dias[k] || 0) * 0.25 * 100) / 100; });
  return { objetivo: Math.round((a.objetivo || 12) * 0.25 * 2) / 2 || 3, dias: dias, unidad: 'litros' };
}

export function normalizeRecetas(list, seed) {
  const arr = Array.isArray(list) ? list : seed;
  return arr.filter((r) => r && typeof r === 'object').map((r) => ({
    id: r.id || 'r_' + uid(), nombre: r.nombre || 'Receta',
    tipo: ['desayuno', 'comida', 'cena', 'snack'].indexOf(r.tipo) !== -1 ? r.tipo : 'comida',
    objetivos: Array.isArray(r.objetivos) ? r.objetivos.filter((o) => OBJETIVOS[o]) : [], p: num(r.p), c: num(r.c), g: num(r.g),
    ingredientes: Array.isArray(r.ingredientes) ? r.ingredientes.filter((x) => x && typeof x === 'object').map((x) => ({ n: String(x.n || ''), q: numOrNull(x.q), u: String(x.u || '') })) : [],
    pasos: Array.isArray(r.pasos) ? r.pasos.map(String) : [], propia: !!r.propia, editada: !!r.editada,
  }));
}

// Macros de una lista de ingredientes con NUTRI_DB. desconocidos = ingredientes que no están en la tabla.
export function macrosFromIngredientes(ingredientes) {
  let p = 0, c = 0, g = 0;
  const desconocidos = [];
  (ingredientes || []).forEach((x) => {
    if (!x || !String(x.n || '').trim()) return;
    if (!NUTRI_DB[x.n]) { desconocidos.push(x.n); return; }
    const m = ingMacros(x.n, x.q, x.u);
    p += m[0]; c += m[1]; g += m[2];
  });
  return { p: Math.round(p), c: Math.round(c), g: Math.round(g), desconocidos };
}

export function recKcal(r) { return kcalOfMacros(r.p, r.c, r.g); }

export function recTotals(r, raciones) { return { kcal: recKcal(r) * raciones, p: r.p * raciones, c: r.c * raciones, g: r.g * raciones }; }

export function scaleQty(q, f) { return q === null || q === undefined || q === '' ? null : Math.round(Number(q) * f * 100) / 100; }

export function qtyText(q, u) { return (q === null ? '' : fmt(q, 2) + ' ') + (u || ''); }

export function toggleFavorita(commit, id) {
  commit((prev) => {
    const fav = prev.comida.favoritos || [];
    return { ...prev, comida: { ...prev.comida, favoritos: fav.indexOf(id) !== -1 ? fav.filter((x) => x !== id) : fav.concat([id]) } };
  });
}

/* ---------- Lista de la compra ---------- */

export function listaCompra(state) {
  const map = {};
  const plan = state.comida.plan || {};
  Object.keys(plan).forEach((di) => MOMENTOS.forEach((m) => (plan[di][m[0]] || []).forEach((it) => {
    const r = state.comida.recetas.find((x) => x.id === it.recetaId);
    if (!r) return;
    r.ingredientes.forEach((ing) => {
      const key = stripAcc(ing.n).toLowerCase().trim() + '|' + String(ing.u || '').toLowerCase();
      const cur = map[key] || (map[key] = { key, nombre: ing.n, u: ing.u, q: 0, sinCantidad: false });
      if (ing.q === null || ing.q === undefined || ing.q === '') cur.sinCantidad = true; else cur.q += Number(ing.q) * it.raciones;
    });
  })));
  return Object.keys(map).map((k) => map[k]).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
