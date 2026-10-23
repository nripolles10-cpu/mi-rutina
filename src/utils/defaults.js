/* =========================================================================
   DATOS POR DEFECTO (src/data/defaultData.json)
   Es lo que ve alguien la PRIMERA vez que abre la app (por ejemplo, un amigo al que le pasas la APK).
   Solo lleva la rutina y cosas generales: NUNCA peso, diario, medidas ni datos personales.
   ========================================================================= */
import { APP_VERSION } from '../data/catalog.js';
import { buildInitialState } from '../state/migrate.js';
import { applyImport, validateShareObj } from './share.js';
import { clone } from './format.js';

// Crea el contenido de defaultData.json a partir de un estado de la app (o de un código ya decodificado).
// opts.recetas: incluir recetas y favoritas (por defecto sí).
export function buildDefaultData(source, opts) {
  const o = { recetas: true, ...(opts || {}) };
  // source puede ser un estado de la app o un objeto de código GYMR1 decodificado
  const days = source.days || (source.rutina && source.rutina.days) || [];
  const allEx = source.exercises || (source.rutina && source.rutina.exercises) || {};
  const usados = {};
  days.forEach((d) => (d.ids || []).forEach((id) => { if (allEx[id]) usados[id] = true; }));
  const exercises = {};
  Object.keys(usados).forEach((id) => { const e = { ...allEx[id] }; delete e.history; delete e.marcaAntigua; exercises[id] = e; });
  const out = {
    app: 'gymtracker', v: 1, appVersion: APP_VERSION, tipo: 'datos-por-defecto', creado: new Date().toISOString(), nombre: '',
    rutina: { days: clone(days).map((d) => ({ id: d.id, label: d.label, equipo: d.equipo || '', nota: d.nota || '', ids: d.ids.filter((id) => exercises[id]) })), exercises: clone(exercises) },
    extra: {},
  };
  const cardio = source.cardio || (source.extra && source.extra.cardio);
  const extras = source.extras || (source.extra && source.extra.extras);
  if (Array.isArray(cardio)) out.extra.cardio = clone(cardio);
  if (extras && typeof extras === 'object') out.extra.extras = clone(extras);
  if (o.recetas) {
    const recetas = (source.comida && source.comida.recetas) || source.recetas;
    const favoritos = (source.comida && source.comida.favoritos) || source.favoritos;
    if (Array.isArray(recetas)) { out.recetas = clone(recetas); out.favoritos = Array.isArray(favoritos) ? clone(favoritos) : []; }
  }
  return out;
}

// Estado del primer arranque: la semilla de la app + lo que traiga defaultData.json.
// Si defaultData.json no es válido se usa la semilla tal cual (la app nunca deja de arrancar por él).
export function stateFromDefaults(data) {
  const seed = buildInitialState();
  if (!data || !validateShareObj(data).ok) return seed;
  let st;
  try { st = applyImport(seed, clone(data), 'todo'); } catch (e) { return seed; }
  // Cada ejercicio arranca con su serie actual como marca de referencia (igual que la rutina de serie)
  const ahora = new Date().toISOString();
  Object.keys(st.exercises).forEach((id) => {
    const ex = st.exercises[id];
    if (!ex.history || !ex.history.length) st.exercises[id] = { ...ex, history: [{ date: ahora, sets: clone(ex.currentSets), seed: true }] };
  });
  // La semilla trae ejercicios de serie que no están en ningún día: en el primer arranque no hacen falta
  const usados = {};
  st.days.forEach((d) => d.ids.forEach((id) => { usados[id] = true; }));
  Object.keys(st.exercises).forEach((id) => { if (!usados[id]) delete st.exercises[id]; });
  st.meta = { ...st.meta, activeTab: 'rutina', editMode: false };
  return st;
}
