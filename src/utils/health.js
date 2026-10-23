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

// Metabolismo basal: Katch-McArdle si hay % de grasa (mejor para gente musculada); si no, Mifflin-St Jeor.
export function calcBMRInfo(o) {
  if (!o.kg) return null;
  if (o.grasaPct && o.grasaPct >= 4 && o.grasaPct <= 60) {
    const lbm = o.kg * (1 - o.grasaPct / 100);
    return { bmr: 370 + 21.6 * lbm, metodo: 'Katch-McArdle' };
  }
  if (!o.cm || !o.edad || !o.sexo) return null;
  const base = 10 * o.kg + 6.25 * o.cm - 5 * o.edad;
  return { bmr: o.sexo === 'M' ? base + 5 : base - 161, metodo: 'Mifflin-St Jeor' };
}

export function calcCalorias(form) {
  const info = calcBMRInfo({ kg: form.pesoInicialKg, cm: form.alturaCm, edad: form.edad, sexo: form.sexo, grasaPct: form.grasaPct });
  if (info === null) return null;
  const tdee = info.bmr * (ACTIVIDAD_FACTOR[form.actividad] || 1.5);
  return { mantener: Math.round(tdee), subir: Math.round(tdee + 300), bajar: Math.round(tdee - 400), metodo: info.metodo };
}

// Estimación de grasa corporal (fórmula de Deurenberg) — orientativa, no clínica.
export function estimaGrasaCorporal(form) {
  const bmi = calcBMI(form.pesoInicialKg, form.alturaCm);
  if (bmi === null || !form.edad || !form.sexo) return null;
  const bf = 1.2 * bmi + 0.23 * form.edad - 10.8 * (form.sexo === 'M' ? 1 : 0) - 5.4;
  return Math.max(3, Math.round(bf * 10) / 10);
}

// Macros: proteína y grasa por kg de peso (rangos 2,0–2,3 y 0,7–0,8) y los hidratos con el resto de las calorías.
export function macroSplit(kcal, kg, protF, fatF) {
  const protG = Math.round(protF * kg);
  const fatG = Math.round(fatF * kg);
  const restante = kcal - protG * 4 - fatG * 9;
  const carbG = Math.max(0, Math.round(restante / 4));
  return { protG, fatG, carbG, protKcal: protG * 4, fatKcal: fatG * 9, carbKcal: carbG * 4, protF, fatF, carbBajo: restante < 0 };
}

export function calcPlan(o) {
  const obj = OBJETIVOS[o.objetivo] || OBJETIVOS.definicion;
  const info = calcBMRInfo({ kg: o.kg, cm: o.alturaCm, edad: o.edad, sexo: o.sexo, grasaPct: o.grasaPct });
  if (info === null) return { falta: true };
  const tdeeEst = Math.round(info.bmr * (ACTIVIDAD_FACTOR[o.actividad] || 1.5));
  const tdee = o.tdeeReal ? Math.round(o.tdeeReal) : tdeeEst;
  const r = RITMOS[o.ritmo] || RITMOS.normal;
  const delta = o.objetivo === 'volumen' ? r.vol : o.objetivo === 'definicion' ? -r.def : 0;
  const kcal = Math.max(0, tdee + delta);
  const split = macroSplit(kcal, o.kg, obj.protF, obj.fatF);
  const semanal = (delta * 7) / 7700; // kg/semana aprox.
  let semanas = null;
  if (o.objetivo !== 'mantenimiento' && o.objetivoKg && delta !== 0) {
    const diff = o.objetivoKg - o.kg;
    if (diff * delta > 0) semanas = Math.ceil(Math.abs(diff / semanal));
  }
  return { falta: false, bmr: Math.round(info.bmr), metodo: info.metodo, tdeeEst, tdee, delta, kcal, semanal, semanas, ...split };
}

// Valores efectivos de la calculadora: lo que escribes ahí o, si lo dejas vacío, tus datos de Ajustes / peso registrado
export function effNutri(state) {
  const n = state.nutricion;
  const f = state.formulario;
  const hist = state.peso.historial || [];
  const pesoReg = hist.length ? hist[hist.length - 1].kg : f.pesoInicialKg;
  const eff = {
    kg: pick(n.pesoActual, pesoReg),
    objetivoKg: pick(n.pesoObjetivo, state.peso.objetivoKg),
    edad: pick(n.edad, f.edad),
    alturaCm: pick(n.alturaCm, f.alturaCm),
    sexo: n.sexo || f.sexo || 'M',
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
