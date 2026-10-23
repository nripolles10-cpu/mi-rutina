/* =========================================================================
   BOTÓN ATRÁS DE ANDROID
   Cada ventana, diálogo o pantalla abierta se apunta en una pila. Al pulsar Atrás
   se cierra la última que se abrió. Solo si no queda ninguna, la app se cierra.
   En el PC la tecla Escape hace lo mismo (sin cerrar nunca la pestaña).
   ========================================================================= */
import { useEffect, useRef } from 'react';

const pila = [];

export function pushBack(fn) {
  const entrada = { fn };
  pila.push(entrada);
  return () => {
    const i = pila.indexOf(entrada);
    if (i >= 0) pila.splice(i, 1);
  };
}

// Cierra lo último abierto. Devuelve true si había algo que cerrar.
export function handleBack() {
  if (!pila.length) return false;
  const top = pila[pila.length - 1];
  try { top.fn(); } catch (e) { /* una ventana que falla al cerrarse no bloquea el botón */ }
  return true;
}

export function backStackSize() { return pila.length; }

// Mientras `activo` sea true, el botón Atrás ejecuta `fn` (cerrar esta ventana).
export function useBackHandler(activo, fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!activo) return undefined;
    return pushBack(() => ref.current && ref.current());
  }, [activo]);
}
