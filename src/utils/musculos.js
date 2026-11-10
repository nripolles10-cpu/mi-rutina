/* =========================================================================
   CATÁLOGO DE MÚSCULOS EDITABLE (state.musculos)
   Crear, renombrar, cambiar la zona del mapa y quitar músculos. Funciones puras: reciben el estado y
   devuelven el siguiente (o el mismo si no hay nada que cambiar). Nunca se pierden ejercicios ni historial.
   ========================================================================= */
import { PALETA_MUSCULOS, REGIONES_MAPA, normalizarMusculos } from '../data/catalog.js';
import { stripAcc, uid } from './format.js';

const REGION_IDS = REGIONES_MAPA.map((r) => r[0]);
const clave = (s) => stripAcc(String(s || '')).trim().toLowerCase();

export function limpiarNombreMusculo(nombre) { return String(nombre || '').replace(/\s+/g, ' ').trim().slice(0, 40); }

// ¿Ya hay otro músculo con ese nombre? (sin distinguir mayúsculas ni tildes)
export function nombreRepetido(musculos, nombre, exceptoId) {
  const k = clave(nombre);
  return (musculos || []).some((m) => m.id !== exceptoId && clave(m.label) === k);
}

// Ejercicios (todos, también los ocultos que no están en ningún día) que usan un músculo
export function ejerciciosDeMusculo(state, id) {
  return Object.keys(state.exercises || {}).filter((eid) => state.exercises[eid] && state.exercises[eid].cat === id);
}

function colorLibre(musculos) {
  const usados = {};
  musculos.forEach((m) => { usados[String(m.color).toUpperCase()] = true; });
  return PALETA_MUSCULOS.find((c) => !usados[c.toUpperCase()]) || PALETA_MUSCULOS[musculos.length % PALETA_MUSCULOS.length];
}

// Crea un músculo. region: zona del mapa (o null si no se pinta en el mapa). Devuelve { ok, state, id } o { ok: false, error }.
export function crearMusculo(state, nombre, region) {
  const musculos = normalizarMusculos(state.musculos);
  const label = limpiarNombreMusculo(nombre);
  if (!label) return { ok: false, error: 'Escribe un nombre para el músculo.' };
  if (nombreRepetido(musculos, label)) return { ok: false, error: 'Ya tienes un músculo que se llama "' + label + '".' };
  const reg = REGION_IDS.indexOf(region) !== -1 ? region : null;
  const base = musculos.find((m) => m.region === reg && reg);
  const id = 'm_' + uid();
  const nuevo = { id, label, color: colorLibre(musculos), emoji: base ? base.emoji : '🎯', region: reg };
  return { ok: true, id, state: { ...state, musculos: musculos.concat([nuevo]) } };
}

export function renombrarMusculo(state, id, nombre) {
  const musculos = normalizarMusculos(state.musculos);
  const label = limpiarNombreMusculo(nombre);
  if (!label) return { ok: false, error: 'El nombre no puede quedar vacío.' };
  if (!musculos.some((m) => m.id === id)) return { ok: false, error: 'Ese músculo ya no existe.' };
  if (nombreRepetido(musculos, label, id)) return { ok: false, error: 'Ya tienes otro músculo que se llama "' + label + '".' };
  const actual = musculos.find((m) => m.id === id);
  if (actual.label === label) return { ok: true, state };
  return { ok: true, state: { ...state, musculos: musculos.map((m) => (m.id === id ? { ...m, label } : m)) } };
}

export function cambiarRegionMusculo(state, id, region) {
  const musculos = normalizarMusculos(state.musculos);
  const reg = REGION_IDS.indexOf(region) !== -1 ? region : null;
  if (!musculos.some((m) => m.id === id)) return { ok: false, error: 'Ese músculo ya no existe.' };
  return { ok: true, state: { ...state, musculos: musculos.map((m) => (m.id === id ? { ...m, region: reg } : m)) } };
}

// Quita un músculo. Si tiene ejercicios, pasan TODOS al músculo "destino" (con su historial intacto).
// No deja quitar el último músculo.
export function borrarMusculo(state, id, destino) {
  const musculos = normalizarMusculos(state.musculos);
  if (!musculos.some((m) => m.id === id)) return { ok: false, error: 'Ese músculo ya no existe.' };
  if (musculos.length <= 1) return { ok: false, error: 'Tiene que quedar al menos un músculo.' };
  const usados = ejerciciosDeMusculo(state, id);
  if (usados.length && (!destino || destino === id || !musculos.some((m) => m.id === destino))) {
    return { ok: false, error: 'Elige a qué músculo pasan sus ' + usados.length + ' ejercicios.' };
  }
  const exercises = { ...state.exercises };
  usados.forEach((eid) => { exercises[eid] = { ...exercises[eid], cat: destino }; });
  const diana = state.diana || { estados: {}, titulos: {} };
  const estados = { ...(diana.estados || {}) };
  const titulos = { ...(diana.titulos || {}) };
  delete estados[id]; delete titulos[id];
  return {
    ok: true, movidos: usados.length,
    state: { ...state, exercises, musculos: musculos.filter((m) => m.id !== id), diana: { ...diana, estados, titulos } },
  };
}

// Músculos que se pintan en una zona del mapa
export function musculosDeRegion(musculos, region) { return (musculos || []).filter((m) => m.region === region); }

/* Análisis de Progreso por grupos, como antes: las partes suman en su músculo
   (pectoral superior → pecho; hombro lateral y posterior → hombro; espalda alta → espalda).
   Si el músculo del grupo ya no existe, la parte va por su cuenta. */
export const GRUPOS_ANALISIS = { pecho_sup: 'pecho', hombro_lat: 'hombro', hombro_post: 'hombro', espalda_alta: 'espalda' };
const NOMBRE_GRUPO = { pecho: 'Pecho', hombro: 'Hombro', espalda: 'Espalda' };
export function grupoAnalisis(cat, cats) {
  const g = GRUPOS_ANALISIS[cat];
  return g && cats[g] ? g : cat;
}
// El mismo estado, con cada ejercicio contado en su grupo (para series por semana y objetivos)
export function estadoPorGrupos(state, cats) {
  const exercises = {};
  Object.keys(state.exercises || {}).forEach((id) => {
    const ex = state.exercises[id];
    const g = grupoAnalisis(ex.cat, cats);
    exercises[id] = g === ex.cat ? ex : { ...ex, cat: g };
  });
  return { ...state, exercises };
}
// Filas del análisis: un músculo por grupo, con el nombre del grupo si tiene partes
export function filasPorGrupos(catIds, cats) {
  return catIds.filter((k) => grupoAnalisis(k, cats) === k).map((k) => {
    const conPartes = catIds.some((x) => x !== k && grupoAnalisis(x, cats) === k);
    return { key: k, label: conPartes && NOMBRE_GRUPO[k] ? NOMBRE_GRUPO[k] : cats[k].label, emoji: cats[k].emoji, color: cats[k].color };
  });
}
