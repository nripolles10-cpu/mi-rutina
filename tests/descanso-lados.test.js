import { describe, test, expect } from 'vitest';
import { descansoTrasSerie, DESCANSO_LADOS_DEFECTO, DESCANSO_CALENTAMIENTO_DEFECTO } from '../src/utils/descanso.js';

const prefs = { descanso: 120, descansoLados: 45, descansoCalentamiento: 75 };

describe('descanso según la serie', () => {
  test('bilateral normal usa el descanso entre series', () => {
    expect(descansoTrasSerie({ tipo: 'top', unilateral: false }, prefs)).toBe(120);
  });
  test('serie de calentamiento usa el descanso de calentamiento', () => {
    expect(descansoTrasSerie({ tipo: 'warm', unilateral: false }, prefs)).toBe(75);
  });
  test('unilateral con el otro lado pendiente usa el descanso entre lados', () => {
    expect(descansoTrasSerie({ tipo: 'top', unilateral: true, ladoPendiente: true }, prefs)).toBe(45);
  });
  test('el tiempo del ejercicio manda sobre el general entre lados', () => {
    expect(descansoTrasSerie({ tipo: 'top', unilateral: true, ladoPendiente: true }, prefs, 20)).toBe(20);
  });
  test('sin preferencias usa los valores por defecto', () => {
    expect(descansoTrasSerie({ tipo: 'top', unilateral: true, ladoPendiente: true }, {})).toBe(DESCANSO_LADOS_DEFECTO);
    expect(descansoTrasSerie({ tipo: 'warm', unilateral: false }, {})).toBe(DESCANSO_CALENTAMIENTO_DEFECTO);
  });
  test('tras completar los dos lados vuelve al descanso entre series', () => {
    expect(descansoTrasSerie({ tipo: 'backoff', unilateral: true, ladoPendiente: false }, prefs)).toBe(120);
  });
});
