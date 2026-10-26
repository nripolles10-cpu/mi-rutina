/* Recordatorio de copia de seguridad para la versión web (iPhone y navegadores):
   allí el navegador puede borrar los datos de una web que no se usa, así que conviene tener una copia por código. */

export const DIAS_SIN_COPIA = 14;
export const DIAS_POSPONER = 7;

// ¿Hay datos propios que merezca la pena guardar? (registros de ejercicios, más de un peso o comidas apuntadas)
export function tieneDatosPropios(state) {
  const exs = state.exercises || {};
  const hist = Object.keys(exs).some((id) => (exs[id].history || []).some((h) => h && !h.seed));
  const pesos = ((state.peso && state.peso.historial) || []).length > 1;
  const diario = Object.keys((state.comida && state.comida.diario) || {}).length > 0;
  return hist || pesos || diario;
}

// true si hay que enseñar el recordatorio: hay datos propios, la última copia tiene más de 14 días (o no hay)
// y no se ha pospuesto.
export function necesitaRecordatorioCopia(state, ahoraMs) {
  const p = state.preferencias || {};
  const ahora = ahoraMs || Date.now();
  if (p.avisoCopiaHasta && new Date(p.avisoCopiaHasta).getTime() > ahora) return false;
  if (!tieneDatosPropios(state)) return false;
  if (!p.ultimaCopia) return true;
  const t = new Date(p.ultimaCopia).getTime();
  return !isFinite(t) || ahora - t > DIAS_SIN_COPIA * 86400000;
}

export function diasDesde(iso, ahoraMs) {
  const t = new Date(iso).getTime();
  if (!iso || !isFinite(t)) return null;
  return Math.floor(((ahoraMs || Date.now()) - t) / 86400000);
}
