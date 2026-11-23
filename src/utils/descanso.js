// Texto de un descanso en minutos y segundos: 90 → "1 minuto y medio", 165 → "2 min y 45 s", 180 → "3 minutos"
export function textoDescanso(seg) {
  const s = Math.max(0, Math.round(Number(seg) || 0));
  const m = Math.floor(s / 60), r = s % 60;
  if (m === 0) return r + ' segundos';
  if (r === 0) return m === 1 ? '1 minuto' : m + ' minutos';
  if (r === 30) return m === 1 ? '1 minuto y medio' : m + ' minutos y medio';
  return m + ' min y ' + r + ' s';
}

// Opciones del selector: de 30 segundos a 5 minutos, de 15 en 15 segundos
export const OPCIONES_DESCANSO = Array.from({ length: 19 }, (_, i) => 30 + i * 15).map((v) => ({ valor: v, texto: textoDescanso(v) }));

export const DESCANSO_SERIES_DEFECTO = 180; // 3 minutos: series efectivas (top set, back-off, rest-pause, dropset)
export const DESCANSO_LADOS_DEFECTO = 60; // 1 minuto entre un lado y el otro en ejercicios unilaterales
export const DESCANSO_CALENTAMIENTO_DEFECTO = 60; // 1 minuto
export const DESCANSO_APROX_DEFECTO = 60; // 1 minuto

// Botones rápidos de cada tipo de descanso (en segundos)
export const RAPIDOS = {
  series: [60, 90, 120, 150, 180, 240],
  lados: [30, 45, 60, 90],
  calentamiento: [30, 60, 90, 120],
  aproximacion: [30, 60, 90, 120],
};

// Qué descanso toca tras marcar una serie:
// · unilateral y falta el otro lado → descanso entre lados (el del ejercicio, o el general)
// · serie de calentamiento → descanso de calentamiento
// · serie de aproximación → descanso de aproximación
// · el resto (top set, back-off, rest-pause, dropset) → descanso de series efectivas
export function descansoTrasSerie({ tipo, unilateral, ladoPendiente }, prefs = {}, descansoLadosEjercicio = null) {
  if (unilateral && ladoPendiente) return Number(descansoLadosEjercicio) || Number(prefs.descansoLados) || DESCANSO_LADOS_DEFECTO;
  if (tipo === 'warm') return Number(prefs.descansoCalentamiento) || DESCANSO_CALENTAMIENTO_DEFECTO;
  if (tipo === 'aprox') return Number(prefs.descansoAproximacion) || DESCANSO_APROX_DEFECTO;
  return Number(prefs.descanso) || DESCANSO_SERIES_DEFECTO;
}
