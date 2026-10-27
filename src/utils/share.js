import LZString from 'lz-string';
import { APP_VERSION, MUSCULOS_POR_DEFECTO, normalizarMusculos } from '../data/catalog.js';
import { anadirRecetasNuevas, migrateState } from '../state/migrate.js';

/* =========================================================================
   SECCIÓN 5 · COMPARTIR Y EXPORTAR
   Código de texto para pasar tus datos a otro móvil o a un amigo, y archivos de texto, Excel y Word.
   ========================================================================= */

/* =========================================================================
   COMPARTIR / IMPORTAR / COPIA DE SEGURIDAD
   Código de texto:  GYMR1.<huella>.<datos comprimidos con LZString>
   Sirve para pasar tu rutina a un amigo y para cambiar de móvil sin perder nada.
   ========================================================================= */

export function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function encodeShare(obj) {
  const payload = LZString.compressToEncodedURIComponent(JSON.stringify(obj));
  return 'GYMR1.' + hashStr(payload) + '.' + payload;
}

// Devuelve { ok, obj } o { ok:false, error } con un mensaje claro
// Comprueba que un objeto (de un código, una copia o defaultData.json) trae una rutina válida
export function validateShareObj(obj) {
  if (!obj || typeof obj !== 'object' || obj.app !== 'gymtracker' || !obj.rutina || !Array.isArray(obj.rutina.days) || !obj.rutina.exercises || typeof obj.rutina.exercises !== 'object' || Array.isArray(obj.rutina.exercises)) {
    return { ok: false, error: 'El código no contiene una rutina válida.' };
  }
  const exs = obj.rutina.exercises;
  const badEx = Object.keys(exs).some((id) => !exs[id] || typeof exs[id] !== 'object' || typeof exs[id].name !== 'string');
  const badDay = obj.rutina.days.some((d) => !d || typeof d !== 'object' || !Array.isArray(d.ids));
  if (badEx || badDay) return { ok: false, error: 'La rutina del código tiene datos con un formato que no se puede leer.' };
  const bad = [];
  obj.rutina.days.forEach((d) => { d.ids.forEach((id) => { if (!exs[id]) bad.push(id); }); });
  if (bad.length) return { ok: false, error: 'La rutina del código está rota (días que apuntan a ejercicios que no existen).' };
  return { ok: true, obj };
}

export function decodeShare(text) {
  const t = String(text || '').replace(/\s+/g, '');
  if (!t) return { ok: false, error: 'No has pegado ningún código.' };
  if (t.indexOf('GYMR1.') !== 0) return { ok: false, error: 'Este texto no es un código de la app (debe empezar por GYMR1.). Revisa que lo has copiado entero.' };
  const parts = t.split('.');
  if (parts.length !== 3 || !parts[2]) return { ok: false, error: 'El código está incompleto. Pídelo otra vez y cópialo entero.' };
  if (hashStr(parts[2]) !== parts[1]) return { ok: false, error: 'El código está corrupto o le falta un trozo (la huella no coincide). Pídelo de nuevo.' };
  let json = null;
  try { json = LZString.decompressFromEncodedURIComponent(parts[2]); } catch (e) { json = null; }
  if (!json) return { ok: false, error: 'No se ha podido descomprimir el código. Está corrupto.' };
  let obj = null;
  try { obj = JSON.parse(json); } catch (e) { return { ok: false, error: 'El contenido del código no es válido.' }; }
  const v = validateShareObj(obj);
  if (!v.ok) return v;
  return { ok: true, obj: obj };
}

// opts: { historial, peso, recetas, nutricion, todo, fotos }
export function buildShareObject(state, opts, fotos) {
  const o = { app: 'gymtracker', v: 1, appVersion: APP_VERSION, creado: new Date().toISOString(), nombre: (state.formulario && state.formulario.nombre) || '' };
  const defs = {};
  Object.keys(state.exercises).forEach((id) => { const e = { ...state.exercises[id] }; delete e.history; defs[id] = e; });
  o.rutina = { days: state.days, exercises: defs };
  // Tus músculos (para que quien lo importe vea los mismos, también los que hayas creado tú)
  if (Array.isArray(state.musculos)) o.musculos = state.musculos;
  if (opts.historial) { o.historial = {}; Object.keys(state.exercises).forEach((id) => { o.historial[id] = state.exercises[id].history; }); }
  if (opts.peso) o.peso = state.peso;
  if (opts.recetas) { o.recetas = state.comida.recetas; o.favoritos = state.comida.favoritos; }
  if (opts.nutricion) o.nutricion = { nutricion: state.nutricion, formulario: state.formulario, plan: state.comida.plan };
  if (opts.todo) {
    o.extra = { cardio: state.cardio, diana: state.diana, extras: state.extras, diario: state.comida.diario, agua: state.comida.agua, compra: state.comida.compra,
      registro: state.registro, medidas: state.medidas, fotosProgreso: state.fotosProgreso, preferencias: state.preferencias };
  }
  if (opts.fotos && fotos) o.fotos = fotos;
  return o;
}

export function describeShare(obj) {
  const out = [];
  out.push('Rutina: ' + obj.rutina.days.length + ' días y ' + Object.keys(obj.rutina.exercises).length + ' ejercicios');
  if (obj.historial) out.push('Historial de ejercicios');
  if (obj.peso) out.push('Peso corporal (' + ((obj.peso.historial || []).length) + ' registros)');
  if (obj.recetas) out.push('Recetas (' + obj.recetas.length + ')');
  if (obj.nutricion) out.push('Nutrición (calculadora, tus datos y planificador)');
  if (obj.extra) out.push('Resto de datos (cardio, diana física, suplementos, diario de comidas, agua, medidas, sueño y pasos…)');
  if (obj.fotos) out.push('Fotos (' + Object.keys(obj.fotos).length + ')');
  return out;
}

// Aplica un código importado sobre el estado actual.
//  mode 'rutina' → solo días y ejercicios (conserva tu historial de los ejercicios con el mismo id)
//  mode 'todo'   → reemplaza todas las secciones que trae el código (las que no trae, no se tocan)
export function applyImport(prev, obj, mode) {
  const next = { ...prev };
  const histOf = (id) => {
    if (mode === 'todo' && obj.historial && Array.isArray(obj.historial[id])) return obj.historial[id];
    return prev.exercises[id] ? prev.exercises[id].history : [];
  };
  // En modo "solo la rutina" tus ejercicios que no vienen en el código se conservan ocultos (con su historial):
  // no salen en ningún día, pero no se pierde nada y vuelven si se importa una rutina que los use.
  const exercises = mode === 'todo' ? {} : { ...prev.exercises };
  Object.keys(obj.rutina.exercises).forEach((id) => { exercises[id] = { ...obj.rutina.exercises[id], history: histOf(id) }; });
  next.exercises = exercises;
  next.days = obj.rutina.days;
  // Músculos: con "todo" se usan los del código; con "solo la rutina" se añaden los que te falten (por id)
  const mios = normalizarMusculos(prev.musculos);
  if (Array.isArray(obj.musculos) && obj.musculos.length) {
    const suyos = normalizarMusculos(obj.musculos);
    if (mode === 'todo') next.musculos = suyos;
    else next.musculos = mios.concat(suyos.filter((m) => !mios.some((x) => x.id === m.id)));
  } else if (mode === 'todo') {
    // Código antiguo (sin músculos): los de serie, más los tuyos que usen sus ejercicios
    const usados = {};
    Object.keys(exercises).forEach((id) => { usados[exercises[id].cat] = true; });
    next.musculos = MUSCULOS_POR_DEFECTO.map((m) => ({ ...m })).concat(mios.filter((m) => usados[m.id] && !MUSCULOS_POR_DEFECTO.some((d) => d.id === m.id)));
  } else next.musculos = mios;
  next.meta = { ...prev.meta, activeDay: obj.rutina.days.length ? obj.rutina.days[0].id : null };
  if (mode === 'todo') {
    if (obj.peso) next.peso = obj.peso;
    if (obj.nutricion) {
      next.nutricion = obj.nutricion.nutricion || prev.nutricion;
      next.formulario = { ...(obj.nutricion.formulario || prev.formulario), nombre: prev.formulario.nombre };
      next.comida = { ...prev.comida, plan: obj.nutricion.plan || prev.comida.plan };
    }
    if (obj.recetas) {
      // Un código de antes de la versión 8 no trae las recetas nuevas: se añaden (sin tocar las suyas)
      const antiguo = !(Number(obj.appVersion) >= 8);
      next.comida = { ...next.comida, recetas: antiguo ? anadirRecetasNuevas(obj.recetas) : obj.recetas, favoritos: obj.favoritos || [] };
    }
    if (obj.extra) {
      const x = obj.extra;
      if (x.cardio) next.cardio = x.cardio;
      if (x.diana) next.diana = x.diana;
      if (x.extras) next.extras = x.extras;
      next.comida = { ...next.comida, diario: x.diario || next.comida.diario, agua: x.agua || next.comida.agua, compra: x.compra || next.comida.compra };
      if (x.registro) next.registro = x.registro;
      if (x.medidas) next.medidas = x.medidas;
      if (x.fotosProgreso) next.fotosProgreso = x.fotosProgreso;
      // Preferencias: se traen las de la copia, pero los recordatorios se vuelven a programar en este móvil
      if (x.preferencias) next.preferencias = { ...x.preferencias, recordatorios: { ...(x.preferencias.recordatorios || {}), ids: (prev.preferencias && prev.preferencias.recordatorios && prev.preferencias.recordatorios.ids) || [] } };
    }
  }
  return migrateState({ ...next, version: APP_VERSION });
}
