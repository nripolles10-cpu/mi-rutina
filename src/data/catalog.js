 // color de acento general (botones y marcas)

/* =========================================================================
   MÚSCULOS (cada ejercicio cuenta solo para el músculo que le asignas)
   ========================================================================= */

export const CATS = {
  pecho:      { label: 'Pecho',       color: '#F43F5E', emoji: '🎯' },
  espalda:    { label: 'Espalda',     color: '#14B8A6', emoji: '🎯' },
  hombro:     { label: 'Hombro',      color: '#38BDF8', emoji: '🎯' },
  biceps:     { label: 'Bíceps',      color: '#8B5CF6', emoji: '💪' },
  triceps:    { label: 'Tríceps',     color: '#E879F9', emoji: '💪' },
  cuadriceps: { label: 'Cuádriceps',  color: '#F97316', emoji: '🦵' },
  aductores:  { label: 'Aductores',   color: '#FACC15', emoji: '🦵' },
  isquios:    { label: 'Isquios',     color: '#A3E635', emoji: '🦵' },
  gluteo:     { label: 'Glúteo',      color: '#EC4899', emoji: '🍑' },
  gemelos:    { label: 'Gemelos',     color: '#22C55E', emoji: '🦵' },
  core:       { label: 'Core',        color: '#94A3B8', emoji: '🧘' },
  antebrazo:  { label: 'Antebrazo',   color: '#FDBA74', emoji: '💪' },
  trapecio:   { label: 'Trapecio',    color: '#3B82F6', emoji: '🎯' },
  lumbar:     { label: 'Lumbar',      color: '#C084FC', emoji: '🎯' },
  abductores: { label: 'Abductores',  color: '#FDA4AF', emoji: '🦵' },
};

export const CAT_IDS = Object.keys(CATS);

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

export const APP_VERSION = 7;

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
