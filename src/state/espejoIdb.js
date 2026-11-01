/* =========================================================================
   COPIA ESPEJO EN INDEXEDDB (navegador e iPhone)
   Además de localStorage, el estado se guarda también en IndexedDB. Si localStorage se borra o
   no se puede leer, al arrancar se usa esta copia. Las claves de localStorage no cambian.
   Todo es opcional: si IndexedDB no existe o falla, la app sigue igual con localStorage.
   ========================================================================= */

export const IDB_NOMBRE = 'mi-rutina-copia';
export const IDB_TIENDA = 'estado';

// Elige qué copia usar: la más reciente que se pueda leer (las dos son texto JSON).
// Función pura: sin acceso a almacenamiento, para poder probarla.
export function elegirCopia({ lsRaw, lsHora, idbRaw, idbHora }) {
  const legible = (raw) => { if (!raw) return false; try { JSON.parse(raw); return true; } catch (e) { return false; } };
  const lsOk = legible(lsRaw), idbOk = legible(idbRaw);
  if (lsOk && idbOk) return (Number(idbHora) || 0) > (Number(lsHora) || 0) ? idbRaw : lsRaw;
  if (lsOk) return lsRaw;
  if (idbOk) return idbRaw;
  return null;
}

function abrir() {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(IDB_NOMBRE, 1);
      req.onupgradeneeded = () => { try { req.result.createObjectStore(IDB_TIENDA); } catch (e) { /* ya existe */ } };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}

// Lee { raw, hora } de la copia de IndexedDB, o null si no hay nada o no se puede leer
export async function idbLeer(clave) {
  const db = await abrir();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(IDB_TIENDA, 'readonly').objectStore(IDB_TIENDA).get(clave);
      req.onsuccess = () => { db.close(); resolve(req.result && typeof req.result === 'object' ? req.result : null); };
      req.onerror = () => { db.close(); resolve(null); };
    } catch (e) { db.close(); resolve(null); }
  });
}

// Guarda { raw, hora }. No espera el resultado a quien llama: si falla, localStorage sigue siendo la copia principal.
export function idbGuardar(clave, valor) {
  abrir().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(IDB_TIENDA, 'readwrite');
      tx.objectStore(IDB_TIENDA).put(valor, clave);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
      tx.onabort = () => db.close();
    } catch (e) { db.close(); }
  });
}
