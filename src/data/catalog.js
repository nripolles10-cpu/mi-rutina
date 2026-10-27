 // color de acento general (botones y marcas)

/* =========================================================================
   MÚSCULOS (cada ejercicio cuenta solo para el músculo que le asignas)
   ========================================================================= */

// Catálogo de serie (los 15 músculos de siempre, con sus ids y colores). "region" = zona del mapa de la Diana física.
export const MUSCULOS_POR_DEFECTO = [
  { id: 'pecho',      label: 'Pecho',       color: '#F43F5E', emoji: '🎯', region: 'pecho' },
  { id: 'espalda',    label: 'Espalda',     color: '#14B8A6', emoji: '🎯', region: 'espalda' },
  { id: 'hombro',     label: 'Hombro',      color: '#38BDF8', emoji: '🎯', region: 'hombro' },
  { id: 'biceps',     label: 'Bíceps',      color: '#8B5CF6', emoji: '💪', region: 'biceps' },
  { id: 'triceps',    label: 'Tríceps',     color: '#E879F9', emoji: '💪', region: 'triceps' },
  { id: 'cuadriceps', label: 'Cuádriceps',  color: '#F97316', emoji: '🦵', region: 'cuadriceps' },
  { id: 'aductores',  label: 'Aductores',   color: '#FACC15', emoji: '🦵', region: 'aductores' },
  { id: 'isquios',    label: 'Isquios',     color: '#A3E635', emoji: '🦵', region: 'isquios' },
  { id: 'gluteo',     label: 'Glúteo',      color: '#EC4899', emoji: '🍑', region: 'gluteo' },
  { id: 'gemelos',    label: 'Gemelos',     color: '#22C55E', emoji: '🦵', region: 'gemelos' },
  { id: 'core',       label: 'Core',        color: '#94A3B8', emoji: '🧘', region: 'core' },
  { id: 'antebrazo',  label: 'Antebrazo',   color: '#FDBA74', emoji: '💪', region: 'antebrazo' },
  { id: 'trapecio',   label: 'Trapecio',    color: '#3B82F6', emoji: '🎯', region: 'trapecio' },
  { id: 'lumbar',     label: 'Lumbar',      color: '#C084FC', emoji: '🎯', region: 'lumbar' },
  { id: 'abductores', label: 'Abductores',  color: '#FDA4AF', emoji: '🦵', region: 'abductores' },
];

// Zonas que se pueden pintar en el mapa del cuerpo (son fijas: es el dibujo)
export const REGIONES_MAPA = MUSCULOS_POR_DEFECTO.map((m) => [m.id, m.label]);
const REGION_IDS = REGIONES_MAPA.map((r) => r[0]);

// Colores para músculos nuevos (se elige el primero que no esté usado)
export const PALETA_MUSCULOS = ['#F43F5E', '#14B8A6', '#38BDF8', '#8B5CF6', '#E879F9', '#F97316', '#FACC15', '#A3E635', '#EC4899', '#22C55E',
  '#94A3B8', '#FDBA74', '#3B82F6', '#C084FC', '#FDA4AF', '#2DD4BF', '#FB7185', '#60A5FA', '#FCD34D', '#4ADE80', '#F0ABFC', '#FDE047', '#67E8F9', '#FCA5A5'];

const COLOR_OK = /^#[0-9A-Fa-f]{6}$/;

// Limpia una lista de músculos guardada. Si no hay ninguno válido, devuelve el catálogo de serie.
export function normalizarMusculos(list) {
  if (!Array.isArray(list)) return MUSCULOS_POR_DEFECTO.map((m) => ({ ...m }));
  const vistos = {};
  const out = [];
  list.forEach((m) => {
    if (!m || typeof m !== 'object' || typeof m.id !== 'string' || !m.id || vistos[m.id]) return;
    const base = MUSCULOS_POR_DEFECTO.find((d) => d.id === m.id);
    const label = typeof m.label === 'string' && m.label.trim() ? m.label.trim().slice(0, 40) : (base ? base.label : 'Músculo');
    vistos[m.id] = true;
    out.push({
      id: m.id, label,
      color: COLOR_OK.test(m.color || '') ? m.color : (base ? base.color : '#94A3B8'),
      emoji: typeof m.emoji === 'string' && m.emoji ? m.emoji : (base ? base.emoji : '🎯'),
      region: m.region === null ? null : REGION_IDS.indexOf(m.region) !== -1 ? m.region : (base ? base.region : null),
    });
  });
  return out.length ? out : MUSCULOS_POR_DEFECTO.map((m) => ({ ...m }));
}

const CACHE_MAPAS = new WeakMap();
export function mapaMusculos(list) {
  if (!Array.isArray(list)) return CATS;
  let m = CACHE_MAPAS.get(list);
  if (!m) { m = {}; list.forEach((x) => { m[x.id] = x; }); CACHE_MAPAS.set(list, m); }
  return m;
}

/* El catálogo que usa la pantalla. CATS y CAT_IDS son los de siempre, pero ahora se rellenan con los músculos
   del usuario (state.musculos) cada vez que cambian (aplicarCatalogo). */
export const CATS = {};
export const CAT_IDS = [];
export function aplicarCatalogo(list) {
  const l = Array.isArray(list) && list.length ? list : MUSCULOS_POR_DEFECTO;
  Object.keys(CATS).forEach((k) => { delete CATS[k]; });
  CAT_IDS.length = 0;
  l.forEach((m) => { CATS[m.id] = m; CAT_IDS.push(m.id); });
}
aplicarCatalogo(MUSCULOS_POR_DEFECTO);

// Catálogo de un estado concreto (para funciones que reciben el estado: exportaciones, cálculos…)
export function catsDe(state) { return state && Array.isArray(state.musculos) ? mapaMusculos(state.musculos) : CATS; }
export function catIdsDe(state) { return state && Array.isArray(state.musculos) ? state.musculos.map((m) => m.id) : CAT_IDS.slice(); }
// Datos de un músculo; si no existe (no debería pasar), uno neutro para no romper la pantalla
export function catInfo(cats, id) { return (cats && cats[id]) || { id, label: 'Sin músculo', color: '#94A3B8', emoji: '🎯', region: null }; }
// Músculo de reserva cuando uno no existe: Core si sigue en tu lista; si no, el primero
export function catReserva(cats) { return cats.core ? 'core' : Object.keys(cats)[0]; }

// Tipos de serie. Back-off ya no usa 📉 (ahora 📐) y Calentamiento pasa a gris neutro (sin color propio).
export const SET_TYPES = {
  top:     { label: 'Top Set',       emoji: '🔥', color: '#F59E0B', soft: '#FBBF24' },
  backoff: { label: 'Back-off',      emoji: '📐', color: '#10B981', soft: '#34D399' },
  rp:      { label: 'Rest-Pause',    emoji: '⚡', color: '#EF4444', soft: '#F87171' },
  drop:    { label: 'Dropset',       emoji: '🔻', color: '#A855F7', soft: '#C084FC' },
  warm:    { label: 'Calentamiento', emoji: '🌡️', color: '#94A3B8', soft: '#CBD5E1' },
};

export const OBJETIVOS = {
  volumen:       { label: 'Volumen',       emoji: '📈', color: '#22D3EE', protF: 2.0, fatF: 0.8 },
  definicion:    { label: 'Definición',    emoji: '🔥', color: '#F472B6', protF: 2.3, fatF: 0.7 },
  mantenimiento: { label: 'Mantenimiento', emoji: '⚖️', color: '#A3E635', protF: 2.0, fatF: 0.8 },
};

// kcal por encima / por debajo del mantenimiento según el ritmo elegido
export const RITMOS = {
  suave:  { label: 'Suave',  vol: 200, def: 300 },
  normal: { label: 'Normal', vol: 300, def: 450 },
  rapido: { label: 'Rápido', vol: 450, def: 600 },
};

export const ACTIVIDAD_FACTOR = { sedentario: 1.2, ligero: 1.35, moderado: 1.5, intenso: 1.65 };

export const ACTIVIDADES = [['sedentario', 'Sedentario'], ['ligero', 'Ligero'], ['moderado', 'Moderado'], ['intenso', 'Intenso']];

export const APP_VERSION = 9;

export const MOMENTOS = [['desayuno', '🌅 Desayuno'], ['comida', '🍽️ Comida'], ['cena', '🌙 Cena'], ['snack', '🍎 Snack']];

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const TAB_IDS = ['rutina', 'cardio', 'progreso', 'fisico', 'comida', 'extras'];

/* =========================================================================
   DIANA FÍSICA (mapa corporal + estado manual por músculo)
   El estado (fuerte / débil / sin marcar) lo decides TÚ. El progreso hacia tus objetivos es solo informativo.
   ========================================================================= */

export const ESTADO_COLOR = { fuerte: '#22C55E', intermedio: '#FBBF24', debil: '#F43F5E' };

export const ESTADO_LABEL = { fuerte: 'Punto fuerte', intermedio: 'Intermedio', debil: 'Punto débil', none: 'Sin marcar' };

/* =========================================================================
   TAB: COMIDA (diario, recetas, planificador, lista de la compra, agua)
   ========================================================================= */

export const TIPO_RECETA = [['desayuno', 'Desayuno'], ['comida', 'Comida'], ['cena', 'Cena'], ['snack', 'Snack']];

export function tipoRecetaLabel(t) { const x = TIPO_RECETA.find((y) => y[0] === t); return x ? x[1] : 'Comida'; }

/* ---------- Herramientas: 1RM y discos ---------- */

// 1RM estimado: media de Epley y Brzycki. Devuelve null si los datos no valen (reps entre 1 y 30).
export const TABLA_1RM = [[100, 1], [95, 2], [90, 4], [85, 6], [80, 8], [75, 10], [70, 12], [65, 15], [60, 20]];

// Discos por lado. barra = peso de la barra (0 para máquinas: solo cuentan los discos).
// Devuelve null si no hay objetivo, { menor: true } si el objetivo es menor que la barra,
// o { usados: [[disco, cantidad]…], resto (kg por lado sin cubrir), enDiscos (kg totales en discos), montado (kg totales reales) }.
export const DISCOS_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
