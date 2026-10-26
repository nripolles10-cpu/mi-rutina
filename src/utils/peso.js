/* =========================================================================
   OBJETIVO DE PESO CORPORAL
   Un único dato compartido: peso.objetivoKg (lo que se ve en Progreso) y formulario.objetivoPesoKg
   (Ajustes) siempre tienen el mismo valor. La calculadora nutricional lo lee de aquí.
   ========================================================================= */
import { parseDecimal } from './format.js';

export const OBJETIVO_PESO_MIN = 30;
export const OBJETIVO_PESO_MAX = 300;

// Valida lo que escribe el usuario. Vacío = quitar el objetivo.
// Devuelve { ok: true, kg: número|null } o { ok: false, error }.
export function validarObjetivoPeso(entrada) {
  if (entrada === null || entrada === undefined) return { ok: true, kg: null };
  let v = entrada;
  if (typeof v === 'string') {
    if (v.trim() === '') return { ok: true, kg: null };
    v = parseDecimal(v.trim());
  }
  if (typeof v !== 'number' || !isFinite(v)) return { ok: false, error: 'Escribe un número, por ejemplo 78,5.' };
  if (v < OBJETIVO_PESO_MIN || v > OBJETIVO_PESO_MAX) return { ok: false, error: 'El objetivo tiene que estar entre ' + OBJETIVO_PESO_MIN + ' y ' + OBJETIVO_PESO_MAX + ' kg.' };
  return { ok: true, kg: Math.round(v * 10) / 10 };
}

// Peso actual: el último registrado o, si no hay, el de Ajustes
export function pesoActualDe(state) {
  const h = (state.peso && state.peso.historial) || [];
  if (h.length && typeof h[h.length - 1].kg === 'number') return h[h.length - 1].kg;
  const f = state.formulario || {};
  return typeof f.pesoInicialKg === 'number' ? f.pesoInicialKg : null;
}

export function direccionObjetivo(actual, objetivo) {
  if (!objetivo || !actual) return null;
  return actual > objetivo ? 'bajar' : actual < objetivo ? 'subir' : null;
}

// Pone (o quita, con kg = null) el objetivo de peso. Si el objetivo no cambia, devuelve el mismo estado.
// Recalcula si hay que bajar o subir y, solo si el objetivo cambia, vuelve a "no alcanzado".
export function aplicarObjetivoPeso(state, kg, pesoReferencia) {
  const nuevo = kg === undefined || kg === null ? null : kg;
  const antes = state.peso.objetivoKg === undefined ? null : state.peso.objetivoKg;
  const refActual = pesoReferencia !== undefined && pesoReferencia !== null ? pesoReferencia : pesoActualDe(state);
  const direccion = direccionObjetivo(refActual, nuevo);
  const cambia = antes !== nuevo;
  if (!cambia && state.peso.direccion === direccion && (state.formulario || {}).objetivoPesoKg === nuevo) return state;
  return {
    ...state,
    formulario: { ...state.formulario, objetivoPesoKg: nuevo },
    peso: { ...state.peso, objetivoKg: nuevo, direccion, objetivoAlcanzado: cambia ? false : !!state.peso.objetivoAlcanzado },
    // La calculadora ya no guarda un objetivo propio: usa este
    nutricion: state.nutricion && state.nutricion.pesoObjetivo !== null && state.nutricion.pesoObjetivo !== undefined
      ? { ...state.nutricion, pesoObjetivo: null } : state.nutricion,
  };
}
