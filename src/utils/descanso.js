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
