import { APP_VERSION, CATS, TAB_IDS } from '../data/catalog.js';
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

export function normalizeExercise(ex) {
  const rawSets = Array.isArray(ex.currentSets) ? ex.currentSets : Array.isArray(ex.sets) ? ex.sets : [];
  const sets = rawSets.map((s, i) => normalizeSet(s, i));
  const out = {
    ...ex,
    name: typeof ex.name === 'string' && ex.name ? ex.name : 'Ejercicio',
    cat: CATS[ex.cat] ? ex.cat : 'core',
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
    preferencias: { pantallaEncendida: false },
    meta: { activeTab: 'rutina', activeDay: 'piernaA', editMode: false },
  };
}

// Normaliza un estado ya migrado a la versión actual: se combina con la semilla para que un campo nuevo
// nunca borre lo que tenías. NO cambia la rutina del usuario: solo rellena lo que falta y repara lo roto.
export function normalizeCurrent(loaded, seed, appVersion) {
  const objetivo = appVersion || APP_VERSION;
  const lv = Number(loaded.version);
  const next = { ...seed, ...loaded, version: isFinite(lv) && lv > objetivo ? lv : objetivo };
  const rawEx = loaded.exercises && typeof loaded.exercises === 'object' ? loaded.exercises : seed.exercises;
  const exercises = {};
  Object.keys(rawEx).forEach((id) => { if (rawEx[id] && typeof rawEx[id] === 'object') exercises[id] = normalizeExercise(rawEx[id]); });
  const rawDays = Array.isArray(loaded.days) ? loaded.days : seed.days;
  const days = rawDays.filter((d) => d && typeof d === 'object').map(normalizeDay);
  // Un día que apunta a un ejercicio que no existe: se recupera de la semilla si está ahí; si no, se quita la referencia rota.
  days.forEach((d) => {
    d.ids.forEach((id) => { if (!exercises[id] && seed.exercises[id]) exercises[id] = seed.exercises[id]; });
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
  const c = loaded.comida || {};
  next.comida = {
    recetas: normalizeRecetas(c.recetas, seed.comida.recetas),
    favoritos: Array.isArray(c.favoritos) ? c.favoritos : [],
    diario: c.diario && typeof c.diario === 'object' ? c.diario : {},
    plan: c.plan && typeof c.plan === 'object' ? c.plan : {},
    compra: c.compra && typeof c.compra === 'object' ? c.compra : {},
    agua: normalizeAgua(c.agua),
  };
  next.preferencias = { ...seed.preferencias, ...(loaded.preferencias && typeof loaded.preferencias === 'object' ? loaded.preferencias : {}) };
  next.meta = { ...seed.meta, ...(loaded.meta || {}) };
  if (TAB_IDS.indexOf(next.meta.activeTab) === -1) next.meta.activeTab = 'rutina';
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
  (prof.fuertes || []).forEach((x) => { if (CATS[x.region]) { diana.estados[x.region] = 'fuerte'; if (x.titulo) diana.titulos[x.region] = x.titulo; } });
  (prof.prioridad || []).forEach((x) => { if (CATS[x.region]) { diana.estados[x.region] = 'debil'; if (x.titulo) diana.titulos[x.region] = x.titulo; } });
  (prof.equilibrio || []).forEach((x) => { if (CATS[x.region] && x.titulo) diana.titulos[x.region] = x.titulo; });
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
};

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
