// Lados de los ejercicios unilaterales (brazo / pierna, empezar por izquierdo o derecho)
// y peso en azul el mismo día (solo recordatorio: nunca bloquea editar).
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/react';
import { loadApp } from './loadApp.js';
import { desbloquear, entrarDia } from './nav.js';
import { nombreLado, pasosUnilateral, parteDelCuerpo } from '../src/utils/lados.js';
import { quitarIndice, pesoAzul } from '../src/utils/entreno.js';
import { ymd } from '../src/utils/format.js';

describe('utils: lados', () => {
  test('pierna para tren inferior, brazo para tren superior, lado para el resto', () => {
    expect(parteDelCuerpo('gemelos')).toBe('pierna');
    expect(parteDelCuerpo('cuadriceps')).toBe('pierna');
    expect(parteDelCuerpo('biceps')).toBe('brazo');
    expect(parteDelCuerpo('espalda')).toBe('brazo');
    expect(parteDelCuerpo('core')).toBe('lado');
  });

  test('nombres de lado con el género correcto', () => {
    expect(nombreLado('gemelos', 'izquierdo')).toBe('pierna izquierda');
    expect(nombreLado('gemelos', 'derecho')).toBe('pierna derecha');
    expect(nombreLado('biceps', 'izquierdo')).toBe('brazo izquierdo');
    expect(nombreLado('biceps', 'derecho')).toBe('brazo derecho');
  });

  test('por defecto se empieza por el izquierdo; con ladoInicio derecho se invierte', () => {
    expect(pasosUnilateral({ cat: 'biceps' }).map((p) => p.texto)).toEqual(['brazo izquierdo', 'brazo derecho']);
    expect(pasosUnilateral({ cat: 'biceps', ladoInicio: 'derecho' }).map((p) => p.texto)).toEqual(['brazo derecho', 'brazo izquierdo']);
  });

  test('quitar una serie baja las marcas posteriores y borra la suya', () => {
    expect(quitarIndice([0, 2], 0)).toEqual([1]);
    expect(quitarIndice([1, 2], 1)).toEqual([1]);
    expect(quitarIndice([], 0)).toEqual([]);
  });

  test('peso en azul solo el mismo día', () => {
    const hoy = ymd(new Date());
    expect(pesoAzul({ marcasHoy: { fecha: hoy, sets: [], pesos: [1] } }, 1, hoy)).toBe(true);
    expect(pesoAzul({ marcasHoy: { fecha: '2020-01-01', sets: [], pesos: [1] } }, 1, hoy)).toBe(false);
  });
});

let A, errores, oe;
beforeEach(() => {
  localStorage.clear();
  A = loadApp();
  errores = [];
  oe = console.error;
  console.error = (...a) => { errores.push(a.map(String).join(' ')); };
});
afterEach(() => {
  cleanup();
  console.error = oe;
  vi.useRealTimers();
  expect(errores, 'errores de consola:\n' + errores.join('\n')).toEqual([]);
});

const tick = () => act(async () => {});
async function click(el) { fireEvent.click(el); await tick(); }
async function type(el, value) { fireEvent.change(el, { target: { value } }); await tick(); }
const texto = () => document.body.textContent;
const guardado = () => {
  act(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });
  return JSON.parse(localStorage.getItem(A.STORAGE_KEY));
};
async function montar(retoque) {
  const s = A.buildInitialState(); s.formulario.nombre = 'Prueba';
  if (retoque) retoque(s);
  localStorage.setItem(A.STORAGE_KEY, JSON.stringify(s));
  render(<A.App />); await tick(); await entrarDia();
}
const tarjetaGemelo = () => screen.getByText('Gemelo de pie').closest('.card');

describe('tarjeta: serie unilateral con pasos visibles', () => {
  test('muestra cada serie en sus dos lados, en el orden elegido', async () => {
    await montar();
    await desbloquear();
    await click(screen.getByText('Gemelo de pie'));
    await click(screen.getByRole('radio', { name: /Unilateral/ }));
    expect(texto()).toContain('Serie 1 · pierna izquierda');
    expect(texto()).toContain('Serie 1 · pierna derecha');
    await click(screen.getByRole('radio', { name: /Derecho/ }));
    expect(guardado().exercises.gemelo.ladoInicio).toBe('derecho');
    expect(texto()).toContain('Orden de cada serie: pierna derecha → pierna izquierda');
  });
});

describe('peso en azul sin bloquear', () => {
  test('al cambiar el peso se marca el mismo día, se puede volver a cambiar y borrar', async () => {
    await montar();
    await click(screen.getByText('Gemelo de pie'));
    const peso = within(tarjetaGemelo()).getAllByPlaceholderText('kg')[0];
    await type(peso, '105');
    expect(guardado().exercises.gemelo.marcasHoy.pesos).toEqual([0]);
    expect(peso.style.color).toMatch(/147|93c5fd/i);
    await type(peso, '107,5');
    expect(peso.value).toBe('107,5');
    expect(guardado().exercises.gemelo.currentSets[0].weight).toBe(107.5);
    await type(peso, '');
    expect(guardado().exercises.gemelo.marcasHoy.pesos).toEqual([]);
  });

  test('en vivo, el peso se marca al cambiarlo', async () => {
    await montar();
    await click(screen.getByRole('button', { name: /Empezar entreno en vivo/ }));
    await click(screen.getAllByRole('button', { name: 'Sumar 2,5' })[0]);
    expect(guardado().exercises.gemelo.marcasHoy.pesos).toEqual([0]);
  });
});

describe('entreno en vivo: lado que toca ahora', () => {
  test('una serie unilateral empieza por el brazo/pierna izquierda y luego pasa a la derecha', async () => {
    await montar((st) => { st.exercises.gemelo.lado = 'unilateral'; });
    await click(screen.getByRole('button', { name: /Empezar entreno en vivo/ }));
    expect(screen.getByTestId('vivo-lado').textContent).toBe('pierna izquierda');
    await click(screen.getByTestId('vivo-hecha'));
    expect(screen.getByTestId('vivo-lado').textContent).toBe('pierna derecha');
    expect(texto()).toContain('✓ pierna izquierda');
  });
});
