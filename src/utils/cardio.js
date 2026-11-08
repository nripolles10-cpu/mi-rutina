/* Días de la semana del cardio y cumplimiento.
   dias: [1..7] (1 = lunes … 7 = domingo) · hechos: ['AAAA-MM-DD', …] días en que lo has cumplido */
import { addDays, fromYmd, ymd } from './format.js';

export const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// 1 = lunes … 7 = domingo
export function diaDeLaSemana(fecha) { return ((fecha.getDay() + 6) % 7) + 1; }

export function lunesDe(fecha) { return ymd(addDays(fecha, -diaDeLaSemana(fecha) + 1)); }

export function diasDe(c) { return Array.isArray(c && c.dias) ? c.dias.filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b) : []; }
export function hechosDe(c) { return Array.isArray(c && c.hechos) ? c.hechos.filter((f) => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f)) : []; }

export function toggleDia(c, dia) {
  const d = diasDe(c);
  return d.indexOf(dia) !== -1 ? d.filter((x) => x !== dia) : d.concat([dia]).sort((a, b) => a - b);
}

// ¿Toca hoy? (está en sus días)
// Modo del cardio: 'dias' = días concretos de la semana · 'veces' = cuántos días a la semana (sin día fijo)
export function vecesDe(c) { const n = Number(c && c.veces); return Number.isInteger(n) && n >= 1 && n <= 7 ? n : 0; }
export function modoDe(c) { return c && c.modo === 'veces' && vecesDe(c) > 0 ? 'veces' : 'dias'; }
export function previstosDe(c) { return modoDe(c) === 'veces' ? vecesDe(c) : diasDe(c).length; }

export function tocaHoy(c, hoy) {
  if (modoDe(c) === 'veces') return vecesDe(c) > 0;
  return diasDe(c).indexOf(diaDeLaSemana(hoy || new Date())) !== -1;
}

// Fechas (AAAA-MM-DD) en que has hecho cualquier cardio. Sirve para marcarlas en el calendario.
export function fechasHechasCardio(cardio) {
  const fechas = {};
  (Array.isArray(cardio) ? cardio : []).forEach((c) => hechosDe(c).forEach((f) => { fechas[f] = true; }));
  return fechas;
}

export function hechoHoy(c, hoy) { return hechosDe(c).indexOf(ymd(hoy || new Date())) !== -1; }

// Marca o desmarca hoy. Guarda solo las últimas 120 entradas para que no crezca sin fin.
export function alternarHoy(c, hoy) {
  const k = ymd(hoy || new Date());
  const h = hechosDe(c);
  const nuevo = h.indexOf(k) !== -1 ? h.filter((x) => x !== k) : h.concat([k]).sort();
  return nuevo.slice(-120);
}

// Cuántos días de los que toca has cumplido esta semana (de lunes a domingo)
export function semanaDe(c, hoy) {
  const lunes = fromYmd(lunesDe(hoy || new Date()));
  const fechas = [0, 1, 2, 3, 4, 5, 6].map((i) => ymd(addDays(lunes, i)));
  const hechos = hechosDe(c);
  const hechas = fechas.filter((f) => hechos.indexOf(f) !== -1).length;
  const previstos = previstosDe(c);
  return { hechas, previstos, cumplida: previstos > 0 && hechas >= previstos };
}
