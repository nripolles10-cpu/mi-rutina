import { migrateState } from '../state/migrate.js';

/* Restaurar la copia completa en JSON (la que genera "Copia completa (JSON)" en Ajustes).
   Valida el archivo y lo convierte con la misma migración que usa la app al arrancar.
   No toca nada: devuelve el estado listo para aplicar, o el motivo por el que no se puede leer. */
export function leerCopiaJson(texto) {
  let obj;
  try { obj = JSON.parse(texto); } catch (e) { return { ok: false, error: 'El archivo no es un JSON válido.' }; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'El archivo no tiene el formato de una copia de Mi Rutina.' };
  if (!obj.exercises || typeof obj.exercises !== 'object' || Array.isArray(obj.exercises) || !Array.isArray(obj.days)) {
    return { ok: false, error: 'La copia no contiene ejercicios y días de la rutina.' };
  }
  const badDay = obj.days.some((d) => !d || typeof d !== 'object' || !Array.isArray(d.ids));
  if (badDay) return { ok: false, error: 'La rutina de la copia tiene días con un formato que no se puede leer.' };
  const roto = obj.days.some((d) => d.ids.some((id) => !obj.exercises[id]));
  if (roto) return { ok: false, error: 'La copia está rota: hay días que apuntan a ejercicios que no existen.' };
  try {
    return { ok: true, state: migrateState(obj) };
  } catch (e) {
    return { ok: false, error: 'No se pudo convertir la copia al formato actual.' };
  }
}
