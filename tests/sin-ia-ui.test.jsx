// Pantallas nuevas sin IA, montadas en la app real (jsdom): que aparecen, que no hay IA y que funcionan.
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { loadApp } from './loadApp.js';
import { effNutri } from '../src/utils/health.js';
import { ymd } from '../src/utils/format.js';

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
const texto = () => document.body.textContent;
const guardado = () => JSON.parse(localStorage.getItem(A.STORAGE_KEY));

async function montar(retoque) {
  const s = A.buildInitialState(); s.formulario.nombre = 'Prueba';
  s.diana = { ...(s.diana || {}), estados: { pecho: 'debil' } };
  s.nutricion = { ...s.nutricion, pesoActual: 80, edad: 30, alturaCm: 178, actividad: 'moderado', objetivo: s.nutricion.objetivo || 'definicion' };
  s.formulario.sexo = 'hombre';
  s.comida.diario = { [ymd(new Date())]: [{ id: 'e1', momento: 'desayuno', nombre: 'Café con leche', kcal: 120, p: 6, c: 9, g: 5 }] };
  if (retoque) retoque(s);
  localStorage.setItem(A.STORAGE_KEY, JSON.stringify(s));
  const r = render(<A.App />); await tick();
  return r;
}
async function tab(nombre) { await click(screen.getAllByText(nombre, { selector: 'span' }).slice(-1)[0]); }

describe('herramientas sin IA', () => {
  test('ninguna pantalla muestra IA, Gemini ni micrófono', async () => {
    await montar();
    for (const t of ['Comida', 'Cardio', 'Progreso', 'Diana', 'Rutina', 'Extras']) {
      await tab(t);
      expect(texto()).not.toMatch(/Gemini|Pregúntale a tu entrenador|Repaso semanal con IA|Cardio a mi medida|Apuntar el entreno hablando|📷 IA|Recetas con IA|Planificar mi semana con IA|Nutricionista/);
    }
  });

  test('Comida: el agua va justo después del diario', async () => {
    await montar();
    await tab('Comida');
    const botones = Array.from(document.querySelectorAll('.gt-scroll button')).map((b) => b.textContent.trim()).filter((x) => /^[📓💧🍳📅🛒]/u.test(x));
    expect(botones.slice(0, 5)).toEqual(['📓 Diario', '💧 Agua', '🍳 Recetas', '📅 Plan', '🛒 Compra']);
  });

  test('Comida: "¿Qué tengo en casa?" encuentra recetas con lo que escribes', async () => {
    await montar();
    await tab('Comida');
    await click(screen.getByRole('button', { name: /🍳 Recetas/ }));
    await click(screen.getByRole('button', { name: /¿Qué tengo en casa\?/ }));
    fireEvent.change(screen.getByPlaceholderText(/Ej\.: pollo/), { target: { value: 'pollo, arroz' } });
    await tick();
    expect(texto()).toMatch(/Tienes \d+ de \d+ ingredientes/);
  });

  test('Comida: "Lo que te queda hoy" con sugerencias cuando la calculadora está rellena', async () => {
    await montar();
    await tab('Comida');
    expect(effNutri(guardado()).plan.falta).toBe(false);
    expect(texto()).toContain('Lo que te queda hoy');
    expect(texto()).toMatch(/Kcal: /);
    expect(texto()).toContain('Añadir');
  });

  test('Cardio: eliges el objetivo y añades uno de los 5 tipos', async () => {
    await montar();
    await tab('Cardio');
    await click(screen.getByRole('button', { name: /Elegir tipo de cardio/ }));
    expect(texto()).toContain('Intervalos en cinta');
    await click(screen.getAllByRole('button', { name: '➕ Añadir a mi cardio' })[0]);
    await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    expect((guardado().cardio || []).some((c) => c.name === 'Intervalos en cinta')).toBe(true);
  });

  test('Diana: consejos solo para el músculo marcado como débil', async () => {
    await montar();
    await tab('Diana');
    expect(document.querySelector('[data-testid="consejo-pecho"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="consejo-gluteo"]')).toBeNull();
  });

  test('Progreso: el resumen de la semana sale con cifras, sin llamar a nadie', async () => {
    await montar();
    await tab('Progreso');
    expect(texto()).toContain('Resumen de la semana');
    expect(texto()).toMatch(/Entrenos: \d+ de \d+ previstos/);
  });
});
