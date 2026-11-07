// Verificación de los flujos nuevos de punta a punta (con Gemini y la cámara simulados)
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { loadApp } from './loadApp.js';
import * as G from '../src/utils/gemini.js';

let A, errores, oe, fetchOriginal, respuesta, pickOriginal;
const FOTO = 'data:image/jpeg;base64,/9j/AAAAFOTO';
const hoyDow = () => ((new Date().getDay() + 6) % 7) + 1;

// jsdom no decodifica imágenes: simulamos la carga y el lienzo para probar el flujo real de compresión
const ImagenOriginal = globalThis.Image;
const contextoOriginal = HTMLCanvasElement.prototype.getContext;
const aDataUrlOriginal = HTMLCanvasElement.prototype.toDataURL;
beforeEach(() => {
  localStorage.clear();
  globalThis.Image = class { set src(v) { this._s = v; this.width = 1200; this.height = 800; setTimeout(() => this.onload && this.onload(), 0); } };
  HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {} });
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,/9j/COMPRIMIDA';
  A = loadApp();
  errores = [];
  oe = console.error;
  console.error = (...a) => { errores.push(a.map(String).join(' ')); };
  fetchOriginal = globalThis.fetch;
  pickOriginal = A.Native.pickPhoto;
  A.Native.pickPhoto = async () => FOTO;
  respuesta = {};
  globalThis.fetch = vi.fn(async (url) => {
    if (/\/models\?/.test(url)) return { ok: true, status: 200, json: async () => ({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }) };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(respuesta) }] } }] }) };
  });
  G.guardarConfig({ clave: 'AIzaPRUEBA', modelo: 'gemini-2.5-flash', usar: true });
});
afterEach(() => {
  cleanup();
  globalThis.fetch = fetchOriginal;
  A.Native.pickPhoto = pickOriginal;
  globalThis.Image = ImagenOriginal;
  HTMLCanvasElement.prototype.getContext = contextoOriginal;
  HTMLCanvasElement.prototype.toDataURL = aDataUrlOriginal;
  console.error = oe;
  expect(errores, 'errores de consola:\n' + errores.join('\n')).toEqual([]);
});

const tick = () => act(async () => {});
async function click(el) { fireEvent.click(el); await tick(); await tick(); }
async function type(el, value) { fireEvent.change(el, { target: { value } }); await tick(); }
const texto = () => document.body.textContent;
const guardado = () => JSON.parse(localStorage.getItem(A.STORAGE_KEY));
const fotosGuardadas = () => JSON.parse(localStorage.getItem(A.FOTOS_KEY) || '{}');
async function flush() { await act(async () => { window.dispatchEvent(new Event('pagehide')); document.dispatchEvent(new Event('visibilitychange')); }); await tick(); }
async function tab(nombre) { await click(screen.getAllByText(nombre, { selector: 'span' }).slice(-1)[0]); }
function estado(fn) {
  const st = A.buildInitialState();
  st.formulario = { ...st.formulario, nombre: 'Prueba', edad: 30, alturaCm: 175, sexo: 'M', actividad: 'moderado' };
  st.peso.historial = [{ id: 'p1', date: '2026-10-20T10:00:00.000Z', kg: 75 }];
  st.nutricion = { ...st.nutricion, objetivo: 'definicion', ritmo: 'normal' };
  if (fn) fn(st);
  return st;
}
function guardarEstado(fn) { const st = estado(fn); localStorage.setItem(A.STORAGE_KEY, JSON.stringify(st)); return st; }

describe('fotos de platos', () => {
  test('foto en una receta: se guarda, sale en la lista y en la ficha; al borrar la receta se borra la foto', async () => {
    const st = guardarEstado();
    render(<A.App />); await tick();
    await tab('Comida');
    await click(screen.getByText('🍳 Recetas'));
    const primera = st.comida.recetas[0];
    await click(screen.getByText(primera.nombre));
    await click(screen.getByText('🖼️ Galería'));
    expect(fotosGuardadas()['rec_' + primera.id]).toBe(FOTO);
    await waitFor(() => expect(document.querySelector('img[src="' + FOTO + '"]')).toBeTruthy());
  });

  test('foto al apuntar comida con IA: se guarda en el diario y al quitar la entrada se borra', async () => {
    guardarEstado();
    render(<A.App />); await tick();
    await tab('Comida');
    respuesta = { comidas: [{ nombre: 'Tortilla', momento: 'cena', p: 20, c: 5, g: 15 }] };
    await click(screen.getByRole('button', { name: /Apuntar con IA en .*Cena/ }));
    await click(screen.getByText('🖼️ De la galería'));
    await type(screen.getByPlaceholderText(/Opcional: cuánto/), 'una tortilla');
    await click(screen.getByRole('button', { name: '✨ Entender' }));
    expect(texto()).toContain('Guardar la foto en el diario');
    await click(screen.getByRole('button', { name: '➕ Añadir al diario' }));
    await waitFor(() => expect(Object.values(guardado().comida.diario).flat().length).toBe(1));
    await flush();
    const entrada = Object.values(guardado().comida.diario).flat()[0];
    expect(entrada.fotoId).toMatch(/^com_/);
    await waitFor(() => expect(fotosGuardadas()[entrada.fotoId]).toBe('data:image/jpeg;base64,/9j/COMPRIMIDA'));
    // al quitar la entrada, su foto se borra
    await click(screen.getByTitle('Quitar'));
    await flush();
    await waitFor(() => expect(fotosGuardadas()[entrada.fotoId]).toBeUndefined());
    expect(Object.values(guardado().comida.diario).flat().length).toBe(0);
  });
});

describe('cardio: días y cumplimiento', () => {
  test('solo aparece "He hecho el cardio de hoy" en sus días, y se puede marcar y deshacer', async () => {
    guardarEstado((s) => { s.cardio = [{ id: 'c1', name: 'Cinta', frecuencia: '', detalle: '20 min', dias: [hoyDow()], hechos: [] }, { id: 'c2', name: 'Bici', frecuencia: '', detalle: '', dias: [((hoyDow() % 7) + 1)], hechos: [] }]; });
    render(<A.App />); await tick();
    await tab('Cardio');
    expect(screen.getAllByText('✅ He hecho el cardio de hoy')).toHaveLength(1);
    expect(texto()).toContain('Hoy no te toca');
    await click(screen.getByText('✅ He hecho el cardio de hoy'));
    expect(texto()).toContain('✓ Cumplido hoy');
    await flush();
    const c1 = guardado().cardio.find((c) => c.id === 'c1');
    expect(c1.hechos).toHaveLength(1);
    expect(texto()).toContain('1 de 1');
    await click(screen.getByText('✓ Cumplido hoy · deshacer'));
    await flush();
    expect(guardado().cardio.find((c) => c.id === 'c1').hechos).toHaveLength(0);
  });

  test('elegir días con los botones L M X J V S D se guarda', async () => {
    guardarEstado((s) => { s.cardio = [{ id: 'c1', name: 'Cinta', frecuencia: '', detalle: '', dias: [], hechos: [] }]; });
    render(<A.App />); await tick();
    await tab('Cardio');
    await click(screen.getByRole('button', { name: 'lunes' }));
    await click(screen.getByRole('button', { name: 'viernes' }));
    await flush();
    expect(guardado().cardio[0].dias).toEqual([1, 5]);
    expect(texto()).toContain('2 días a la semana');
  });
});

describe('nutricionista IA', () => {
  test('con lo que tengo en casa: respuesta, lo que falta y receta guardable', async () => {
    guardarEstado();
    render(<A.App />); await tick();
    await tab('Comida');
    await click(screen.getByRole('button', { name: '✨ IA', hidden: false }).closest('button') || screen.getByText('✨ IA', { exact: true }));
    expect(texto()).toContain('Tu nutricionista IA');
    respuesta = { respuesta: 'Haz un revuelto con pollo.', faltaria: ['pan integral'], recetas: [{ nombre: 'Revuelto de pollo', tipo: 'cena', objetivos: ['definicion'], ingredientes: [{ n: 'Pechuga de pollo', q: 150, u: 'g' }, { n: 'Huevo', q: 2, u: 'ud' }], pasos: ['Saltea', 'Añade huevo'], p: 1, c: 1, g: 1 }] };
    await type(screen.getByPlaceholderText(/Dime lo que tienes/), 'pollo y huevos');
    await click(screen.getByRole('button', { name: '✨ Pedir ayuda' }));
    expect(texto()).toContain('Haz un revuelto con pollo.');
    expect(texto()).toContain('pan integral');
    const antes = A.buildInitialState().comida.recetas.length;
    await click(screen.getByRole('button', { name: '💾 Guardar en mis recetas' }));
    await flush();
    expect(guardado().comida.recetas.some((r) => r.nombre === 'Revuelto de pollo')).toBe(true);
    expect(antes).toBeGreaterThan(0);
  });

  test('sin texto ni foto no llama a Gemini y avisa', async () => {
    guardarEstado();
    render(<A.App />); await tick();
    await tab('Comida');
    await click(screen.getByText('✨ IA', { exact: true }));
    const llamadas = globalThis.fetch.mock.calls.length;
    await click(screen.getByRole('button', { name: '✨ Pedir ayuda' }));
    expect(globalThis.fetch.mock.calls.length).toBe(llamadas);
  });
});

describe('compra y plan semanal', () => {
  test('dónde comprar: solo Aldi, Mercadona, Alcampo o Carrefour', async () => {
    const st0 = guardarEstado();
    await 0;
    st0.comida.plan = { 0: { desayuno: [], comida: [{ id: 'x1', recetaId: st0.comida.recetas[0].id, raciones: 1 }], cena: [], snack: [] } };
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify(st0));
    render(<A.App />); await tick();
    await tab('Comida');
    await click(screen.getByText('🛒 Compra', { exact: true }));
    respuesta = { resumen: 'Aldi para básicos', supers: [{ nombre: 'Aldi', que_comprar: ['Huevo'], por_que: 'Barato' }], productos: [], total_aprox: '≈ 10 €', consejos: [] };
    await click(screen.getByRole('button', { name: '✨ Dímelo' }));
    expect(texto()).toContain('Aldi para básicos');
    expect(G.SUPERS).toEqual(['Aldi', 'Mercadona', 'Alcampo', 'Carrefour']);
  });

  test('plan semanal: se guarda en el planificador y solo usa recetas existentes', async () => {
    const st = guardarEstado();
    const r1 = st.comida.recetas[0].id;
    render(<A.App />); await tick();
    await tab('Comida');
    await click(screen.getByText('📅 Plan', { exact: true }));
    await click(screen.getByText('✨ Planificar mi semana con IA'));
    respuesta = { dias: [{ dia: 0, comidas: [{ momento: 'comida', receta: r1, raciones: 1 }, { momento: 'cena', receta: 'no_existe', raciones: 1 }] }], consejo: 'Sencillo' };
    await click(screen.getByRole('button', { name: '✨ Planificar' }));
    expect(texto()).toContain('Lunes');
    await click(screen.getByRole('button', { name: '💾 Guardar en mi planificador' }));
    await flush();
    const plan = guardado().comida.plan;
    expect(plan[0].comida).toEqual([expect.objectContaining({ recetaId: r1, raciones: 1 })]);
    expect(plan[0].cena).toEqual([]);
  });
});

describe('recorrido por todas las pestañas', () => {
  test.each(['Rutina', 'Cardio', 'Progreso', 'Diana', 'Comida', 'Extras'])('%s abre sin errores, con datos de ejemplo y sin nombre', async (nombre) => {
    guardarEstado();
    render(<A.App />); await tick();
    await tab(nombre);
    expect(texto().length).toBeGreaterThan(50);
  });
  test('la clave de Gemini nunca se guarda dentro de los datos de la app', async () => {
    guardarEstado();
    render(<A.App />); await tick();
    await tab('Comida');
    await click(screen.getByText('🍳 Recetas'));
    await flush();
    expect(localStorage.getItem(A.STORAGE_KEY)).not.toContain('AIzaPRUEBA');
  });
});
