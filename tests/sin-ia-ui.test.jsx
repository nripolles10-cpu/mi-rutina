// Pantallas nuevas sin IA, montadas en la app real (jsdom): que aparecen, que no hay IA y que funcionan.
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { loadApp } from './loadApp.js';
import { effNutri } from '../src/utils/health.js';
import { ymd } from '../src/utils/format.js';
import { bloquear, comida, desbloquear, entrarDia, irA } from './nav.js';

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
  const r = render(<A.App />); await tick(); await entrarDia();
  return r;
}
async function tab(nombre) { await irA(nombre); }

describe('plan del día y diario', () => {
  test('el plan del día de la semana aparece en el diario y se puede apuntar', async () => {
    const hoy = new Date();
    const idx = (hoy.getDay() + 6) % 7;
    await montar((st) => {
      const receta = st.comida.recetas[0];
      st.comida.plan = { [idx]: { desayuno: [{ id: 'p1', recetaId: receta.id, raciones: 1 }], comida: [], cena: [], snack: [] } };
      st.comida.diario = {};
      st.nombreReceta = receta.nombre;
    });
    await tab('Comida');
    const nombre = guardado().comida.recetas[0].nombre;
    // lo planificado sale dentro de su comida (desayuno) con el botón "Comido"
    const pendiente = screen.getByTestId('plan-pendiente');
    expect(pendiente.textContent).toContain(nombre);
    expect(pendiente.textContent).toMatch(/Del plan · \d+ kcal/);
    await click(Array.from(pendiente.querySelectorAll('button')).find((b) => b.textContent === 'Comido'));
    await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    expect(guardado().comida.diario[ymd(hoy)].some((e) => e.recetaId === guardado().comida.recetas[0].id)).toBe(true);
    expect(screen.queryByTestId('plan-pendiente')).toBeNull(); // ya no está pendiente
    expect(texto()).toContain(nombre); // ahora está en el diario
    expect(screen.getByTestId('macros-dia').textContent).toMatch(/Hoy llevas/);
  });
});

describe('diana: solo recomendaciones, sin añadir', () => {
  test('no hay botón de añadir en los consejos', async () => {
    await montar();
    await tab('Diana');
    expect(document.querySelector('[data-testid="consejo-pecho"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="consejo-pecho"]').textContent).not.toMatch(/➕ Añadir/);
  });
});

describe('descanso en minutos', () => {
  test('la rutina muestra el descanso en minutos y segundos', async () => {
    await montar((st) => { st.preferencias = { ...(st.preferencias || {}), descanso: 210 }; });
    await tab('Rutina');
    expect(texto()).toContain('3 minutos y medio');
  });
});

describe('herramientas sin IA', () => {
  test('ninguna pantalla muestra IA, Gemini ni micrófono', async () => {
    await montar();
    for (const t of ['Comida', 'Cardio', 'Progreso', 'Diana', 'Rutina', 'Extras']) {
      await tab(t);
      expect(texto()).not.toMatch(/Gemini|Pregúntale a tu entrenador|Repaso semanal con IA|Cardio a mi medida|Apuntar el entreno hablando|📷 IA|Recetas con IA|Planificar mi semana con IA|Nutricionista/);
    }
  });

  test('Comida: Hoy, Semana, Recetas y Mi objetivo; el agua dentro de Hoy, debajo de las comidas', async () => {
    await montar();
    await tab('Comida');
    const apartados = Array.from(screen.getByTestId('comida-secciones').querySelectorAll('button')).map((b) => b.textContent);
    expect(apartados).toEqual(['Hoy', 'Semana', 'Recetas', 'Mi objetivo']);
    const agua = screen.getByTestId('agua');
    const ultimaComida = screen.getAllByText('🍳 Receta').slice(-1)[0];
    expect(ultimaComida.compareDocumentPosition(agua) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // los macros van arriba del todo, antes de los apartados
    expect(screen.getByTestId('macros-dia').compareDocumentPosition(screen.getByTestId('comida-secciones')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('Comida: "¿Qué tengo en casa?" encuentra recetas con lo que escribes', async () => {
    await montar();
    await tab('Comida');
    await comida('Recetas');
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
    await click(screen.getByText('📈 Análisis'));
    expect(texto()).toContain('Repaso de la semana');
    expect(texto()).toMatch(/Entrenos: \d+ de \d+ previstos/);
  });
});
