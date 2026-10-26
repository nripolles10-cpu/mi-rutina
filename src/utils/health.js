import { ACTIVIDAD_FACTOR, OBJETIVOS, RITMOS } from '../data/catalog.js';
import { addDays, fromYmd, mean, num, pick, ymd } from '../utils/format.js';

/* =========================================================================
   SALUD Y NUTRICIÓN
   ========================================================================= */

export function calcBMI(kg, cm) { if (!kg || !cm) return null; const m = cm / 100; return kg / (m * m); }

export function bmiCategory(bmi) {
  if (bmi === null) return null;
  if (bmi < 18.5) return { label: 'Bajo peso', color: '#38BDF8' };
  if (bmi < 25) return { label: 'Normal', color: '#22C55E' };
  if (bmi < 30) return { label: 'Sobrepeso', color: '#F5A524' };
  return { label: 'Obesidad', color: '#F43F5E' };
}

// % de grasa creíble según el sexo (fuera de este rango se ignora y se usa Mifflin-St Jeor)
export const RANGO_GRASA = { M: [4, 45], F: [10, 50] };
// Suelo de seguridad de calorías al día cuando hay déficit
export const KCAL_MINIMAS = { M: 1500, F: 1200 };
// % de grasa "de referencia" para calcular la proteína sobre el peso que tendrías con una grasa normal
export const GRASA_REFERENCIA = { M: 15, F: 23 };
// Grasa de la dieta: g por kg extra para mujeres y % mínimo de las calorías
export const GRASA_EXTRA_MUJER = 0.1;
export const GRASA_PCT_MIN = { M: 0.20, F: 0.25 };

export function sexoValido(s) { return s === 'F' ? 'F' : 'M'; }

export function grasaFiable(grasaPct, sexo) {
  if (typeof grasaPct !== 'number' || !isFinite(grasaPct)) return false;
  const r = RANGO_GRASA[sexoValido(sexo)];
  return grasaPct >= r[0] && grasaPct <= r[1];
}

export function mifflinStJeor(kg, cm, edad, sexo) {
  if (!kg || !cm || !edad || !sexo) return null;
  const base = 10 * kg + 6.25 * cm - 5 * edad;
  return sexo === 'F' ? base - 161 : base + 5;
}

// Metabolismo basal. Base: Mifflin-St Jeor (usa sexo, edad, altura y peso).
// Si hay % de grasa creíble para tu sexo: Katch-McArdle (por masa magra; la masa magra ya refleja el sexo).
// Devuelve { bmr, metodo, mifflin, katch, lbm, grasaIgnorada } o null si faltan datos.
export function calcBMRInfo(o) {
  if (!o.kg) return null;
  const mifflin = mifflinStJeor(o.kg, o.cm, o.edad, o.sexo);
  const hayGrasa = typeof o.grasaPct === 'number' && isFinite(o.grasaPct) && o.grasaPct > 0;
  const fiable = hayGrasa && grasaFiable(o.grasaPct, o.sexo);
  const lbm = fiable ? o.kg * (1 - o.grasaPct / 100) : null;
  const katch = fiable ? 370 + 21.6 * lbm : null;
  if (katch !== null) return { bmr: katch, metodo: 'Katch-McArdle', mifflin, katch, lbm, grasaIgnorada: false };
  if (mifflin === null) return null;
  return { bmr: mifflin, metodo: 'Mifflin-St Jeor', mifflin, katch: null, lbm: null, grasaIgnorada: hayGrasa };
}

// Calorías para la tarjeta de Ajustes (mantener / subir / bajar), con el suelo de seguridad al bajar
export function calcCalorias(form) {
  const sexo = sexoValido(form.sexo);
  const info = calcBMRInfo({ kg: form.pesoInicialKg, cm: form.alturaCm, edad: form.edad, sexo, grasaPct: form.grasaPct });
  if (info === null) return null;
  const tdee = info.bmr * (ACTIVIDAD_FACTOR[form.actividad] || 1.5);
  const suelo = Math.max(KCAL_MINIMAS[sexo], info.bmr);
  return { mantener: Math.round(tdee), subir: Math.round(tdee + 300), bajar: Math.round(Math.max(tdee - 400, suelo)), metodo: info.metodo };
}

// Estimación de grasa corporal (fórmula de Deurenberg) — orientativa, no clínica.
export function estimaGrasaCorporal(form) {
  const bmi = calcBMI(form.pesoInicialKg, form.alturaCm);
  if (bmi === null || !form.edad || !form.sexo) return null;
  const bf = 1.2 * bmi + 0.23 * form.edad - 10.8 * (form.sexo === 'M' ? 1 : 0) - 5.4;
  return Math.max(3, Math.round(bf * 10) / 10);
}

// Macros: proteína y grasa por kg de peso (rangos 2,0–2,3 y 0,7–0,8) y los hidratos con el resto de las calorías.
// grasaMin (opcional): gramos mínimos de grasa (por ejemplo, un % mínimo de las calorías).
export function macroSplit(kcal, kg, protF, fatF, grasaMin) {
  const protG = Math.round(protF * kg);
  const fatG = Math.max(Math.round(fatF * kg), Math.round(grasaMin || 0));
  const restante = kcal - protG * 4 - fatG * 9;
  const carbG = Math.max(0, Math.round(restante / 4));
  return { protG, fatG, carbG, protKcal: protG * 4, fatKcal: fatG * 9, carbKcal: carbG * 4, protF, fatF, carbBajo: restante < 0 };
}

// Plan de calorías y macros. Usa sexo, edad, altura, peso, % de grasa (opcional), actividad, objetivo y ritmo.
export function calcPlan(o) {
  const obj = OBJETIVOS[o.objetivo] || OBJETIVOS.definicion;
  const sexo = sexoValido(o.sexo);
  const info = calcBMRInfo({ kg: o.kg, cm: o.alturaCm, edad: o.edad, sexo, grasaPct: o.grasaPct });
  if (info === null) return { falta: true };
  const bmr = Math.round(info.bmr);
  const tdeeEst = Math.round(info.bmr * (ACTIVIDAD_FACTOR[o.actividad] || 1.5));
  const tdee = o.tdeeReal ? Math.round(o.tdeeReal) : tdeeEst;
  const r = RITMOS[o.ritmo] || RITMOS.normal;
  const deltaElegido = o.objetivo === 'volumen' ? r.vol : o.objetivo === 'definicion' ? -r.def : 0;
  // Suelo de seguridad: con déficit no se baja de 1.200 kcal (mujer) / 1.500 (hombre) ni del metabolismo basal
  const suelo = Math.max(KCAL_MINIMAS[sexo], bmr);
  const kcalSinSuelo = Math.max(0, tdee + deltaElegido);
  const kcal = deltaElegido < 0 ? Math.max(kcalSinSuelo, Math.min(suelo, tdee)) : kcalSinSuelo;
  const ajustadoAlSuelo = kcal > kcalSinSuelo;
  const delta = kcal - tdee;
  // Peso de referencia para los macros: con % de grasa, el peso que tendrías con una grasa normal para tu sexo
  // (así una persona con mucha grasa no recibe proteína de más). Sin % de grasa, tu peso.
  const pesoRef = info.lbm ? Math.min(o.kg, info.lbm / (1 - GRASA_REFERENCIA[sexo] / 100)) : o.kg;
  const fatF = obj.fatF + (sexo === 'F' ? GRASA_EXTRA_MUJER : 0);
  const grasaMin = (kcal * GRASA_PCT_MIN[sexo]) / 9;
  const split = macroSplit(kcal, pesoRef, obj.protF, fatF, grasaMin);
  const semanal = (delta * 7) / 7700; // kg/semana aprox.
  // Déficit excesivo: más del 25 % del gasto o perder más del 1 % del peso a la semana
  const deficitExcesivo = delta < 0 && (-delta > tdee * 0.25 || -semanal > o.kg * 0.01);
  let semanas = null;
  if (o.objetivo !== 'mantenimiento' && o.objetivoKg && delta !== 0) {
    const diff = o.objetivoKg - o.kg;
    if (diff * delta > 0) semanas = Math.ceil(Math.abs(diff / semanal));
  }
  return {
    falta: false, sexo, bmr, metodo: info.metodo, mifflin: info.mifflin === null ? null : Math.round(info.mifflin),
    lbm: info.lbm === null ? null : Math.round(info.lbm * 10) / 10, grasaIgnorada: info.grasaIgnorada,
    tdeeEst, tdee, deltaElegido, delta, kcal, kcalSinSuelo, suelo, ajustadoAlSuelo, deficitExcesivo, pesoRef: Math.round(pesoRef * 10) / 10,
    semanal, semanas, ...split,
  };
}

// Valores efectivos de la calculadora: lo que escribes ahí o, si lo dejas vacío, tus datos de Ajustes / peso registrado
export function effNutri(state) {
  const n = state.nutricion;
  const f = state.formulario;
  const hist = state.peso.historial || [];
  const pesoReg = hist.length ? hist[hist.length - 1].kg : f.pesoInicialKg;
  const eff = {
    kg: pick(n.pesoActual, pesoReg),
    objetivoKg: state.peso.objetivoKg || null, // el mismo objetivo que en Progreso y Ajustes
    edad: pick(n.edad, f.edad),
    alturaCm: pick(n.alturaCm, f.alturaCm),
    sexo: sexoValido(f.sexo || n.sexo), // un único dato: el sexo de Ajustes (la calculadora lo cambia ahí)
    actividad: n.actividad || f.actividad || 'intenso',
    grasaPct: pick(n.grasaPct, f.grasaPct),
  };
  const plan = eff.kg ? calcPlan({ objetivo: n.objetivo, ritmo: n.ritmo, ...eff, tdeeReal: n.tdeeReal }) : { falta: true };
  return { n, eff, plan, obj: OBJETIVOS[n.objetivo] || OBJETIVOS.definicion };
}

export function kcalOfMacros(p, c, g) { return Math.round(4 * num(p) + 4 * num(c) + 9 * num(g)); }

export function entryTotals(list) {
  return (list || []).reduce((a, e) => ({ kcal: a.kcal + num(e.kcal), p: a.p + num(e.p), c: a.c + num(e.c), g: a.g + num(e.g) }), { kcal: 0, p: 0, c: 0, g: 0 });
}

export function gastoReal(state) {
  const diario = state.comida.diario || {};
  const hoy = ymd(new Date());
  const desde = ymd(addDays(new Date(), -35));
  const dias = Object.keys(diario).filter((k) => k >= desde && k <= hoy && entryTotals(diario[k]).kcal > 0).sort();
  if (dias.length < 14) return { ok: false, motivo: 'Faltan días de comidas: llevas ' + dias.length + ' de 14 (solo cuentan los días con comidas apuntadas en los últimos 35).' };
  const kcalMed = mean(dias.map((k) => entryTotals(diario[k]).kcal));
  const w = (state.peso.historial || []).map((r) => ({ t: new Date(r.date).getTime() / 86400000, kg: r.kg }))
    .filter((r) => r.t >= fromYmd(dias[0]).getTime() / 86400000 - 1 && r.t <= fromYmd(dias[dias.length - 1]).getTime() / 86400000 + 1).sort((a, b) => a.t - b.t);
  if (w.length < 2) return { ok: false, motivo: 'Faltan pesos: necesito al menos 2 registros de peso dentro del periodo de tus comidas.' };
  const span = w[w.length - 1].t - w[0].t;
  if (span < 14) return { ok: false, motivo: 'Tus pesos cubren ' + Math.round(span) + ' días; necesito 14 o más entre el primero y el último.' };
  const tm = mean(w.map((r) => r.t)), km = mean(w.map((r) => r.kg));
  let sxy = 0, sxx = 0;
  w.forEach((r) => { sxy += (r.t - tm) * (r.kg - km); sxx += (r.t - tm) * (r.t - tm); });
  const kgDia = sxx ? sxy / sxx : 0;
  const tdee = kcalMed - kgDia * 7700;
  return { ok: true, kcalMed: Math.round(kcalMed), kgSemana: kgDia * 7, tdee: Math.round(tdee), dias: dias.length, span: Math.round(span) };
}
