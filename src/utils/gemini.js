/* =========================================================================
   GEMINI (opcional y GRATIS) — la IA de Google con tu propia clave de AI Studio.
   Todo lo que propone se REVISA antes de guardarse. Sin clave, la app funciona igual.

   La clave NO va dentro de tus datos (ni en copias, ni en lo que exportas o compartes):
   se guarda aparte en el móvil. Si el APK se compila con el Secret MIRUTINA_GEMINI_KEY,
   la app sale ya con ella puesta.
   ========================================================================= */

import { CATS, MOMENTOS, OBJETIVOS, catInfo } from '../data/catalog.js';
import { NUTRI_DB } from '../data/recetas.js';
import { macrosFromIngredientes } from './comida.js';
import { resumenSemana, sesionesDe, sugerenciaProgresion } from './entreno.js';
import { addDays, fmt, fromYmd, stripAcc, ymd } from './format.js';
import { effNutri, entryTotals, kcalOfMacros } from './health.js';
import { activeExerciseIds, computeScore, describeSet, muscleProgress, normalizeSet, weeklySets } from './training.js';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const ESPERA_MAX_MS = 75000; // 75 s: de sobra incluso para audios largos
const CLAVE_LS = 'mirutina_gemini_v1';

/* ---------- Configuración (clave y modelo), fuera del estado de la app ---------- */

const oyentes = new Set();
const claveCompilada = () => { try { return (import.meta.env && import.meta.env.VITE_GEMINI_CLAVE) || ''; } catch (e) { return ''; } };

export function leerConfig() {
  let c = {};
  try { c = JSON.parse(localStorage.getItem(CLAVE_LS) || '{}') || {}; } catch (e) { c = {}; }
  return { clave: typeof c.clave === 'string' && c.clave ? c.clave : claveCompilada(), modelo: typeof c.modelo === 'string' ? c.modelo : '', usar: c.usar !== false };
}
export function guardarConfig(patch) {
  const c = { ...leerConfig(), ...patch };
  try { localStorage.setItem(CLAVE_LS, JSON.stringify(c)); } catch (e) { /* sin almacenamiento */ }
  oyentes.forEach((f) => { try { f(c); } catch (e) { /* nada */ } });
  return c;
}
export function alCambiarConfig(f) { oyentes.add(f); return () => oyentes.delete(f); }
export function geminiActivo() { const c = leerConfig(); return !!(c.clave && c.usar); }

/* ---------- Llamadas ---------- */

async function pedir(url, opciones) {
  let r;
  // Tiempo máximo: si Gemini no contesta, se corta y se avisa (en vez de quedarse "pensando" para siempre)
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const reloj = ctrl ? setTimeout(() => ctrl.abort(), ESPERA_MAX_MS) : null;
  try { r = await fetch(url, ctrl ? { ...(opciones || {}), signal: ctrl.signal } : opciones); } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('Gemini no ha contestado a tiempo. Revisa tu conexión e inténtalo otra vez.');
    throw new Error('Sin conexión a internet (Gemini necesita internet).');
  } finally { if (reloj) clearTimeout(reloj); }
  let datos = null;
  try { datos = await r.json(); } catch (e) { datos = null; }
  if (!r.ok) {
    const msg = (datos && datos.error && datos.error.message) || ('Error ' + r.status);
    if (r.status === 400 && /api key/i.test(msg)) throw new Error('La clave de Gemini no es válida. Revísala en Ajustes.');
    if (r.status === 403) throw new Error('La clave no tiene permiso para Gemini. Crea otra en AI Studio.');
    if (r.status === 429) throw new Error('Has llegado al límite gratuito de Gemini por ahora. Prueba en un rato.');
    if (r.status === 404) throw new Error('Ese modelo ya no existe. En Ajustes pulsa "Probar" para elegir otro.');
    if (r.status >= 500) throw new Error('Gemini está saturado ahora mismo. Prueba en un momento.');
    throw new Error('Gemini: ' + msg);
  }
  return datos;
}

// Modelos "flash" (rápidos y con capa gratuita), el mejor primero
export async function listarModelos(clave) {
  const d = await pedir(API + '/models?pageSize=200&key=' + encodeURIComponent(clave));
  const lista = ((d && d.models) || [])
    .filter((m) => (m.supportedGenerationMethods || []).indexOf('generateContent') !== -1)
    .map((m) => String(m.name || '').replace(/^models\//, ''))
    .filter((n) => /^gemini/.test(n) && /flash/.test(n) && !/(tts|image|live|audio|embedding|vision|thinking|exp|preview|8b)/.test(n));
  const version = (n) => { const m = /gemini-(\d+(?:\.\d+)?)/.exec(n); return m ? Number(m[1]) : 0; };
  lista.sort((a, b) => version(b) - version(a) || (/lite/.test(a) ? 1 : 0) - (/lite/.test(b) ? 1 : 0) || a.length - b.length);
  return lista;
}

export function leerJSON(bruto) {
  const t = String(bruto || '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try { return JSON.parse(t); } catch (e) { /* sigue */ }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a !== -1 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { /* nada */ } }
  throw new Error('Gemini no ha devuelto una respuesta que se pueda leer. Inténtalo otra vez.');
}

// partes: [{ text } | { audio: base64, mime } | { imagen: base64 (o dataURL), mime }]
export async function generar(sistema, partes, temperatura) {
  const cfg = leerConfig();
  if (!cfg.clave) throw new Error('Falta la clave de Gemini (Ajustes → Gemini).');
  let modelo = cfg.modelo;
  if (!modelo) { const l = await listarModelos(cfg.clave); modelo = l[0] || 'gemini-flash-latest'; guardarConfig({ modelo }); }
  const parts = partes.filter(Boolean).map((p) => {
    if (p.audio) return { inline_data: { mime_type: p.mime || 'audio/wav', data: p.audio } };
    if (p.imagen) { const m = /^data:([^;]+);base64,(.*)$/.exec(p.imagen); return { inline_data: { mime_type: m ? m[1] : (p.mime || 'image/jpeg'), data: m ? m[2] : p.imagen } }; }
    return { text: String(p.text || '') };
  });
  const d = await pedir(API + '/models/' + encodeURIComponent(modelo) + ':generateContent?key=' + encodeURIComponent(cfg.clave), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: sistema }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: typeof temperatura === 'number' ? temperatura : 0.3, responseMimeType: 'application/json' },
    }),
  });
  const c = (((d && d.candidates) || [])[0] || {}).content;
  const bruto = c && Array.isArray(c.parts) ? c.parts.map((p) => p.text || '').join('') : '';
  if (!bruto) throw new Error('Gemini no ha respondido nada. Inténtalo otra vez.');
  return leerJSON(bruto);
}

/* ---------- Utilidades ---------- */

const n0 = (x) => { const v = typeof x === 'string' ? Number(x.replace(',', '.')) : Number(x); return isFinite(v) ? v : null; };
const pos = (x) => { const v = n0(x); return v !== null && v >= 0 ? v : null; };
const r1 = (x) => Math.round(x * 10) / 10;
const txt = (x, max) => (typeof x === 'string' ? x.trim().slice(0, max || 400) : '');
const lista = (x, max) => (Array.isArray(x) ? x.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean).slice(0, max || 8) : []);
const clave = (s) => stripAcc(s).toLowerCase().replace(/\s+/g, ' ').trim();
const BASE_COMUN = 'Eres el entrenador personal y nutricionista de la app "Mi Rutina". Hablas español de España, cercano y directo, sin rodeos. No das consejos médicos; si algo puede ser una lesión, recomienda consultarlo. Responde SOLO con el JSON que se pide.';

export function momentoPorHora(d) {
  const h = (d || new Date()).getHours();
  return h < 11 ? 'desayuno' : h < 17 ? 'comida' : h < 20 ? 'snack' : 'cena';
}

/* =========================================================================
   1) RECETAS a la medida de tus macros
   ========================================================================= */

const INGREDIENTES = Object.keys(NUTRI_DB);
const MAPA_ING = {};
INGREDIENTES.forEach((k) => { MAPA_ING[clave(k)] = k; });
export function buscarIngrediente(nombre) { return MAPA_ING[clave(nombre)] || null; }

export function contextoNutricion(state, fecha) {
  const { plan, obj, n } = effNutri(state);
  const tot = entryTotals((state.comida.diario || {})[fecha] || []);
  const lineas = ['Objetivo: ' + obj.label + '.'];
  if (!plan.falta) {
    lineas.push('Su plan diario: ' + Math.round(plan.kcal) + ' kcal · proteína ' + Math.round(plan.protG) + ' g · hidratos ' + Math.round(plan.carbG) + ' g · grasas ' + Math.round(plan.fatG) + ' g.');
    lineas.push('Lleva hoy: ' + Math.round(tot.kcal) + ' kcal · P ' + Math.round(tot.p) + ' · H ' + Math.round(tot.c) + ' · G ' + Math.round(tot.g) + '. Le falta: ' + Math.max(0, Math.round(plan.kcal - tot.kcal)) + ' kcal · P ' + Math.max(0, Math.round(plan.protG - tot.p)) + ' · H ' + Math.max(0, Math.round(plan.carbG - tot.c)) + ' · G ' + Math.max(0, Math.round(plan.fatG - tot.g)) + '.');
  } else lineas.push('No ha rellenado la calculadora nutricional: guíate por el objetivo y recetas altas en proteína.');
  return { texto: lineas.join('\n'), plan, tot, objetivo: n.objetivo };
}

export function instruccionesRecetas(state, fecha) {
  const ctx = contextoNutricion(state, fecha);
  const ings = INGREDIENTES.map((k) => k + ' (' + (NUTRI_DB[k].per100 ? 'g' : 'ud') + ')').join(', ');
  return [
    BASE_COMUN,
    ctx.texto,
    'Crea recetas fitness ricas, fáciles y con ingredientes de supermercado español. Cantidades para UNA ración.',
    'Usa siempre que puedas estos ingredientes con su nombre EXACTO y su unidad (g/ml o ud), así la app calcula los macros sola: ' + ings + '.',
    'Si usas otro ingrediente, ponle un nombre normal y unidad g, ml, ud, cda o cdta.',
    'Recetas existentes (no las repitas): ' + (state.comida.recetas || []).map((r) => r.nombre).slice(0, 120).join('; ') + '.',
    'Devuelve: {"recetas":[{"nombre":"","tipo":"desayuno|comida|cena|snack","objetivos":["volumen|definicion|mantenimiento"],"ingredientes":[{"n":"nombre","q":150,"u":"g"}],"pasos":["paso corto"],"p":40,"c":50,"g":12,"por_que":"una frase de por qué encaja con sus macros"}]}',
    'p, c y g son gramos de proteína, hidratos y grasas de la ración. Calcúlalos bien.',
  ].join('\n');
}

export function normalizarRecetas(json) {
  const out = [];
  (Array.isArray(json && json.recetas) ? json.recetas : []).forEach((r) => {
    if (!r || typeof r !== 'object' || !txt(r.nombre)) return;
    const ingredientes = (Array.isArray(r.ingredientes) ? r.ingredientes : []).filter((x) => x && txt(x.n)).map((x) => {
      const exacto = buscarIngrediente(x.n);
      let u = txt(x.u, 12).toLowerCase() || 'g';
      if (exacto && NUTRI_DB[exacto].per100 && ['g', 'ml', 'cda', 'cdta'].indexOf(u) === -1) u = 'g';
      if (exacto && !NUTRI_DB[exacto].per100) u = ['ud', 'lata', 'diente', 'cdta', 'cda', 'porción', 'pizca'].indexOf(u) !== -1 ? u : 'ud';
      return { n: exacto || txt(x.n, 60), q: pos(x.q), u };
    });
    if (!ingredientes.length) return;
    const calc = macrosFromIngredientes(ingredientes);
    const exactos = !calc.desconocidos.length;
    const p = exactos ? calc.p : Math.round(pos(r.p) || 0);
    const c = exactos ? calc.c : Math.round(pos(r.c) || 0);
    const g = exactos ? calc.g : Math.round(pos(r.g) || 0);
    const tipo = ['desayuno', 'comida', 'cena', 'snack'].indexOf(r.tipo) !== -1 ? r.tipo : 'comida';
    const objetivos = lista(r.objetivos, 3).filter((o) => OBJETIVOS[o]);
    out.push({ nombre: txt(r.nombre, 70), tipo, objetivos, ingredientes, pasos: lista(r.pasos, 12), p, c, g, porQue: txt(r.por_que, 200), calculados: exactos });
  });
  return out.slice(0, 4);
}

export async function generarRecetas(state, { peticion, tipo, cuantas, cerrarDia, fecha }) {
  const f = fecha || ymd(new Date());
  const pide = [
    'Quiero ' + (cuantas || 2) + ' receta(s)' + (tipo && tipo !== 'cualquiera' ? ' de ' + tipo : '') + '.',
    cerrarDia ? 'Que sirvan para COMPLETAR lo que me falta hoy (que entre en lo que me falta sin pasarme).' : '',
    peticion ? 'Lo que me apetece / lo que tengo en casa: ' + peticion : '',
  ].filter(Boolean).join(' ');
  const json = await generar(instruccionesRecetas(state, f), [{ text: pide }], 0.8);
  const recetas = normalizarRecetas(json);
  if (!recetas.length) throw new Error('No ha salido ninguna receta. Prueba a pedirlo de otra forma.');
  return recetas;
}

/* =========================================================================
   2) COMIDA por foto (etiqueta o plato), voz o texto → al diario
   ========================================================================= */

export function instruccionesComida(state, fecha) {
  return [
    BASE_COMUN,
    'Apunta lo que ha comido en su diario. Puede mandarte una FOTO (etiqueta nutricional, plato o envase), un AUDIO o un texto.',
    'Si es una ETIQUETA: lee los valores por 100 g/ml en "por100". Si dice cuánto ha comido o se ve el peso del envase/ración, pon "gramos"; si no, deja gramos en null y pon en dudas que diga cuánto.',
    'Si es un PLATO o lo dice de palabra: estima la ración con sentido común (dilo en "cantidad") y sus macros totales.',
    'Momentos válidos: ' + MOMENTOS.map((m) => m[0]).join(', ') + '. Si no lo dice, usa "' + momentoPorHora() + '".',
    contextoNutricion(state, fecha).texto,
    'Devuelve: {"transcripcion":"lo que ha dicho si era audio","comidas":[{"nombre":"","momento":"","cantidad":"ej. 1 plato, 200 g","gramos":null,"por100":{"kcal":0,"p":0,"c":0,"g":0},"kcal":0,"p":0,"c":0,"g":0}],"dudas":[""],"consejo":"una frase opcional sobre cómo cuadra con su día"}',
    'por100 solo si lo has leído de una etiqueta; si no, null. kcal/p/c/g son los TOTALES de lo que ha comido.',
  ].join('\n');
}

export function escalarPor100(por100, gramos) {
  const k = gramos / 100;
  return { kcal: Math.round(por100.kcal * k), p: r1(por100.p * k), c: r1(por100.c * k), g: r1(por100.g * k) };
}

export function normalizarComidas(json) {
  const momentos = MOMENTOS.map((m) => m[0]);
  const comidas = (Array.isArray(json && json.comidas) ? json.comidas : []).filter((x) => x && txt(x.nombre)).map((x) => {
    const p100 = x.por100 && typeof x.por100 === 'object' && [x.por100.p, x.por100.c, x.por100.g].some((v) => pos(v) !== null)
      ? { p: pos(x.por100.p) || 0, c: pos(x.por100.c) || 0, g: pos(x.por100.g) || 0, kcal: pos(x.por100.kcal) } : null;
    if (p100 && !p100.kcal) p100.kcal = kcalOfMacros(p100.p, p100.c, p100.g);
    const gramos = pos(x.gramos);
    let m = { kcal: pos(x.kcal), p: pos(x.p) || 0, c: pos(x.c) || 0, g: pos(x.g) || 0 };
    if (p100 && gramos) m = escalarPor100(p100, gramos);
    if (!m.kcal) m.kcal = kcalOfMacros(m.p, m.c, m.g);
    return {
      nombre: txt(x.nombre, 60), momento: momentos.indexOf(x.momento) !== -1 ? x.momento : momentoPorHora(),
      cantidad: txt(x.cantidad, 40), gramos, por100: p100, kcal: Math.round(m.kcal), p: r1(m.p), c: r1(m.c), g: r1(m.g),
    };
  });
  return { comidas: comidas.slice(0, 12), transcripcion: txt(json && json.transcripcion, 2000), dudas: lista(json && json.dudas, 5), consejo: txt(json && json.consejo, 300) };
}

export async function entenderComida(state, { texto, audio, foto, fecha }) {
  const partes = [];
  if (foto) partes.push({ imagen: foto }, { text: 'Esta foto es lo que he comido (o su etiqueta).' });
  if (audio) partes.push({ audio, mime: 'audio/wav' }, { text: 'Este audio es lo que te digo: transcríbelo y apúntalo.' });
  if (texto) partes.push({ text: texto });
  if (!partes.length) throw new Error('Haz una foto, graba un audio o escribe lo que has comido.');
  const r = normalizarComidas(await generar(instruccionesComida(state, fecha || ymd(new Date())), partes, 0.2));
  if (!r.comidas.length) throw new Error(r.dudas[0] || 'No he encontrado ninguna comida. Prueba otra vez.');
  return r;
}

/* =========================================================================
   3) ENTRENO hablando → series de cada ejercicio
   ========================================================================= */

export function contextoEntreno(state, dayId) {
  const day = (state.days || []).find((d) => d.id === dayId) || (state.days || [])[0];
  const delDia = day ? day.ids.filter((id) => state.exercises[id]) : [];
  const otros = activeExerciseIds(state).filter((id) => delDia.indexOf(id) === -1);
  const linea = (id) => {
    const ex = state.exercises[id];
    const ult = (ex.history || []).filter((h) => h && !h.seed && h.sets && h.sets.length).slice(-1)[0];
    return '- ' + id + ' = "' + ex.name + '" · series de la rutina: ' + (ex.currentSets || []).map((s, i) => (i + 1) + ') ' + describeSet(s)).join(', ') + (ult ? ' · última vez: ' + ult.sets.map(describeSet).join(', ') : '');
  };
  return { day, delDia, texto: 'Ejercicios del día "' + (day ? day.label : '') + '":\n' + delDia.map(linea).join('\n') + (otros.length ? '\nOtros ejercicios de su rutina: \n' + otros.map(linea).join('\n') : '') };
}

export function instruccionesEntreno(state, dayId, hoy) {
  const c = contextoEntreno(state, dayId);
  return [
    BASE_COMUN,
    'Te cuenta (audio o texto) el entreno que ha hecho y tú lo apuntas. Hoy es ' + hoy + '.',
    c.texto,
    'Empareja cada ejercicio con su id (aunque lo diga con otras palabras: "press banca" = press de banca, "jalón" = jalón al pecho…). Si dice un ejercicio que no está en la lista, ponlo en dudas.',
    'Cada serie: kg (número, null si es sin peso) y reps. Si dice "3 series de 10 con 60", son 3 series iguales. Si hace calentamiento y lo dice, tipo "warm". Rest-pause: "tandas":[reps,...]; dropset: "drops":[{"kg":0,"reps":0}].',
    'Si solo dice "igual que la última vez" en un ejercicio, copia las series de la última vez.',
    'Si dice que fue otro día ("ayer…"), pon la fecha AAAA-MM-DD.',
    'Devuelve: {"transcripcion":"","fecha":"AAAA-MM-DD","ejercicios":[{"id":"","series":[{"kg":60,"reps":8,"tipo":"top|backoff|warm|rp|drop","tandas":null,"drops":null}],"nota":""}],"dudas":[""]}',
  ].join('\n');
}

export function normalizarEntreno(json, state, hoy) {
  const ids = Object.keys(state.exercises || {});
  const porNombre = {};
  ids.forEach((id) => { porNombre[clave(state.exercises[id].name)] = id; });
  const fechaOk = typeof (json && json.fecha) === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(json.fecha) && json.fecha <= hoy ? json.fecha : hoy;
  const vistos = {};
  const ejercicios = [];
  (Array.isArray(json && json.ejercicios) ? json.ejercicios : []).forEach((e) => {
    if (!e) return;
    const id = state.exercises[e.id] ? e.id : porNombre[clave(e.id || e.nombre || '')];
    if (!id || vistos[id]) return;
    const actuales = state.exercises[id].currentSets || [];
    const series = (Array.isArray(e.series) ? e.series : []).filter(Boolean).slice(0, 12).map((s, i) => {
      const prev = actuales[i];
      let tipo = ['top', 'backoff', 'warm', 'rp', 'drop'].indexOf(s.tipo) !== -1 ? s.tipo : null;
      if (Array.isArray(s.tandas) && s.tandas.length > 1) tipo = 'rp';
      if (Array.isArray(s.drops) && s.drops.length > 1) tipo = 'drop';
      if (!tipo) tipo = prev && ['top', 'backoff', 'warm'].indexOf(prev.tipo) !== -1 ? prev.tipo : (i === 0 ? 'top' : 'backoff');
      const base = { tipo, weight: pos(s.kg), reps: pos(s.reps), nota: prev && prev.nota ? prev.nota : null };
      if (tipo === 'rp') base.tandas = (Array.isArray(s.tandas) ? s.tandas : [s.reps, null]).map(pos);
      if (tipo === 'drop') base.drops = (Array.isArray(s.drops) ? s.drops : [{ kg: s.kg, reps: s.reps }, {}]).map((d) => ({ weight: pos(d && d.kg), reps: pos(d && d.reps) }));
      return normalizeSet(base, i);
    }).filter((s) => s.reps !== null || s.weight !== null || s.tipo === 'rp' || s.tipo === 'drop');
    if (!series.length) return;
    vistos[id] = true;
    ejercicios.push({ id, nombre: state.exercises[id].name, series, nota: txt(e.nota, 200) });
  });
  return { fecha: fechaOk, ejercicios, transcripcion: txt(json && json.transcripcion, 3000), dudas: lista(json && json.dudas, 6) };
}

export async function entenderEntreno(state, dayId, { texto, audio }) {
  const hoy = ymd(new Date());
  const partes = [];
  if (audio) partes.push({ audio, mime: 'audio/wav' }, { text: 'Este audio es mi entreno: transcríbelo y apúntalo.' });
  if (texto) partes.push({ text: texto });
  if (!partes.length) throw new Error('Graba un audio o escribe lo que has hecho.');
  const r = normalizarEntreno(await generar(instruccionesEntreno(state, dayId, hoy), partes, 0.1), state, hoy);
  if (!r.ejercicios.length) throw new Error(r.dudas[0] || 'No he reconocido ningún ejercicio de tu rutina. Prueba diciendo el nombre del ejercicio, el peso y las repeticiones.');
  return r;
}

// Guarda las series: pasan a ser las series actuales del ejercicio y se añade el registro al historial
export function aplicarEntreno(state, resultado, ahora) {
  const hoy = ymd(ahora || new Date());
  const fechaISO = resultado.fecha && resultado.fecha !== hoy ? new Date(fromYmd(resultado.fecha).getTime() + 12 * 3600 * 1000).toISOString() : (ahora || new Date()).toISOString();
  const exercises = { ...state.exercises };
  let records = 0;
  resultado.ejercicios.forEach((e) => {
    const ex = exercises[e.id];
    if (!ex || !e.series.length) return;
    const sets = e.series.map((s, i) => normalizeSet(s, i));
    const hist = ex.history || [];
    const mejor = hist.reduce((m, h) => Math.max(m, computeScore(h.sets && h.sets[0])), 0);
    if (computeScore(sets[0]) > mejor && computeScore(sets[0]) > 0 && hist.length) records += 1;
    const entrada = { date: fechaISO, sets: JSON.parse(JSON.stringify(sets)) };
    const nuevaHist = hist.concat([entrada]).sort((a, b) => ((a.seed ? 0 : 1) - (b.seed ? 0 : 1)) || (new Date(a.date) - new Date(b.date)));
    exercises[e.id] = { ...ex, currentSets: sets, history: nuevaHist };
  });
  return { state: { ...state, exercises }, records };
}

/* =========================================================================
   4) REPASO SEMANAL
   ========================================================================= */

export function datosRepaso(state, hoyDate) {
  const hoy = hoyDate || new Date();
  const lunes = ymd(addDays(hoy, -((hoy.getDay() + 6) % 7)));
  const esta = resumenSemana(state, lunes);
  const ant = resumenSemana(state, ymd(addDays(fromYmd(lunes), -7)));
  const hace7 = addDays(hoy, -7);
  const sesiones = sesionesDe(state).filter((s) => fromYmd(s.fecha) >= addDays(hace7, -7));
  const ejercicios = activeExerciseIds(state).map((id) => {
    const ex = state.exercises[id];
    const regs = (ex.history || []).filter((h) => h && !h.seed && h.sets && h.sets[0]);
    const ult = regs.slice(-4).map((h) => computeScore(h.sets[0]));
    const estancado = ult.length >= 3 && Math.max(...ult.slice(1)) <= ult[0];
    return { nombre: ex.name, musculo: catInfo(CATS, ex.cat).label, ultimas: regs.slice(-3).map((h) => describeSet(h.sets[0])), estancado, sugerencia: sugerenciaProgresion(ex).texto };
  });
  const plan = weeklySets(state);
  const estados = (state.diana && state.diana.estados) || {};
  const musculos = Object.keys(plan).filter((k) => plan[k] > 0 || estados[k]).map((k) => catInfo(CATS, k).label + ': ' + fmt(plan[k] || 0) + ' series/sem' + (estados[k] ? ' (' + estados[k] + ')' : ''));
  const pesos = ((state.peso && state.peso.historial) || []).slice(-8).map((r) => r.date.slice(0, 10) + ' ' + fmt(r.kg, 1) + ' kg');
  const { plan: pn, obj } = effNutri(state);
  const diasComida = [];
  for (let i = 1; i <= 7; i++) { const k = ymd(addDays(hoy, -i)); const l = (state.comida.diario || {})[k]; if (l && l.length) diasComida.push(entryTotals(l)); }
  const media = (k) => (diasComida.length ? Math.round(diasComida.reduce((a, d) => a + d[k], 0) / diasComida.length) : null);
  const cardio = (state.cardio || []).filter((c) => c && c.name).map((c) => c.name + (c.frecuencia ? ' (' + c.frecuencia + ')' : ''));
  return {
    semana: lunes, esta, ant, ejercicios, musculos, pesos, cardio,
    objetivoPeso: state.peso && state.peso.objetivoKg ? state.peso.objetivoKg : null,
    nutricion: { objetivo: obj.label, plan: pn.falta ? null : { kcal: Math.round(pn.kcal), prot: Math.round(pn.protG) }, diasApuntados: diasComida.length, kcalMedia: media('kcal'), protMedia: media('p') },
    sesiones: sesiones.map((s) => s.fecha + ': ' + s.ejercicios.map((e) => e.nombre + ' ' + e.sets.filter((x) => x.tipo !== 'warm').map(describeSet).join(' / ')).join('; ')),
    objetivoDias: (state.preferencias && state.preferencias.objetivoDiasSemana) || 3,
  };
}

export function normalizarRepaso(json) {
  const punt = n0(json && json.puntuacion);
  return {
    titular: txt(json && json.titular, 140) || 'Tu semana',
    puntuacion: punt !== null ? Math.max(1, Math.min(10, Math.round(punt))) : null,
    bien: lista(json && json.bien, 5), mejorar: lista(json && json.mejorar, 5), plan: lista(json && json.plan, 5),
    ejercicios: (Array.isArray(json && json.ejercicios) ? json.ejercicios : []).filter((e) => e && txt(e.nombre) && txt(e.consejo)).slice(0, 6).map((e) => ({ nombre: txt(e.nombre, 60), consejo: txt(e.consejo, 240) })),
  };
}

export async function repasoSemanal(state) {
  const d = datosRepaso(state);
  const sistema = [
    BASE_COMUN,
    'Haz el REPASO SEMANAL de su entrenamiento con estos datos (JSON). Sé concreto: cita ejercicios, números y días. Si hay pocos datos, dilo y anímale a apuntar más.',
    'Valora: días entrenados frente a su objetivo de ' + d.objetivoDias + ' días, progresión (ejercicios estancados), volumen por músculo (10–20 series/semana suele ir bien para crecer), sus puntos débiles, peso frente a su objetivo, comida (proteína y calorías frente a su plan), sueño y energía.',
    'Devuelve: {"titular":"una frase","puntuacion":7,"bien":["…"],"mejorar":["…"],"plan":["3 acciones concretas para la semana que viene"],"ejercicios":[{"nombre":"","consejo":"qué hacer la próxima sesión"}]}',
  ].join('\n');
  return { ...normalizarRepaso(await generar(sistema, [{ text: JSON.stringify(d) }], 0.5)), semana: d.semana, fecha: new Date().toISOString() };
}

/* =========================================================================
   5) DIANA FÍSICA → qué hacer SOLO con tus puntos débiles
   Los consejos se guardan por músculo. Si un músculo deja de ser débil, su consejo
   desaparece; si cambias la diana de otra forma, se rehacen solos.
   ========================================================================= */

export function firmaDiana(state) {
  const e = (state.diana && state.diana.estados) || {};
  return Object.keys(e).filter((k) => e[k]).sort().map((k) => k + ':' + e[k]).join('|');
}
export function debilesDe(state) {
  const e = (state.diana && state.diana.estados) || {};
  return Object.keys(e).filter((k) => e[k] === 'debil' && CATS[k]);
}

// ¿Hace falta pedir consejos nuevos? No, si lo único que ha cambiado es que algún débil ya no lo es
// (su consejo simplemente se deja de enseñar). Sí, en cualquier otro cambio.
export function hayQueRehacerDiana(guardado, state) {
  const deb = debilesDe(state);
  if (!deb.length) return false;
  if (!guardado || !guardado.estados) return true;
  const ahora = (state.diana && state.diana.estados) || {};
  const antes = guardado.estados;
  const claves = {};
  Object.keys(ahora).concat(Object.keys(antes)).forEach((k) => { claves[k] = true; });
  return Object.keys(claves).some((k) => {
    const a = antes[k] || null, b = ahora[k] || null;
    if (a === b) return false;
    return !(a === 'debil' && b !== 'debil');
  }) || deb.some((k) => !(guardado.porMusculo || {})[k]);
}

export function datosDiana(state) {
  const estados = (state.diana && state.diana.estados) || {};
  const plan = weeklySets(state);
  const prog = muscleProgress(state);
  const enDias = {};
  (state.days || []).forEach((d) => d.ids.forEach((id) => { (enDias[id] = enDias[id] || []).push(d.label); }));
  const musculo = (k) => ({
    id: k, nombre: catInfo(CATS, k).label, titulo: (state.diana.titulos || {})[k] || '', seriesSemana: plan[k] || 0,
    progresoObjetivos: prog[k] && prog[k].pct !== null ? Math.round(prog[k].pct) + ' %' : null,
    ejercicios: activeExerciseIds(state).filter((id) => state.exercises[id].cat === k).map((id) => {
      const ex = state.exercises[id];
      return { nombre: ex.name, dias: enDias[id] || [], series: (ex.currentSets || []).map(describeSet), estancado: !!sugerenciaProgresion(ex).aviso };
    }),
  });
  const por = (est) => Object.keys(estados).filter((k) => estados[k] === est && CATS[k]).map((k) => catInfo(CATS, k).label);
  return {
    debiles: debilesDe(state).map(musculo), intermedios: por('intermedio'), fuertes: por('fuerte'),
    dias: (state.days || []).map((d) => ({ id: d.id, nombre: d.label, ejercicios: d.ids.filter((id) => state.exercises[id]).map((id) => state.exercises[id].name + ' (' + catInfo(CATS, state.exercises[id].cat).label + ')') })),
    sexo: state.formulario && state.formulario.sexo, objetivo: effNutri(state).obj.label,
  };
}

export function normalizarDiana(json, state) {
  const dias = (state.days || []).map((d) => d.id);
  const deb = debilesDe(state);
  const porMusculo = {};
  (Array.isArray(json && json.consejos) ? json.consejos : []).forEach((c) => {
    if (!c || deb.indexOf(c.musculo) === -1 || porMusculo[c.musculo]) return;
    porMusculo[c.musculo] = {
      titulo: txt(c.titulo, 80) || catInfo(CATS, c.musculo).label,
      porQue: txt(c.por_que, 300), acciones: lista(c.acciones, 5),
      ejercicios: (Array.isArray(c.ejercicios) ? c.ejercicios : []).filter((e) => e && txt(e.nombre)).slice(0, 3).map((e) => ({
        nombre: txt(e.nombre, 60), pauta: txt(e.pauta, 60), dia: dias.indexOf(e.dia) !== -1 ? e.dia : null,
      })),
    };
  });
  return { general: txt(json && json.general, 400), porMusculo };
}

export async function consejosDiana(state) {
  const d = datosDiana(state);
  if (!d.debiles.length) throw new Error('Marca primero algún músculo como punto débil.');
  const sistema = [
    BASE_COMUN,
    'Mira su Diana física y dale consejos SOLO para los músculos que ha marcado como PUNTO DÉBIL (no des consejos de los demás; los fuertes e intermedios son solo contexto para no quitarles volumen ni pasarte en esos días).',
    'Para cada punto débil: por qué puede estar flojo (pocas series, poca frecuencia, ejercicio que no le va, estancado…), 2-4 acciones concretas que pueda aplicar ya en su rutina (series por semana, frecuencia, técnica, rango de reps, orden en el día) y hasta 2 ejercicios que añadir o cambiar, con su pauta (ej. "3×10-12") y el id del día de su rutina donde encajarían mejor.',
    'Devuelve: {"general":"una frase","consejos":[{"musculo":"id","titulo":"","por_que":"","acciones":[""],"ejercicios":[{"nombre":"","pauta":"3×10-12","dia":"id del día"}]}]}',
  ].join('\n');
  const r = normalizarDiana(await generar(sistema, [{ text: JSON.stringify(d) }], 0.5), state);
  if (!Object.keys(r.porMusculo).length) throw new Error('Gemini no ha dado consejos esta vez. Pulsa "Actualizar" para intentarlo otra vez.');
  return { ...r, estados: { ...((state.diana && state.diana.estados) || {}) }, fecha: new Date().toISOString() };
}

/* =========================================================================
   5b) CARDIO a tu medida (cuestionario → propuestas que puedes añadir)
   ========================================================================= */

export const CARDIO_INTENSIDAD = [['suave', '🌿 Suave'], ['moderado', '🚶 Moderado'], ['intenso', '🔥 Intenso'], ['agresivo', '⚡ Muy intenso']];
export const CARDIO_OBJETIVO = [['grasa', 'Perder grasa'], ['resistencia', 'Más resistencia'], ['salud', 'Salud del corazón'], ['rendimiento', 'Rendimiento / explosividad'], ['recuperacion', 'Recuperación activa']];
export const CARDIO_MATERIAL = ['Cinta', 'Bici estática', 'Elíptica', 'Remo', 'Escaladora / escaleras', 'Assault bike', 'Comba', 'Al aire libre', 'En casa sin material', 'Piscina'];

export function normalizarCardio(json) {
  const props = (Array.isArray(json && json.propuestas) ? json.propuestas : []).filter((p) => p && txt(p.nombre)).slice(0, 6).map((p) => ({
    nombre: txt(p.nombre, 60), modalidad: txt(p.modalidad, 40), metodo: txt(p.metodo, 40), intensidad: txt(p.intensidad, 30),
    duracion: pos(p.duracion_min), frecuencia: txt(p.frecuencia, 60), detalle: lista(p.detalle, 10), porQue: txt(p.por_que, 240), cuando: txt(p.cuando, 120),
  }));
  return { resumen: txt(json && json.resumen, 400), propuestas: props, avisos: lista(json && json.avisos, 3) };
}

// Lo que se guarda en tu pestaña Cardio al pulsar "Añadir"
export function cardioParaGuardar(p) {
  const cab = [p.metodo, p.duracion ? Math.round(p.duracion) + ' min' : '', p.intensidad].filter(Boolean).join(' · ');
  return { name: p.nombre, frecuencia: p.frecuencia || '', detalle: [cab].concat(p.detalle.map((x) => '• ' + x)).concat(p.cuando ? ['🕒 ' + p.cuando] : []).filter(Boolean).join('\n') };
}

export async function recomendarCardio(state, cuest) {
  const pesas = (state.days || []).map((d) => d.label);
  const sistema = [
    BASE_COMUN,
    'Diseña su CARDIO según su cuestionario. Da entre 4 y 6 propuestas DISTINTAS: varía la modalidad (cinta, bici, remo, elíptica, escaleras, comba, aire libre…) y el método (LISS / zona 2, MISS, HIIT, intervalos, Tabata, fartlek, cuestas, circuito metabólico, EMOM…), siempre respetando la intensidad que pide (si pide suave, nada de HIIT).',
    'Cada propuesta: nombre corto, modalidad, método, intensidad (con % FC máx o RPE 1-10), duración en minutos, frecuencia semanal, detalle paso a paso con calentamiento, bloques/intervalos con tiempos, velocidades o inclinaciones orientativas, y vuelta a la calma, por qué le sirve, y cuándo hacerlo respecto a sus pesas (para no comprometer la fuerza ni la recuperación de piernas).',
    'Contexto: entrena pesas ' + pesas.length + ' días (' + pesas.join(', ') + '), objetivo de físico: ' + effNutri(state).obj.label + ', cardio que ya tiene: ' + ((state.cardio || []).map((c) => c.name + ' ' + (c.frecuencia || '')).join('; ') || 'ninguno') + '.',
    'Devuelve: {"resumen":"1-2 frases","propuestas":[{"nombre":"","modalidad":"","metodo":"","intensidad":"","duracion_min":25,"frecuencia":"2 días/semana","detalle":["5 min calentamiento a…"],"por_que":"","cuando":""}],"avisos":[""]}',
  ].join('\n');
  const pide = 'Mi cuestionario: ' + JSON.stringify({
    intensidad: cuest.intensidad, objetivo: cuest.objetivo, minutos_por_sesion: cuest.minutos, dias_por_semana: cuest.dias,
    material_disponible: cuest.material && cuest.material.length ? cuest.material : 'cualquiera', notas: cuest.nota || '',
  });
  const r = normalizarCardio(await generar(sistema, [{ text: pide }], 0.8));
  if (!r.propuestas.length) throw new Error('No han salido propuestas. Prueba otra vez.');
  return r;
}

/* =========================================================================
   5c) PLAN SEMANAL de comidas con tus recetas
   ========================================================================= */

export function normalizarPlanSemana(json, state) {
  const ids = {};
  (state.comida.recetas || []).forEach((r) => { ids[r.id] = r; });
  const momentos = MOMENTOS.map((m) => m[0]);
  const dias = {};
  (Array.isArray(json && json.dias) ? json.dias : []).forEach((d) => {
    const i = n0(d && d.dia);
    if (i === null || i < 0 || i > 6 || dias[i]) return;
    const out = { desayuno: [], comida: [], cena: [], snack: [] };
    (Array.isArray(d.comidas) ? d.comidas : []).forEach((c) => {
      if (!c || !ids[c.receta] || momentos.indexOf(c.momento) === -1) return;
      const rac = Math.max(0.5, Math.min(3, Math.round((n0(c.raciones) || 1) * 2) / 2));
      out[c.momento].push({ recetaId: c.receta, raciones: rac });
    });
    if (momentos.some((m) => out[m].length)) dias[i] = out;
  });
  return { dias, consejo: txt(json && json.consejo, 300) };
}

export async function planSemanal(state, { peticion, dias }) {
  const { plan, obj } = effNutri(state);
  const fav = state.comida.favoritos || [];
  const recetas = (state.comida.recetas || []).map((r) => r.id + ' | ' + r.nombre + ' | ' + r.tipo + ' | P' + r.p + ' H' + r.c + ' G' + r.g + ' | ' + kcalOfMacros(r.p, r.c, r.g) + ' kcal' + (fav.indexOf(r.id) !== -1 ? ' | ⭐favorita' : ''));
  const sistema = [
    BASE_COMUN,
    'Monta su plan de comidas de la semana usando SOLO sus recetas (por id). Días: 0 = lunes … 6 = domingo. Momentos: desayuno, comida, cena, snack.',
    plan.falta ? 'No tiene calculadora rellena: objetivo ' + obj.label + ', unas 2.200 kcal y mucha proteína.' : 'Cada día debe acercarse a ' + Math.round(plan.kcal) + ' kcal, ' + Math.round(plan.protG) + ' g de proteína, ' + Math.round(plan.carbG) + ' g de hidratos y ' + Math.round(plan.fatG) + ' g de grasa (±7 %). Ajusta con raciones de 0,5 en 0,5.',
    'Varía las recetas, prioriza las favoritas y repite como mucho 2 veces la misma comida principal en la semana para que la compra sea sencilla.',
    'Recetas (id | nombre | tipo | macros por ración | kcal): \n' + recetas.join('\n'),
    'Devuelve: {"dias":[{"dia":0,"comidas":[{"momento":"desayuno","receta":"id","raciones":1}]}],"consejo":"una frase"}',
  ].join('\n');
  const pide = 'Planifica estos días: ' + (dias && dias.length ? dias.join(', ') : '0,1,2,3,4,5,6') + '.' + (peticion ? ' Preferencias: ' + peticion : '');
  const r = normalizarPlanSemana(await generar(sistema, [{ text: pide }], 0.6), state);
  if (!Object.keys(r.dias).length) throw new Error('No ha salido ningún día. Prueba otra vez.');
  return r;
}

/* =========================================================================
   5d) LISTA DE LA COMPRA → dónde comprar cada cosa (precio y calidad)
   ========================================================================= */

// Los supermercados que él usa: son los únicos que se recomiendan
export const SUPERS = ['Aldi', 'Mercadona', 'Alcampo', 'Carrefour'];

export function firmaCompra(items) { return items.map((x) => x.key).sort().join(','); }

export function normalizarCompra(json, items) {
  const porClave = {};
  items.forEach((x) => { porClave[clave(x.nombre)] = x.key; });
  const productos = {};
  (Array.isArray(json && json.productos) ? json.productos : []).forEach((p) => {
    if (!p) return;
    const k = porClave[clave(p.producto)];
    if (!k || productos[k]) return;
    productos[k] = { super: txt(p.super, 40), precio: txt(p.precio_aprox, 40), consejo: txt(p.consejo, 160) };
  });
  const supers = (Array.isArray(json && json.supers) ? json.supers : []).filter((x) => x && txt(x.nombre)).slice(0, 5).map((x) => ({
    nombre: txt(x.nombre, 40), que: lista(x.que_comprar, 30), porQue: txt(x.por_que, 200),
  }));
  return { resumen: txt(json && json.resumen, 400), supers, productos, total: txt(json && json.total_aprox, 60), consejos: lista(json && json.consejos, 4) };
}

export async function dondeComprar(state, items, zona) {
  if (!items.length) throw new Error('La lista de la compra está vacía.');
  const sistema = [
    BASE_COMUN,
    'Eres experto en hacer la compra barata en España sin perder calidad. Para cada producto de su lista, di en qué supermercado le conviene comprarlo (mejor relación calidad-precio), un precio aproximado y un consejo corto (marca blanca que merece la pena, formato, congelado vs fresco…).',
    'Su zona: ' + (zona || 'Madrid') + '. SOLO puedes recomendar estos supermercados: ' + SUPERS.join(', ') + '. No nombres ningún otro.',
    'Sé lista: Aldi suele ser lo más barato en básicos (huevos, lácteos, pasta, verdura, carne); Mercadona tiene buena calidad en fresco y marca Hacendado; Alcampo y Carrefour para lo que no tienen los otros o cuando hay ofertas. Agrupa para ir a 2 sitios como mucho, y prioriza Aldi y Mercadona si el ahorro es parecido.',
    'Los precios son orientativos: dilo en "consejos" si cambian mucho según la temporada.',
    'Devuelve: {"resumen":"dónde ir y por qué, 1-2 frases","supers":[{"nombre":"","que_comprar":["producto"],"por_que":""}],"productos":[{"producto":"nombre EXACTO de la lista","super":"","precio_aprox":"≈ 2,50 €","consejo":""}],"total_aprox":"≈ 45 €","consejos":[""]}',
  ].join('\n');
  const pide = 'Mi lista: ' + items.map((x) => x.nombre + (x.q ? ' (' + fmt(x.q, 1) + ' ' + (x.u || '') + ')' : '')).join('; ');
  const r = normalizarCompra(await generar(sistema, [{ text: pide }], 0.4), items);
  if (!r.supers.length && !Object.keys(r.productos).length) throw new Error('No ha salido ninguna recomendación. Prueba otra vez.');
  return { ...r, zona: zona || 'Madrid', firma: firmaCompra(items), fecha: new Date().toISOString() };
}

/* =========================================================================
   6) PREGÚNTALE A TU ENTRENADOR (sobre tu rutina, tu comida o tu progreso)
   ========================================================================= */

export async function preguntar(state, { texto, audio, tema }) {
  const d = datosRepaso(state);
  const sistema = [
    BASE_COMUN,
    tema === 'comida' ? 'Ahora haces de NUTRICIONISTA deportivo: ideas de comidas, ingredientes, sustituciones, cómo cuadrar macros, qué comer antes o después de entrenar… Sus recetas: ' + (state.comida.recetas || []).map((r) => r.nombre).slice(0, 80).join('; ') + '. ' + contextoNutricion(state, ymd(new Date())).texto : '',
    'Responde a su pregunta sobre entrenamiento, técnica, nutrición o su progreso usando sus datos (JSON abajo). Respuesta clara y práctica, de 3 a 10 frases, con números concretos cuando ayuden.',
    'Datos: ' + JSON.stringify({ ...d, rutina: (state.days || []).map((x) => x.label + ': ' + x.ids.filter((id) => state.exercises[id]).map((id) => state.exercises[id].name).join(', ')) }),
    'Devuelve: {"pregunta":"su pregunta (transcrita si era audio)","respuesta":"…"}',
  ].join('\n');
  const partes = [];
  if (audio) partes.push({ audio, mime: 'audio/wav' }, { text: 'Este audio es mi pregunta.' });
  if (texto) partes.push({ text: texto });
  if (!partes.length) throw new Error('Escribe o graba tu pregunta.');
  const j = await generar(sistema, partes, 0.6);
  return { pregunta: txt(j && j.pregunta, 600) || txt(texto, 600), respuesta: txt(j && j.respuesta, 4000) || 'No he podido responder. Prueba otra vez.' };
}

/* =========================================================================
   5e) NUTRICIONISTA IA: modos (con lo que tienes en casa, sustituciones…)
   ========================================================================= */

export const NUTRI_MODOS = [
  ['casa', '🧊 Con lo que tengo en casa'],
  ['sustituir', '🔁 Cambiar un ingrediente'],
  ['macros', '🎯 Cerrar mis macros de hoy'],
  ['entreno', '🏋️ Antes y después de entrenar'],
  ['fuera', '🍔 Pedir fuera o comer en un bar'],
  ['libre', '💬 Pregunta libre'],
];

const MODO_TEXTO = {
  casa: 'El usuario tiene POCOS productos en casa. Con lo que te diga (texto, audio o foto de su nevera/despensa) propón entre 2 y 4 recetas fitness y rápidas que pueda hacer SOLO con eso y básicos (sal, aceite, especias, agua). Si falta algo clave, dilo en "faltaria" (máximo 2 cosas). Prioriza que cuadren con sus macros de hoy.',
  sustituir: 'El usuario quiere CAMBIAR un ingrediente de algo que come o cocina. Dile 2-4 sustitutos concretos, con la cantidad equivalente en macros y el motivo (más proteína, menos calorías, sin lácteos…), y cómo cambia el plato.',
  macros: 'El usuario quiere cerrar lo que le falta de macros HOY. Mira lo que lleva y lo que le falta, y propón 2-3 opciones (comida o snack) con cantidades concretas que cuadren con lo que falta, sin pasarse de calorías.',
  entreno: 'El usuario quiere saber qué comer ANTES y DESPUÉS de entrenar. Propón 1-2 opciones para antes (energía, poca grasa) y 1-2 para después (proteína y carbohidratos), con cantidades y el tiempo recomendado.',
  fuera: 'El usuario come fuera o en un bar/restaurante. Dile cómo elegir lo mejor de la carta (qué pedir, qué evitar, cómo pedirlo) y qué macros aproximados tendría. Sé práctico.',
  libre: 'Responde a su pregunta de nutrición deportiva con claridad y números cuando ayuden.',
};

export function normalizarNutri(json) {
  return {
    respuesta: txt(json && json.respuesta, 3000),
    faltaria: lista(json && json.faltaria, 3),
    recetas: normalizarRecetas({ recetas: json && json.recetas }),
    consejo: txt(json && json.consejo, 240),
  };
}

export async function nutricionista(state, { modo, texto, audio, foto }) {
  const m = NUTRI_MODOS.find((x) => x[0] === modo) ? modo : 'libre';
  const sistema = [
    BASE_COMUN,
    'Eres su NUTRICIONISTA deportivo de confianza. ' + MODO_TEXTO[m],
    contextoNutricion(state, ymd(new Date())).texto,
    'Sus recetas guardadas (no las repitas): ' + (state.comida.recetas || []).map((r) => r.nombre).slice(0, 80).join('; ') + '.',
    'Si propones recetas, que sean fáciles (pocos ingredientes, pocos pasos) y usa los ingredientes con su nombre EXACTO de esta lista cuando puedas: ' + INGREDIENTES.join(', ') + '.',
    'Devuelve: {"respuesta":"explicación breve y práctica en 2-6 frases","faltaria":["…"],"recetas":[{"nombre":"","tipo":"desayuno|comida|cena|snack","objetivos":["volumen|definicion|mantenimiento"],"ingredientes":[{"n":"","q":100,"u":"g"}],"pasos":["…"],"p":0,"c":0,"g":0,"por_que":""}],"consejo":""}',
    'Si el modo no pide recetas, "recetas" debe ser [].',
  ].join('\n');
  const partes = [];
  if (foto) partes.push({ imagen: foto }, { text: 'Esta foto es mi nevera o despensa (o lo que tengo a mano).' });
  if (audio) partes.push({ audio, mime: 'audio/wav' }, { text: 'Esto es lo que te digo.' });
  if (texto) partes.push({ text: texto });
  if (!partes.length) throw new Error(m === 'casa' ? 'Dime qué tienes en casa (escribe, dicta o haz una foto).' : 'Escribe o dicta tu pregunta.');
  const r = normalizarNutri(await generar(sistema, partes, 0.6));
  if (!r.respuesta && !r.recetas.length) throw new Error('No he sabido responder. Prueba a contarlo de otra forma.');
  return r;
}
