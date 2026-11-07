// Gemini (IA gratuita): lógica sin pantallas + pantallas con la respuesta de Gemini simulada
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { loadApp } from './loadApp.js';
import * as G from '../src/utils/gemini.js';

let A, errores, oe, fetchOriginal, respuesta, peticiones;
beforeEach(() => {
  localStorage.clear();
  A = loadApp();
  errores = [];
  oe = console.error;
  console.error = (...a) => { errores.push(a.map(String).join(' ')); };
  fetchOriginal = globalThis.fetch;
  peticiones = [];
  respuesta = {};
  globalThis.fetch = vi.fn(async (url, op) => {
    peticiones.push({ url: String(url), body: op && op.body ? JSON.parse(op.body) : null });
    if (/\/models\?/.test(url)) return { ok: true, status: 200, json: async () => ({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-2.0-flash-lite', supportedGenerationMethods: ['generateContent'] }] }) };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(respuesta) }] } }] }) };
  });
});
afterEach(() => {
  cleanup();
  globalThis.fetch = fetchOriginal;
  console.error = oe;
  A.aplicarCatalogo(A.MUSCULOS_POR_DEFECTO);
  expect(errores, 'errores de consola:\n' + errores.join('\n')).toEqual([]);
});

const tick = () => act(async () => {});
async function click(el) { fireEvent.click(el); await tick(); await tick(); }
async function type(el, value) { fireEvent.change(el, { target: { value } }); await tick(); }
const texto = () => document.body.textContent;
async function flush() { act(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); }); }
const guardado = () => JSON.parse(localStorage.getItem(A.STORAGE_KEY));
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

describe('configuración', () => {
  test('la clave se guarda aparte, no dentro de los datos de la app', () => {
    expect(G.geminiActivo()).toBe(false);
    G.guardarConfig({ clave: 'AIzaPRUEBA' });
    expect(G.geminiActivo()).toBe(true);
    expect(localStorage.getItem('mirutina_gemini_v1')).toContain('AIzaPRUEBA');
    G.guardarConfig({ usar: false });
    expect(G.geminiActivo()).toBe(false);
  });
  test('elige el mejor modelo flash y lo recuerda', async () => {
    G.guardarConfig({ clave: 'AIzaPRUEBA', modelo: '' });
    respuesta = { recetas: [] };
    await expect(G.generarRecetas(estado(), { cuantas: 1 })).rejects.toThrow(/ninguna receta/);
    expect(G.leerConfig().modelo).toBe('gemini-2.5-flash');
    expect(peticiones[1].url).toContain('gemini-2.5-flash:generateContent');
  });
  test('errores de Gemini con mensajes claros', async () => {
    G.guardarConfig({ clave: 'AIzaPRUEBA', modelo: 'gemini-2.5-flash' });
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'quota' } }) }));
    await expect(G.preguntar(estado(), { texto: 'hola' })).rejects.toThrow(/límite gratuito/);
    expect(() => G.leerJSON('nada')).toThrow(/no ha devuelto/);
    expect(G.leerJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe('recetas', () => {
  test('usa la tabla de la app para calcular macros cuando conoce todos los ingredientes', () => {
    const r = G.normalizarRecetas({ recetas: [
      { nombre: 'Pollo con arroz', tipo: 'comida', objetivos: ['definicion', 'raro'], ingredientes: [{ n: 'pechuga de pollo', q: 200, u: 'g' }, { n: 'Arroz (peso en crudo)', q: 80, u: 'gramos' }], pasos: ['Cocer', 'Mezclar'], p: 1, c: 1, g: 1 },
      { nombre: 'Tostada rara', tipo: 'merienda', ingredientes: [{ n: 'Pan de espelta raro', q: 60, u: 'g' }], p: 6, c: 30, g: 2 },
      { nombre: '', ingredientes: [{ n: 'x' }] },
    ] });
    expect(r).toHaveLength(2);
    expect(r[0].ingredientes[0].n).toBe('Pechuga de pollo');
    expect(r[0].ingredientes[1].u).toBe('g');
    expect(r[0].calculados).toBe(true);
    expect(r[0].p).toBe(Math.round(200 * 0.225 + 80 * 0.07));
    expect(r[0].objetivos).toEqual(['definicion']);
    expect(r[1]).toMatchObject({ tipo: 'comida', calculados: false, p: 6, c: 30, g: 2 });
  });
  test('las instrucciones llevan sus macros y lo que le falta hoy', () => {
    const st = estado();
    const t = G.instruccionesRecetas(st, '2026-11-07');
    expect(t).toMatch(/Su plan diario: \d+ kcal/);
    expect(t).toMatch(/Le falta/);
    expect(t).toContain('Pechuga de pollo (g)');
    expect(t).toContain('Huevo (ud)');
  });
});

describe('comida por foto o voz', () => {
  test('etiqueta por 100 g: escala a lo que ha tomado', () => {
    const r = G.normalizarComidas({ comidas: [{ nombre: 'Yogur', momento: 'snack', gramos: 250, por100: { kcal: 60, p: 10, c: 4, g: 0.2 } }, { nombre: 'Plato de lentejas', momento: 'nada', p: 25, c: 60, g: 10, cantidad: '1 plato' }] });
    expect(r.comidas[0]).toMatchObject({ kcal: 150, p: 25, c: 10, g: 0.5, momento: 'snack' });
    expect(r.comidas[1].kcal).toBe(4 * 25 + 4 * 60 + 9 * 10);
    expect(['desayuno', 'comida', 'cena', 'snack']).toContain(r.comidas[1].momento);
  });
});

describe('entreno hablando', () => {
  test('empareja ejercicios por id o nombre, mantiene los tipos y guarda en el historial', () => {
    const st = estado();
    const day = st.days[0];
    const [a, b] = day.ids;
    const nombreB = st.exercises[b].name.toUpperCase();
    const r = G.normalizarEntreno({ fecha: '2099-01-01', ejercicios: [
      { id: a, series: [{ kg: 80, reps: 8 }, { kg: '70', reps: 10 }] },
      { id: nombreB, series: [{ kg: null, reps: 12 }, { tandas: [8, 4, 3], kg: 40 }] },
      { id: 'no_existe', series: [{ kg: 10, reps: 10 }] },
      { id: a, series: [{ kg: 1, reps: 1 }] },
    ], dudas: ['¿Era sentadilla?'] }, st, '2026-11-07');
    expect(r.fecha).toBe('2026-11-07');
    expect(r.ejercicios.map((e) => e.id)).toEqual([a, b]);
    expect(r.ejercicios[0].series[0]).toMatchObject({ weight: 80, reps: 8 });
    expect(r.ejercicios[1].series[1].tipo).toBe('rp');
    expect(r.ejercicios[1].series[1].tandas).toEqual([8, 4, 3]);
    const antes = (st.exercises[a].history || []).length;
    const out = G.aplicarEntreno(st, r, new Date('2026-11-07T18:00:00'));
    expect(out.state.exercises[a].history).toHaveLength(antes + 1);
    expect(out.state.exercises[a].currentSets[0].weight).toBe(80);
    expect(st.exercises[a].history).toHaveLength(antes); // no cambia el estado original
  });
  test('si dice "ayer" se guarda con esa fecha', () => {
    const st = estado();
    const a = st.days[0].ids[0];
    const out = G.aplicarEntreno(st, { fecha: '2026-11-06', ejercicios: [{ id: a, series: [A.normalizeSet({ weight: 50, reps: 10 }, 0)] }] }, new Date('2026-11-07T18:00:00'));
    const h = out.state.exercises[a].history;
    expect(h.some((x) => x.date.slice(0, 10) === '2026-11-06')).toBe(true);
  });
});

describe('repaso y diana', () => {
  test('datos del repaso sin romperse con datos vacíos', () => {
    const d = G.datosRepaso(estado(), new Date('2026-11-07T12:00:00'));
    expect(d.semana).toBe('2026-11-02');
    expect(Array.isArray(d.ejercicios)).toBe(true);
    expect(JSON.stringify(d)).not.toMatch(/NaN|undefined/);
    expect(G.normalizarRepaso({ titular: 'Buena', puntuacion: 14, bien: ['a', 3], plan: 'x' })).toMatchObject({ puntuacion: 10, bien: ['a'], plan: [] });
  });
  test('consejos de la diana: pide marcar algo y valida días y músculos', async () => {
    G.guardarConfig({ clave: 'AIzaPRUEBA', modelo: 'gemini-2.5-flash' });
    const st = estado();
    await expect(G.consejosDiana(st)).rejects.toThrow(/Marca primero/);
    const musc = Object.keys(A.CATS)[0];
    st.diana.estados = { [musc]: 'debil' };
    respuesta = { general: 'Ok', consejos: [{ musculo: musc, titulo: 'Más volumen', acciones: ['Sube a 12 series'], ejercicios: [{ nombre: 'Ejercicio nuevo', pauta: '3×12', dia: st.days[0].id }, { nombre: 'Otro', dia: 'inventado' }] }] };
    const r = await G.consejosDiana(st);
    expect(r.consejos[0].ejercicios[0].dia).toBe(st.days[0].id);
    expect(r.consejos[0].ejercicios[1].dia).toBe(null);
    expect(r.firma).toBe(musc + ':debil');
  });
});

describe('pantallas', () => {
  test('sin clave, avisa de cómo activarlo', async () => {
    guardarEstado();
    render(<A.App />); await tick();
    await click(screen.getByText('🎙️ Apuntar el entreno hablando'));
    expect(texto()).toMatch(/Activa Gemini \(gratis\)/);
  });

  test('apuntar entreno escrito → revisar → guardar en el historial', async () => {
    G.guardarConfig({ clave: 'AIzaPRUEBA', modelo: 'gemini-2.5-flash' });
    const st = guardarEstado();
    const a = st.days[0].ids[0];
    const antes = (st.exercises[a].history || []).length;
    respuesta = { transcripcion: '', ejercicios: [{ id: a, series: [{ kg: 100, reps: 6 }, { kg: 90, reps: 8 }] }], dudas: [] };
    render(<A.App />); await tick();
    await click(screen.getByText('🎙️ Apuntar el entreno hablando'));
    await type(screen.getByPlaceholderText('O escríbelo aquí…'), 'press 100 por 6 y 90 por 8');
    await click(screen.getByRole('button', { name: '✨ Entender' }));
    expect(texto()).toContain(st.exercises[a].name);
    expect(peticiones.some((p) => p.body && JSON.stringify(p.body).includes('press 100 por 6'))).toBe(true);
    await click(screen.getByRole('button', { name: '💾 Guardar entreno' }));
    await flush();
    const g = guardado();
    expect(g.exercises[a].history).toHaveLength(antes + 1);
    expect(g.exercises[a].history.slice(-1)[0].sets[0]).toMatchObject({ weight: 100, reps: 6 });
    expect(JSON.stringify(g)).not.toContain('AIzaPRUEBA');
  });

  test('comida con IA → al diario; recetas con IA → a mis recetas', async () => {
    G.guardarConfig({ clave: 'AIzaPRUEBA', modelo: 'gemini-2.5-flash' });
    guardarEstado();
    render(<A.App />); await tick();
    await tab('Comida');
    respuesta = { comidas: [{ nombre: 'Tortilla', momento: 'cena', p: 20, c: 5, g: 15 }] };
    await click(screen.getByRole('button', { name: /Apuntar con IA en .*Cena/ }));
    await type(screen.getByPlaceholderText(/Opcional: cuánto/), 'una tortilla de 3 huevos');
    await click(screen.getByRole('button', { name: '✨ Entender' }));
    await click(screen.getByRole('button', { name: '➕ Añadir al diario' }));
    await flush();
    const diario = guardado().comida.diario;
    const hoy = Object.keys(diario)[0];
    expect(diario[hoy][0]).toMatchObject({ nombre: 'Tortilla', momento: 'cena', kcal: 235 });

    const chipRecetas = screen.getAllByText(/Recetas/).find((el) => el.tagName === 'BUTTON' || el.closest('button'));
    await click(chipRecetas.closest('button') || chipRecetas);
    respuesta = { recetas: [{ nombre: 'Bol de skyr', tipo: 'snack', ingredientes: [{ n: 'Skyr natural', q: 200, u: 'g' }, { n: 'Frutos rojos', q: 100, u: 'g' }], pasos: ['Mezclar'] }] };
    await click(screen.getByRole('button', { name: '✨ Recetas con IA' }));
    await click(screen.getByRole('button', { name: '✨ Crear recetas' }));
    expect(texto()).toContain('Bol de skyr');
    await click(screen.getByRole('button', { name: '💾 Guardar en mis recetas' }));
    await flush();
    const rec = guardado().comida.recetas.find((r) => r.nombre === 'Bol de skyr');
    expect(rec).toMatchObject({ propia: true, p: 23, tipo: 'snack' });
  });

  test('repaso semanal en Progreso y ajustes de Gemini', async () => {
    G.guardarConfig({ clave: 'AIzaPRUEBA', modelo: 'gemini-2.5-flash' });
    guardarEstado();
    render(<A.App />); await tick();
    await tab('Progreso');
    respuesta = { titular: 'Semana sólida', puntuacion: 8, bien: ['Constancia'], mejorar: ['Proteína'], plan: ['Entrena 4 días'], ejercicios: [] };
    await click(screen.getByRole('button', { name: '✨ Hacer mi repaso semanal' }));
    expect(texto()).toContain('Semana sólida');
    expect(texto()).toContain('Entrena 4 días');
    await flush();
    expect(guardado().ia.repaso.titular).toBe('Semana sólida');
  });
});
