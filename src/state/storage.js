import { APP_VERSION } from '../data/catalog.js';
import { Native } from '../native/index.js';
import { migrateState } from '../state/migrate.js';
import { stateFromDefaults } from '../utils/defaults.js';
import defaultData from '../data/defaultData.json';

/* =========================================================================
   ARRANQUE Y COPIAS DE SEGURIDAD
   Las fotos se guardan aparte del estado principal (ver native/index.js).
   ========================================================================= */

export const BACKUP_KEY = 'gymtracker_backup_import_v1';

// Copias de rescate: si al arrancar hay datos guardados que no se pueden leer o migrar, se copian aquí
// ANTES de que la app escriba nada encima, para que nunca se pierdan (se pueden descargar desde Ajustes).
export const RECOVERY_PREFIX = 'gymtracker_rescate_';

export const RECOVERY_MAX = 3;

export let RESCUE_SEQ = 0;

export function listRescueKeys() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf(RECOVERY_PREFIX) === 0) out.push(k);
    }
  } catch (e) { /* almacenamiento no accesible */ }
  return out.sort();
}

// Guarda una copia del texto original. tipo: 'ilegible' | 'premigracion_vN' | 'error'. Devuelve la clave o null.
export function saveRescue(raw, tipo) {
  if (raw === null || raw === undefined || raw === '') return null;
  try {
    RESCUE_SEQ = (RESCUE_SEQ + 1) % 1000;
    const key = RECOVERY_PREFIX + Date.now() + '_' + String(RESCUE_SEQ).padStart(3, '0') + '_' + tipo;
    localStorage.setItem(key, typeof raw === 'string' ? raw : JSON.stringify(raw));
    const keys = listRescueKeys();
    while (keys.length > RECOVERY_MAX) { localStorage.removeItem(keys.shift()); }
    return key;
  } catch (e) { return null; }
}

// Estado inicial: lo guardado (Native.loadState) y, si no hay nada, la rutina por defecto.
// Devuelve { state, aviso }. NUNCA descarta datos guardados sin copiarlos antes a una copia de rescate.
export function readInitialState() {
  let saved = null;
  try {
    saved = Native.loadState();
  } catch (e) {
    if (e && e.inaccesible) return { state: stateFromDefaults(defaultData), aviso: 'No se puede acceder al almacenamiento: los cambios no se guardarán en este navegador.', sinGuardar: true };
    const k = saveRescue(e && e.raw, 'ilegible');
    return { state: stateFromDefaults(defaultData), aviso: k ? 'Tus datos guardados estaban dañados. Se ha guardado una copia de rescate (Ajustes → Copias de rescate) y se ha empezado de nuevo.' : 'Tus datos guardados estaban dañados y no se pudo hacer copia: NO se ha escrito nada encima. Exporta lo que puedas antes de seguir.', sinGuardar: !k };
  }
  if (saved === null) return { state: stateFromDefaults(defaultData), primeraVez: true };
  if (typeof saved !== 'object' || Array.isArray(saved) || !saved.exercises || typeof saved.exercises !== 'object') {
    const k = saveRescue(JSON.stringify(saved), 'ilegible');
    return { state: stateFromDefaults(defaultData), aviso: 'Tus datos guardados no tenían el formato esperado. Se ha guardado una copia de rescate (Ajustes → Copias de rescate).', sinGuardar: !k };
  }
  try {
    const v = Number(saved.version);
    // Antes de convertir datos de otra versión se guarda el original, por si la conversión saliera mal
    if (v !== APP_VERSION) saveRescue(JSON.stringify(saved), 'premigracion_v' + (isFinite(v) ? v : 0));
    return { state: migrateState(saved) };
  } catch (e) {
    const k = saveRescue(JSON.stringify(saved), 'error');
    return { state: stateFromDefaults(defaultData), aviso: 'No se pudieron convertir tus datos guardados. Hay una copia de rescate en Ajustes → Copias de rescate.', sinGuardar: !k };
  }
}
