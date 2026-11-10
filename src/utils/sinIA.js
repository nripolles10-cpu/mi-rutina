/* =========================================================================
   Herramientas SIN inteligencia artificial: todo sale de tus datos y de tablas fijas.
   No usan internet, no gastan nada y funcionan siempre.
   ========================================================================= */

import { NUTRI_DB } from '../data/recetas.js';
import { kcalOfMacros, entryTotals, effNutri } from './health.js';
import { stripAcc, ymd, addDays, fromYmd, fmt } from './format.js';
import { lunesDe, hechosDe, diasDe } from './cardio.js';
import { resumenSemana } from './entreno.js';

/* ---------- 1) Recetas con lo que tienes en casa ---------- */

// Ingredientes que casi todo el mundo tiene: no cuentan como "te falta"
const BASICOS = /^(sal|pimienta|agua|hielo|aceite|vinagre)\b/;

function norm(t) { return stripAcc(String(t || '')).toLowerCase().trim(); }

// "pollo, arroz y tomate" → ["pollo", "arroz", "tomate"]
export function tokensIngredientes(texto) {
  return String(texto || '').split(/,|;|\n|\sy\s/i).map(norm).filter((t) => t.length >= 3);
}

// Busca recetas cuyos ingredientes tengas (o casi). Devuelve las que tienen al menos uno.
export function recetasConLoQueTienes(recetas, texto, max = 10) {
  const tokens = tokensIngredientes(texto);
  if (!tokens.length) return [];
  const tiene = (nombre) => {
    const n = norm(nombre);
    return tokens.some((t) => n.indexOf(t) !== -1 || (n.length >= 3 && t.indexOf(n) !== -1));
  };
  const out = [];
  (recetas || []).forEach((r) => {
    const ings = (r.ingredientes || []).filter((x) => x && x.n && !BASICOS.test(norm(x.n)));
    if (!ings.length) return;
    const tienes = ings.filter((x) => tiene(x.n)).map((x) => x.n);
    if (!tienes.length) return;
    const faltan = ings.filter((x) => !tiene(x.n)).map((x) => x.n);
    out.push({ receta: r, tienes, faltan, pct: Math.round((tienes.length / ings.length) * 100) });
  });
  out.sort((a, b) => a.faltan.length - b.faltan.length || b.tienes.length - a.tienes.length);
  return out.slice(0, max);
}

/* ---------- 2) Qué comer para cubrir lo que te falta ---------- */

// Alimentos que no tiene sentido sugerir para cubrir macros
const NO_SUGERIR = /^(aceite|sal|miel|azucar|canela|curry|pimenta|pimienta|especias|vinagre|sirope)/;

// rest = { kcal, p, c, g }: lo que te queda hoy. Elige cantidades (múltiplos de 10 g) que encajan.
export function sugerirParaFaltan(rest, n = 5) {
  const r = { kcal: Math.max(0, rest.kcal || 0), p: Math.max(0, rest.p || 0), c: Math.max(0, rest.c || 0), g: Math.max(0, rest.g || 0) };
  if (r.kcal < 60) return [];
  if (r.p + r.c + r.g <= 0) return [];
  const pool = Object.keys(NUTRI_DB).filter((k) => NUTRI_DB[k].per100 && !NO_SUGERIR.test(norm(k)));
  const mejores = [];
  pool.forEach((nombre) => {
    const [p100, c100, g100] = NUTRI_DB[nombre].per100;
    const kcal100 = kcalOfMacros(p100, c100, g100);
    if (kcal100 <= 0) return;
    let mejor = null;
    for (let gr = 30; gr <= 300; gr += 10) {
      const f = gr / 100;
      const kc = kcal100 * f;
      if (kc > r.kcal) break;
      const pp = p100 * f, cc = c100 * f, gg = g100 * f;
      // Lo que aporta de lo que falta, menos lo que te pasarías de cada macro
      const cubre = (Math.min(pp, r.p) / Math.max(r.p, 1)) * 2 + Math.min(cc, r.c) / Math.max(r.c, 1) + Math.min(gg, r.g) / Math.max(r.g, 1);
      const pasa = Math.max(0, pp - r.p) / Math.max(r.p, 1) + Math.max(0, cc - r.c) / Math.max(r.c, 1) + Math.max(0, gg - r.g) / Math.max(r.g, 1);
      const score = cubre - 0.5 * pasa;
      if (cubre > 0 && (!mejor || score > mejor.score)) mejor = { nombre, gramos: gr, kcal: Math.round(kc), p: Math.round(pp), c: Math.round(cc), g: Math.round(gg), score };
    }
    if (mejor) mejores.push(mejor);
  });
  return mejores.sort((a, b) => b.score - a.score).slice(0, n).map(({ score, ...x }) => x);
}

/* ---------- 3) Consejos de Diana por músculo (solo para los puntos débiles) ---------- */

// Consejos fijos por músculo. Un músculo que tú añadas sin tabla usa el consejo general.
export const CONSEJOS_MUSCULO = {
  pecho_sup: { porQue: 'La parte alta del pecho necesita ángulo: con solo press plano se queda atrás.',
    acciones: ['Empieza la sesión de pecho con un press inclinado (30–45°)', 'Haz 6–10 series semanales de trabajo inclinado', 'Controla la bajada y toca arriba del esternón'],
    ejercicios: [{ nombre: 'Press inclinado con mancuernas', pauta: '3×8-12' }, { nombre: 'Aperturas en polea de abajo arriba', pauta: '3×12-15' }] },
  pecho: { porQue: 'El pecho medio e inferior responde a volumen con cargas medias-altas; si va flojo suele faltarle series o rango de carga.',
    acciones: ['Sube a 10–14 series por semana repartidas en 2 días', 'Usa un rango de 8–12 repeticiones con 1–2 en reserva', 'Combina un press plano o declinado con un aislamiento'],
    ejercicios: [{ nombre: 'Press de banca o en máquina', pauta: '3×6-10' }, { nombre: 'Fondos o aperturas en polea', pauta: '3×10-15' }] },
  hombro: { porQue: 'El hombro anterior ya trabaja en todos los press de pecho; si va flojo, suele faltar un press vertical con buena carga.',
    acciones: ['Haz un press de hombro (mancuernas o máquina) 1–2 veces por semana', 'Usa 6–10 repeticiones con buena técnica', 'No sumes demasiadas series directas: el press de pecho ya cuenta'],
    ejercicios: [{ nombre: 'Press militar con mancuernas', pauta: '3×6-10' }, { nombre: 'Elevaciones frontales', pauta: '2×12-15' }] },
  hombro_lat: { porQue: 'El hombro lateral es el que da anchura; casi nunca trabaja en otros ejercicios, así que necesita trabajo directo.',
    acciones: ['Haz elevaciones laterales 2–3 veces por semana', 'Usa 12–20 repeticiones con peso moderado y sin balanceo', 'Prueba la versión en polea para tensión constante'],
    ejercicios: [{ nombre: 'Elevaciones laterales', pauta: '3×12-20' }, { nombre: 'Elevación lateral en polea', pauta: '3×12-15' }] },
  hombro_post: { porQue: 'El hombro posterior se queda atrás en casi todos: equilibra la postura y da volumen al hombro visto de lado.',
    acciones: ['Añade 6–10 series semanales de deltoides posterior', 'Usa 12–20 repeticiones, controlando la vuelta', 'Hazlo al final del día de espalda o de hombro'],
    ejercicios: [{ nombre: 'Pájaros o aperturas inversas en máquina', pauta: '3×12-20' }, { nombre: 'Face pull en polea', pauta: '3×12-15' }] },
  espalda_alta: { porQue: 'La espalda alta (trapecio medio e inferior, romboides) es la que da densidad; pide remos con codos abiertos y pausa atrás.',
    acciones: ['Haz 2 remos por semana con los codos algo abiertos', 'Aguanta 1 s con las escápulas juntas en cada repetición', 'Suma 8–12 series semanales de remo'],
    ejercicios: [{ nombre: 'Remo en T o con barra', pauta: '3×8-10' }, { nombre: 'Remo sentado en polea agarre ancho', pauta: '3×10-12' }] },
  espalda: { porQue: 'El dorsal es el que da la forma en V; necesita tirones verticales con buen recorrido.',
    acciones: ['Entrena dorsal 2 veces por semana', 'Haz un jalón o dominadas con el pecho alto y los codos hacia las costillas', 'Controla la fase excéntrica (2–3 s al subir)'],
    ejercicios: [{ nombre: 'Jalón al pecho', pauta: '3×8-12' }, { nombre: 'Pullover en polea', pauta: '3×12-15' }] },
  biceps: { porQue: 'Los bíceps se trabajan mejor con series cercanas al fallo y con variedad de agarres.',
    acciones: ['Entrena bíceps 2–3 veces por semana con 8–12 series en total', 'Alterna agarre supino y martillo', 'Llega cerca del fallo en la última serie'],
    ejercicios: [{ nombre: 'Curl con barra', pauta: '3×8-12' }, { nombre: 'Curl martillo', pauta: '3×10-12' }] },
  triceps: { porQue: 'El tríceps es grande y pide volumen: si va flojo, suele faltarle trabajo con el brazo extendido.',
    acciones: ['Incluye un ejercicio de tríceps con el codo por encima de la cabeza', 'Usa 10–14 series por semana entre dos o tres ejercicios', 'Sube el peso poco a poco en cada rango'],
    ejercicios: [{ nombre: 'Extensión de tríceps en polea', pauta: '3×10-12' }, { nombre: 'Press francés', pauta: '3×8-10' }] },
  cuadriceps: { porQue: 'Los cuádriceps crecen con trabajo de rodilla flexionada y carga progresiva; si van flojos, suele faltar volumen.',
    acciones: ['Haz 10–14 series semanales de cuádriceps', 'Usa sentadilla o prensa con rango completo', 'Progresa añadiendo peso o repeticiones cada semana'],
    ejercicios: [{ nombre: 'Prensa de pierna', pauta: '3×10-12' }, { nombre: 'Sentadilla goblet', pauta: '3×8-12' }] },
  aductores: { porQue: 'Los aductores se olvidan y dan estabilidad a la cadera; con poco trabajo se quedan atrás.',
    acciones: ['Añade un ejercicio de aductores una vez por semana', 'Trabaja con rango amplio y control', 'Empieza con poco peso para dominar el movimiento'],
    ejercicios: [{ nombre: 'Máquina de aductores', pauta: '3×12-15' }, { nombre: 'Sentadilla sumo', pauta: '3×8-10' }] },
  isquios: { porQue: 'Los isquios piden trabajo de cadera extendida y flexión de rodilla; la sentadilla no basta.',
    acciones: ['Incluye peso muerto rumano o curl femoral', 'Entrena isquios 2 veces por semana', 'Baja el peso y cuida la técnica en la fase excéntrica'],
    ejercicios: [{ nombre: 'Peso muerto rumano', pauta: '3×8-10' }, { nombre: 'Curl femoral tumbado', pauta: '3×10-12' }] },
  gluteo: { porQue: 'El glúteo responde a empuje de cadera y a ejercicios con carga; sin ellos se queda flojo.',
    acciones: ['Añade empuje de cadera con carga (hip thrust o puente)', 'Haz 10–14 series semanales de glúteo', 'Aprieta un segundo arriba en cada repetición'],
    ejercicios: [{ nombre: 'Hip thrust con barra', pauta: '3×8-12' }, { nombre: 'Patada de glúteo en polea', pauta: '3×12-15' }] },
  gemelos: { porQue: 'Los gemelos necesitan mucho volumen y rango completo; con poca frecuencia no reaccionan.',
    acciones: ['Entrénalos 3 veces por semana', 'Haz el rango completo, con pausa abajo y arriba', 'Sube series antes que peso'],
    ejercicios: [{ nombre: 'Elevación de talones de pie', pauta: '4×10-15' }, { nombre: 'Elevación de talones sentado', pauta: '3×12-15' }] },
  core: { porQue: 'El core responde a ejercicios de estabilidad y de flexión de tronco con progresión.',
    acciones: ['Haz 2–3 ejercicios de core por sesión', 'Alterna estabilidad (plancha) y flexión (crunch en polea)', 'Progresa aumentando tiempo o carga'],
    ejercicios: [{ nombre: 'Crunch en polea', pauta: '3×10-15' }, { nombre: 'Plancha con elevación', pauta: '3×30-45 s' }] },
  antebrazo: { porQue: 'El antebrazo suele ir detrás porque se entrena de rebote; necesita trabajo directo.',
    acciones: ['Añade 2 series de agarre o flexión de muñeca al final del día', 'Trabaja el agarre con peso moderado', 'Progresa en tiempo o carga'],
    ejercicios: [{ nombre: 'Flexión de muñeca con mancuerna', pauta: '2×12-15' }, { nombre: 'Paseo del granjero', pauta: '3×30 s' }] },
  trapecio: { porQue: 'El trapecio se trabaja con encogimientos y remos; si va flojo, falta carga en la parte alta de la espalda.',
    acciones: ['Añade encogimientos con carga progresiva', 'Combina con remos altos o face pull', 'Controla el movimiento, sin balanceos'],
    ejercicios: [{ nombre: 'Encogimientos con mancuernas', pauta: '3×10-12' }, { nombre: 'Remo al mentón', pauta: '3×10-12' }] },
  lumbar: { porQue: 'La zona lumbar se fortalece con bisagra de cadera y carga controlada, no con más volumen de espalda.',
    acciones: ['Incluye hiperextensiones o buenos días ligeros', 'Trabaja la bisagra de cadera con peso moderado', 'Evita cargas máximas hasta dominar la técnica'],
    ejercicios: [{ nombre: 'Hiperextensiones', pauta: '3×10-12' }, { nombre: 'Buenos días con barra', pauta: '3×8-10' }] },
  abductores: { porQue: 'Los abductores estabilizan la cadera; con poco trabajo, la zona lateral queda débil.',
    acciones: ['Añade un ejercicio de abductores una vez por semana', 'Haz el rango completo con control', 'Sube reps antes que peso'],
    ejercicios: [{ nombre: 'Máquina de abductores', pauta: '3×12-15' }, { nombre: 'Abducción de cadera con banda', pauta: '3×15-20' }] },
};

const CONSEJO_GENERAL = {
  porQue: 'Es un punto débil: suele faltarle volumen semanal o progresión en sus ejercicios.',
  acciones: ['Sube a 10–14 series semanales repartidas en 2 días', 'Usa un rango de 8–12 repeticiones con 1–2 en reserva', 'Progresa añadiendo peso o repeticiones cada semana'],
  ejercicios: [],
};

// Lista de consejos para los músculos marcados como débiles, en el orden de tu diana
export function consejosDebiles(state, cats) {
  const estados = (state.diana && state.diana.estados) || {};
  return Object.keys(estados).filter((k) => estados[k] === 'debil' && cats[k]).map((k) => {
    const base = CONSEJOS_MUSCULO[k] || CONSEJO_GENERAL;
    return { id: k, nombre: cats[k].label, color: cats[k].color, emoji: cats[k].emoji, ...base };
  });
}

/* ---------- 4) Cardio: 5 tipos por objetivo ---------- */

export const CARDIO_OBJETIVOS_SIN_IA = [['grasa', '🔥 Quemar grasa'], ['resistencia', '🫁 Resistencia'], ['recuperacion', '🌿 Recuperación']];

export const CARDIO_PRESETS = {
  grasa: [
    { nombre: 'Intervalos en cinta', modalidad: 'Cinta', metodo: 'Intervalos', intensidad: 'Alta · 85–90 % FC máx', duracion: 22, frecuencia: '2 días/semana', cuando: 'En días sin pierna o al final de pesas ligeras',
      detalle: ['5 min andando a ritmo cómodo', '8 rondas: 30 s rápido + 90 s andando', '3 min de vuelta a la calma'] },
    { nombre: 'Caminata inclinada', modalidad: 'Cinta', metodo: 'Zona 2 (LISS)', intensidad: 'Moderada · 60–70 % FC máx', duracion: 35, frecuencia: '3–4 días/semana', cuando: 'Cualquier día, incluso el de descanso de pesas',
      detalle: ['Inclinación 8–10 %, 4,5–5,5 km/h', 'Mantén una conversación cómoda', 'Sin llegar a sudar en exceso'] },
    { nombre: 'Tabata en bici', modalidad: 'Bici estática', metodo: 'Tabata', intensidad: 'Muy alta · esfuerzo máximo en cada tanda', duracion: 20, frecuencia: '2 días/semana', cuando: 'Después de un día de descanso o fuera de pierna',
      detalle: ['5 min suaves de calentamiento', '2 bloques de 8 × (20 s a tope + 10 s suave)', '2 min de descanso entre bloques'] },
    { nombre: 'Escaleras con cuestas', modalidad: 'Escaladora / escaleras', metodo: 'Cuestas (fartlek)', intensidad: 'Moderada-alta', duracion: 25, frecuencia: '2 días/semana', cuando: 'En días de pesas de tren superior',
      detalle: ['3 min de calentamiento suave', '8 × (1 min subiendo rápido + 2 min suave)', 'Vuelta a la calma de 3 min'] },
    { nombre: 'EMOM de remo y comba', modalidad: 'Remo + comba', metodo: 'EMOM (cada minuto)', intensidad: 'Alta', duracion: 16, frecuencia: '2 días/semana', cuando: 'Al final del entreno o como sesión corta',
      detalle: ['16 minutos: en cada minuto, 30 s de remo fuerte', 'Lo que sobre del minuto, descanso', 'Si te cuesta, cambia remo por comba'] },
  ],
  resistencia: [
    { nombre: 'Zona 2 continua', modalidad: 'Elíptica o bici', metodo: 'Zona 2 (LISS)', intensidad: 'Moderada · 60–70 % FC máx', duracion: 45, frecuencia: '2–3 días/semana', cuando: 'Días sueltos, sin pesas en las piernas',
      detalle: ['Ritmo constante y cómodo', 'Puedes hablar en frases completas', 'Sube un poco el ritmo solo si te sobra'] },
    { nombre: 'Fartlek en elíptica', modalidad: 'Elíptica', metodo: 'Fartlek', intensidad: 'Moderada-alta', duracion: 35, frecuencia: '2 días/semana', cuando: 'Cualquier día de cardio de la semana',
      detalle: ['5 min suaves de calentamiento', '6 × (3 min suave + 1 min fuerte)', '5 min de vuelta a la calma'] },
    { nombre: 'Intervalos largos 4×4', modalidad: 'Cinta o bici', metodo: 'Intervalos largos', intensidad: 'Alta · 85–90 % FC máx en cada bloque', duracion: 35, frecuencia: '1–2 días/semana', cuando: 'Un día a la semana, con buena energía',
      detalle: ['10 min de calentamiento', '4 × (4 min fuerte + 3 min suave)', '5 min de vuelta a la calma'] },
    { nombre: 'Remo progresivo', modalidad: 'Remo', metodo: 'Progresivo', intensidad: 'De moderada a alta', duracion: 30, frecuencia: '2 días/semana', cuando: 'Días de espalda o de cardio suave',
      detalle: ['5 min suaves', '5 bloques de 4 min subiendo el ritmo cada bloque', '2 min suaves entre bloques'] },
    { nombre: 'Bici con cuestas', modalidad: 'Bici estática', metodo: 'Series en resistencia', intensidad: 'Moderada-alta', duracion: 40, frecuencia: '1–2 días/semana', cuando: 'Cuando quieras trabajar aguante sin mucho impacto',
      detalle: ['10 min suaves', '6 × (3 min con resistencia alta a cadencia 70 + 2 min suave)', '5 min de vuelta a la calma'] },
  ],
  recuperacion: [
    { nombre: 'Caminata suave', modalidad: 'Al aire libre', metodo: 'Caminata', intensidad: 'Muy suave · FC por debajo del 60 %', duracion: 30, frecuencia: 'Todos los días que quieras', cuando: 'Después de comer o en días de mucha carga',
      detalle: ['Ritmo tranquilo, sin prisa', 'Mejor en terreno llano', 'Úsala para despejar la cabeza'] },
    { nombre: 'Bici suave y movilidad', modalidad: 'Bici estática', metodo: 'Recuperación activa', intensidad: 'Muy suave', duracion: 30, frecuencia: '2 días/semana', cuando: 'El día después de una sesión dura',
      detalle: ['20 min pedaleando muy suave', '10 min de estiramientos de piernas y cadera', 'Respira tranquilo todo el rato'] },
    { nombre: 'Natación suave', modalidad: 'Piscina', metodo: 'Continuo suave', intensidad: 'Baja', duracion: 25, frecuencia: '1–2 días/semana', cuando: 'Si tienes piscina y te apetece algo sin impacto',
      detalle: ['4 min de calentamiento', '15 min nadando a ritmo lento', '6 min de pausas y estiramientos en el borde'] },
    { nombre: 'Elíptica a ritmo de respiración', modalidad: 'Elíptica', metodo: 'Recuperación activa', intensidad: 'Muy suave · RPE 3 de 10', duracion: 20, frecuencia: '2–3 días/semana', cuando: 'Días de descanso de pesas',
      detalle: ['Inspira 4 tiempos, espira 4 tiempos', 'Ritmo que te permita respirar por la nariz', 'Sin subir resistencia'] },
    { nombre: 'Movilidad y paseo', modalidad: 'Casa o aire libre', metodo: 'Movilidad', intensidad: 'Muy suave', duracion: 30, frecuencia: 'Cuando lo necesites', cuando: 'Antes de dormir o al levantarte',
      detalle: ['10 min de movilidad de cadera, hombros y columna', '20 min de paseo tranquilo', 'Termina con 2 min de respiración lenta'] },
  ],
};

// Lo que se guarda en tu pestaña Cardio al pulsar "Añadir" (mismo formato que antes)
export function cardioPresetParaGuardar(p) {
  const cab = [p.metodo, p.duracion ? Math.round(p.duracion) + ' min' : '', p.intensidad].filter(Boolean).join(' · ');
  return { name: p.nombre, frecuencia: p.frecuencia || '', detalle: [cab].concat(p.detalle.map((x) => '• ' + x)).concat(p.cuando ? ['🕒 ' + p.cuando] : []).filter(Boolean).join('\n') };
}

/* ---------- 5) Resumen de la semana (cifras calculadas) ---------- */

export function resumenSemanaLocal(state, hoyDate) {
  const hoy = hoyDate || new Date();
  const lunes = lunesDe(hoy);
  const hoyK = ymd(hoy);
  const ent = resumenSemana(state, lunes);
  const objDias = (state.preferencias && state.preferencias.objetivoDiasSemana) || 3;

  const cardio = (state.cardio || []).filter((c) => c && c.name);
  const cardioPrevistos = cardio.reduce((a, c) => a + diasDe(c).length, 0);
  const cardioHechos = cardio.reduce((a, c) => a + hechosDe(c).filter((f) => f >= lunes && f <= hoyK).length, 0);

  const plan = effNutri(state).plan;
  const diario = state.comida.diario || {};
  const dias = [];
  for (let k = lunes; k <= hoyK; k = ymd(addDays(fromYmd(k), 1))) {
    if (diario[k] && diario[k].length) dias.push(entryTotals(diario[k]));
  }
  const media = (k) => (dias.length ? Math.round(dias.reduce((a, d) => a + d[k], 0) / dias.length) : null);

  const pesos = ((state.peso && state.peso.historial) || []).filter((r) => {
    const f = ymd(new Date(r.date)); return f >= lunes && f <= hoyK;
  });
  const pesoIni = pesos.length ? pesos[0].kg : null;
  const pesoFin = pesos.length ? pesos[pesos.length - 1].kg : null;

  return {
    lunes,
    entrenos: { sesiones: ent.sesiones, objetivo: objDias, series: ent.series, records: ent.records },
    cardio: { hechos: cardioHechos, previstos: cardioPrevistos },
    comida: { dias: dias.length, kcalMedia: media('kcal'), protMedia: media('p'), kcalPlan: plan.falta ? null : Math.round(plan.kcal), protPlan: plan.falta ? null : Math.round(plan.protG) },
    peso: { inicio: pesoIni, fin: pesoFin },
    sueno: ent.suenoMedio, energia: ent.energiaMedia,
  };
}

// Frases del resumen, a partir de las cifras (sin IA: son plantillas)
export function frasesResumen(r) {
  const out = [];
  const e = r.entrenos;
  out.push('🏋️ Entrenos: ' + e.sesiones + ' de ' + e.objetivo + ' previstos' + (e.sesiones >= e.objetivo ? ' · objetivo cumplido ✓' : ''));
  out.push('📊 Series esta semana: ' + e.series + (e.records ? ' · ' + e.records + ' récord' + (e.records > 1 ? 's' : '') : ''));
  if (r.cardio.previstos) out.push('🏃 Cardio: ' + r.cardio.hechos + ' de ' + r.cardio.previstos + ' sesiones');
  if (r.comida.dias) {
    const c = r.comida;
    let t = '🍽️ Comida (' + c.dias + ' días apuntados): ' + fmt(c.kcalMedia, 0) + ' kcal y ' + fmt(c.protMedia, 0) + ' g de proteína de media';
    if (c.kcalPlan) t += ' · tu plan: ' + c.kcalPlan + ' kcal y ' + c.protPlan + ' g';
    out.push(t);
  } else out.push('🍽️ Comida: aún no has apuntado días esta semana');
  if (r.peso.inicio !== null && r.peso.fin !== null) {
    const d = r.peso.fin - r.peso.inicio;
    out.push('⚖️ Peso: ' + fmt(r.peso.fin, 1) + ' kg (' + (d > 0 ? '+' : '') + fmt(d, 1) + ' kg desde el primer registro de la semana)');
  }
  if (r.sueno !== null) out.push('😴 Sueño medio: ' + fmt(r.sueno, 1) + ' · energía media: ' + (r.energia !== null ? fmt(r.energia, 1) : '—'));
  return out;
}
