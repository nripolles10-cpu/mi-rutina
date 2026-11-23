// Pruebas de las reglas nuevas de la rutina: orden en el día desde el modo edición,
// leyenda de series, guardado solo con todas las series en azul, marcas al quitar una serie
// y bilateral / unilateral con su descanso.
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/react';
import { loadApp } from './loadApp.js';
import { desbloquear, entrarDia } from './nav.js';

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
async function salirDe(el) { fireEvent.blur(el); await tick(); }
const texto = () => document.body.textContent;
// La app guarda con un pequeño retardo: forzamos el guardado (como al cambiar de app) antes de leer
const guardado = () => {
  act(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });
  return JSON.parse(localStorage.getItem(A.STORAGE_KEY));
};

async function montar() {
  const s = A.buildInitialState(); s.formulario.nombre = 'Prueba';
  localStorage.setItem(A.STORAGE_KEY, JSON.stringify(s));
  render(<A.App />); await tick(); await entrarDia();
}

describe('modo edición: orden de los ejercicios del día', () => {
  test('tocar el puesto 1 lleva el ejercicio arriba del todo', async () => {
    await montar();
    await desbloquear();
    await click(screen.getAllByText('Aductores')[0]);
    const grupo = screen.getByRole('group', { name: 'Puestos del día' });
    await click(within(grupo).getByRole('button', { name: /^1\. / }));
    expect(guardado().days[0].ids[0]).toBe('aductores');
    expect(texto()).not.toMatch(/undefined|NaN/);
  });

  test('el puesto actual aparece marcado y no se puede tocar', async () => {
    await montar();
    await desbloquear();
    await click(screen.getAllByText('Aductores')[0]);
    const pos = guardado().days[0].ids.indexOf('aductores') + 1;
    const grupo = screen.getByRole('group', { name: 'Puestos del día' });
    const actual = within(grupo).getByRole('button', { name: new RegExp('^' + pos + '\\. ') });
    expect(actual.getAttribute('aria-current')).toBe('step');
    expect(actual.disabled).toBe(true);
  });
});

describe('modo edición: leyenda de series', () => {
  test('explica qué cuenta como serie efectiva y qué no (calentamiento y aproximación)', async () => {
    await montar();
    await desbloquear();
    await click(screen.getByText('Gemelo de pie'));
    expect(texto()).toContain('Cuentan como serie efectiva');
    expect(texto()).toContain('No cuentan');
    expect(texto()).toContain('Calentamiento');
    expect(texto()).toContain('Aproximación');
  });
});

describe('registro de hoy: guardar solo con todas las series en azul', () => {
  test('el botón espera a que todas las series estén en azul y luego guarda una sola vez', async () => {
    await montar();
    await click(screen.getByText('Gemelo de pie'));
    const boton = () => screen.getByRole('button', { name: /Guardar/ });
    expect(boton().disabled).toBe(true);
    expect(boton().textContent).toMatch(/faltan/);
    const reps = within(screen.getByText('Gemelo de pie').closest('.card')).getAllByPlaceholderText('reps');
    for (const r of reps) { await type(r, '8'); await salirDe(r); }
    expect(boton().disabled).toBe(false);
    await click(boton());
    expect(screen.getByRole('button', { name: /Registro de hoy guardado/ }).disabled).toBe(true);
    const hoy = guardado().exercises.gemelo.history.filter((h) => !h.seed && h.date && new Date(h.date).toDateString() === new Date().toDateString());
    expect(hoy.length).toBe(1);
  });
});

describe('series: las marcas de hoy siguen a su serie al quitar otra', () => {
  test('al quitar la serie 1, la que estaba confirmada en 3 pasa a ser la 2 y sigue en azul', async () => {
    await montar();
    await desbloquear();
    await click(screen.getByText('Gemelo de pie'));
    const card = screen.getByText('Gemelo de pie').closest('.card');
    const n = guardado().exercises.gemelo.currentSets.length;
    expect(n).toBeGreaterThanOrEqual(2);
    const ultimo = within(card).getAllByPlaceholderText('reps')[n - 1];
    await type(ultimo, '8'); await salirDe(ultimo);
    expect(guardado().exercises.gemelo.marcasHoy.sets).toEqual([n - 1]);
    await click(within(card).getAllByTitle('Quitar esta serie')[0]);
    expect(guardado().exercises.gemelo.marcasHoy.sets).toEqual([n - 2]);
  });
});

describe('bilateral / unilateral', () => {
  test('al pasar a unilateral aparece el descanso entre lados; bilateral no lo muestra', async () => {
    await montar();
    await desbloquear();
    await click(screen.getByText('Gemelo de pie'));
    await click(screen.getByRole('radio', { name: /Unilateral/ }));
    expect(guardado().exercises.gemelo.lado).toBe('unilateral');
    expect(texto()).toContain('Descanso entre un lado y el otro');
    await click(screen.getByRole('radio', { name: /Bilateral/ }));
    expect(guardado().exercises.gemelo.lado).toBe('bilateral');
    expect(texto()).not.toContain('Descanso entre un lado y el otro');
  });
});
