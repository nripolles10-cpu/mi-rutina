// Pruebas de interfaz de las mejoras de la versión 8 (app real montada en jsdom)
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { loadApp } from './loadApp.js';

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
  A.aplicarCatalogo(A.MUSCULOS_POR_DEFECTO);
  expect(errores, 'errores de consola:\n' + errores.join('\n')).toEqual([]);
});

const tick = () => act(async () => {});
async function click(el) { fireEvent.click(el); await tick(); }
async function type(el, value) { fireEvent.change(el, { target: { value } }); await tick(); }
const btn = (name) => screen.getByRole('button', { name });
const texto = () => document.body.textContent;
function sinBasura() { expect(texto()).not.toMatch(/undefined|NaN|Infinity|\[object Object\]/); }
async function montar() { const r = render(<A.App />); await tick(); return r; }
async function tab(nombre) { await click(screen.getAllByText(nombre, { selector: 'span' }).slice(-1)[0]); sinBasura(); }
const guardado = () => JSON.parse(localStorage.getItem(A.STORAGE_KEY));
async function flush() { act(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); }); }

// Datos guardados de un usuario con todo lo necesario para la calculadora
function guardarEstado(fn) {
  const st = A.buildInitialState();
  st.formulario = { ...st.formulario, edad: 30, alturaCm: 175, sexo: 'M', actividad: 'moderado' };
  st.peso.historial = [{ id: 'p1', date: '2026-10-20T10:00:00.000Z', kg: 75 }];
  st.nutricion = { ...st.nutricion, objetivo: 'definicion', ritmo: 'normal' };
  if (fn) fn(st);
  localStorage.setItem(A.STORAGE_KEY, JSON.stringify(st));
  return st;
}

describe('1) objetivo de peso en la tarjeta de Progreso', () => {
  test('cambiarlo con coma, que se guarde en el mismo sitio que Ajustes, y deshacer', async () => {
    await montar();
    await tab('Progreso');
    await click(screen.getByTitle('Cambiar el objetivo de peso'));
    const campo = screen.getByLabelText('Objetivo de peso en kg');
    await type(campo, 'abc');
    await click(btn('Guardar'));
    expect(texto()).toMatch(/Escribe un número/);
    await type(campo, '78,5');
    expect(texto()).toMatch(/Bajar 5,5 kg/);
    await click(btn('Guardar'));
    expect(screen.getByTitle('Cambiar el objetivo de peso').textContent).toContain('78,5 kg');
    await flush();
    expect(guardado().peso.objetivoKg).toBe(78.5);
    expect(guardado().formulario.objetivoPesoKg).toBe(78.5);
    // Ajustes muestra el mismo objetivo
    await click(btn('↩ Deshacer'));
    expect(screen.getByTitle('Cambiar el objetivo de peso').textContent).toContain('80 kg');
    await flush();
    expect(guardado().peso.objetivoKg).toBe(80);
    sinBasura();
  });

  test('quitar el objetivo y volver a ponerlo; Ajustes lo ve', async () => {
    await montar();
    await tab('Progreso');
    await click(screen.getByTitle('Cambiar el objetivo de peso'));
    await click(btn('Quitar objetivo'));
    expect(screen.getByTitle('Cambiar el objetivo de peso').textContent).toContain('🎯 Objetivo');
    await click(screen.getByTitle('Cambiar el objetivo de peso'));
    await type(screen.getByLabelText('Objetivo de peso en kg'), '90');
    await click(btn('Guardar'));
    await click(screen.getByTitle('Ajustes'));
    const campo = screen.getByText('¿A qué peso quieres llegar? (kg)').parentElement.querySelector('input');
    expect(campo.value).toBe('90');
    await flush();
    expect(guardado().peso.direccion).toBe('subir');
  });
});

describe('2) calorías y sexo sincronizado', () => {
  test('cambiar a Mujer en la calculadora baja las calorías y cambia también Ajustes (y al revés)', async () => {
    guardarEstado();
    await montar();
    await tab('Extras');
    expect(texto()).toContain('2098 kcal');
    await click(screen.getAllByText('Mujer').slice(-1)[0]);
    expect(texto()).toContain('1849 kcal');
    await flush();
    expect(guardado().formulario.sexo).toBe('F');
    // En Ajustes aparece Mujer; si allí se vuelve a Hombre, la calculadora lo refleja
    await click(screen.getByTitle('Ajustes'));
    await click(screen.getAllByText('Hombre')[0]);
    await click(btn('Guardar cambios')); // guarda y vuelve a la app
    if (screen.queryByText('✕ Cerrar')) await click(screen.getByText('✕ Cerrar'));
    expect(texto()).toContain('2098 kcal');
    sinBasura();
  });

  test('con % de grasa se explica el cálculo por masa magra; con un ritmo peligroso, aviso de mínimo', async () => {
    guardarEstado((st) => { st.formulario.grasaPct = 20; st.formulario.sexo = 'F'; });
    await montar();
    await tab('Extras');
    expect(screen.getByTestId('nota-masa-magra').textContent).toMatch(/masa magra.*60 kg.*1533 kcal/);
    cleanup();
    localStorage.clear();
    guardarEstado((st) => { st.formulario = { ...st.formulario, sexo: 'F', edad: 30, alturaCm: 160, actividad: 'sedentario' }; st.peso.historial = [{ id: 'a', date: '2026-10-20T10:00:00.000Z', kg: 55 }]; st.nutricion.ritmo = 'rapido'; });
    await montar();
    await tab('Extras');
    expect(texto()).toMatch(/por debajo del mínimo seguro/);
    expect(texto()).toContain('1239 kcal');
    sinBasura();
  });
});

describe('3) músculos personalizables', () => {
  test('crear "Pecho superior", marcarlo débil, que pinte el pecho y que salga al elegir músculo de un ejercicio', async () => {
    await montar();
    await tab('Diana');
    await click(btn('✏️ Crear, renombrar o quitar músculos'));
    await type(screen.getByLabelText('Nombre del músculo nuevo'), 'Pecho superior');
    fireEvent.change(screen.getByLabelText('Zona del mapa del músculo nuevo'), { target: { value: 'pecho' } }); await tick();
    await click(btn('＋ Añadir músculo'));
    await flush();
    const nuevo = guardado().musculos.find((m) => m.label === 'Pecho superior');
    expect(nuevo.region).toBe('pecho');
    await click(screen.getByText('✕ Cerrar'));
    // tocar la zona del pecho en el mapa: alterna entre los músculos de esa zona
    const zona = document.querySelector('[data-region="pecho"] path');
    await click(zona); // el seleccionado era Hombro → primer músculo del pecho
    await click(zona);
    expect(texto()).toContain('Pecho superior');
    await click(btn('Punto débil'));
    await flush();
    expect(guardado().diana.estados[nuevo.id]).toBe('debil');
    expect(texto()).toMatch(/Puntos débiles \(1\)/);
    // con Pecho sin marcar y Pecho superior débil, la zona sale a franjas
    expect(document.querySelector('[data-region="pecho"] linearGradient')).toBeTruthy();
    // aparece en el selector de músculos al editar un ejercicio
    await tab('Rutina');
    await click(screen.getByText(/Bloqueado/));
    await click(screen.getByText('➕ Añadir ejercicio a este día'));
    await type(screen.getByPlaceholderText('ej. Press militar'), 'Press inclinado con mancuernas');
    await click(btn('Pecho superior'));
    await click(btn('Añadir ejercicio'));
    await flush();
    const g = guardado();
    const creado = Object.values(g.exercises).find((e) => e.name === 'Press inclinado con mancuernas');
    expect(creado.cat).toBe(nuevo.id);
    // y cuenta en las series por semana de Progreso
    await tab('Progreso');
    expect(texto()).toContain('Pecho superior');
    sinBasura();
  });

  test('quitar "Pecho" pide a qué músculo pasan sus ejercicios; renombrar; deshacer', async () => {
    await montar();
    await tab('Diana');
    await click(btn('✏️ Crear, renombrar o quitar músculos'));
    const fila = screen.getByTestId('musculo-pecho');
    await click(within(fila).getByTitle('Quitar Pecho'));
    expect(fila.textContent).toMatch(/No se pierde ninguno ni su historial/);
    fireEvent.change(within(fila).getByLabelText('Músculo de destino'), { target: { value: 'hombro' } }); await tick();
    await click(within(fila).getByText('Quitar músculo'));
    await flush();
    let g = guardado();
    expect(g.musculos.some((m) => m.id === 'pecho')).toBe(false);
    expect(g.exercises.aperturasMaq.cat).toBe('hombro');
    expect(g.exercises.aperturasMaq.history.length).toBeGreaterThan(0);
    await click(btn('↩ Deshacer'));
    await flush();
    g = guardado();
    expect(g.musculos.some((m) => m.id === 'pecho')).toBe(true);
    expect(g.exercises.aperturasMaq.cat).toBe('pecho');
    // renombrar
    const input = screen.getByLabelText('Nombre de Core');
    await type(input, 'Abdomen');
    fireEvent.blur(input); await tick();
    await flush();
    expect(guardado().musculos.find((m) => m.id === 'core').label).toBe('Abdomen');
    sinBasura();
  });
});

describe('4) recetas nuevas', () => {
  test('aparecen en Comida con sus ingredientes y pasos, también para quien ya tenía recetas guardadas', async () => {
    const st = A.buildInitialState();
    st.version = 7;
    st.comida.recetas = A.mkRecetasOriginales();
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify(st));
    await montar();
    await tab('Comida');
    await click(screen.getByText('🍳 Recetas'));
    await click(screen.getByText('Bacalao con garbanzos y espinacas'));
    expect(screen.getByText('Bacalao')).toBeTruthy();
    expect(screen.getByText('Preparación')).toBeTruthy();
    expect(texto()).toMatch(/Pon el bacalao encima/);
    await flush();
    expect(guardado().comida.recetas.length).toBe(60);
    sinBasura();
  });
});
