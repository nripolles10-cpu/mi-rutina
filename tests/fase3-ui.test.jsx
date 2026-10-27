// Pruebas de interfaz de la Fase 3 (app real montada en jsdom)
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
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
  A.aplicarTema('cian', 'normal');
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

describe('modo entreno en vivo', () => {
  test('botones grandes de peso y reps, al marcar la serie arranca el descanso y al acabar se guarda el registro', async () => {
    await montar();
    const histAntes = A.buildInitialState().exercises.gemelo.history.length;
    await click(btn('▶ Empezar entreno en vivo'));
    expect(screen.getByTestId('vivo-ejercicio').textContent).toBe('Gemelo de pie');
    await click(screen.getAllByRole('button', { name: 'Sumar 2,5' })[0]);
    expect(screen.getByTestId('vivo-peso').value).toBe('102,5');
    await click(screen.getAllByRole('button', { name: 'Sumar 1' })[0]);
    expect(screen.getByTestId('vivo-reps').value).toBe('8');
    await click(screen.getByTestId('vivo-hecha'));
    expect(screen.getByTestId('vivo-descanso')).toBeTruthy(); // arranca el descanso
    expect(texto()).toMatch(/Serie 2 de 3/);
    await click(screen.getByTestId('vivo-hecha'));
    await click(screen.getByTestId('vivo-hecha')); // última serie: guarda el registro y pasa al siguiente
    expect(screen.getByTestId('vivo-ejercicio').textContent).toBe('Aductores');
    await flush();
    const g = guardado().exercises.gemelo;
    expect(g.history.length).toBe(histAntes + 1);
    expect(g.history[g.history.length - 1].sets[0]).toMatchObject({ weight: 102.5, reps: 8 });
    expect(g.currentSets[0].weight).toBe(102.5);
    await click(btn('✕ Cerrar'));
    sinBasura();
  });
});

describe('historial, sugerencias y duplicar', () => {
  test('historial del ejercicio con récords y 1RM; la sugerencia solo cambia el peso si tocas el botón', async () => {
    const st = A.buildInitialState();
    st.exercises.gemelo.history.push({ date: '2026-10-20T10:00:00.000Z', sets: [{ tipo: 'top', weight: 100, reps: 10 }] });
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify(st));
    await montar();
    await click(screen.getByText('Gemelo de pie'));
    expect(screen.getByTestId('sugerencia-gemelo').textContent).toMatch(/sube a 102,5 kg/);
    await flush();
    expect(guardado().exercises.gemelo.currentSets[0].weight).toBe(100);
    await click(btn('Poner 102,5 kg en la serie 1'));
    await flush();
    expect(guardado().exercises.gemelo.currentSets[0].weight).toBe(102.5);
    await click(btn('📈 Historial, récords y 1RM'));
    expect(texto()).toMatch(/Mejor 1RM estimado/);
    expect(texto()).toMatch(/🏆 Récord/);
    sinBasura();
  });

  test('duplicar día y ejercicio en modo edición (con Deshacer)', async () => {
    await montar();
    await click(screen.getByText(/Bloqueado/));
    await click(btn('⧉ Duplicar este día'));
    expect(screen.getByDisplayValue('Pierna A (copia)')).toBeTruthy();
    await flush();
    expect(guardado().days.length).toBe(6);
    await click(btn('↩ Deshacer'));
    await flush();
    expect(guardado().days.length).toBe(5);
    await click(screen.getAllByText('Aductores')[0]);
    await click(btn('⧉ Duplicar este ejercicio (sin su historial)'));
    expect(screen.getByText('Aductores (copia)')).toBeTruthy();
    sinBasura();
  });
});

describe('progreso: calendario, cuerpo y logros', () => {
  test('tras guardar un registro el día aparece en el calendario, la racha y los logros', async () => {
    await montar();
    await click(screen.getByText('Gemelo de pie'));
    await click(btn('💾 Guardar registro de hoy'));
    await tab('Progreso');
    await click(btn('📅 Calendario'));
    const hoy = A.ymd(new Date());
    expect(screen.getByTestId('cal-' + hoy).style.background).toMatch(/rgba/);
    await click(screen.getByTestId('cal-' + hoy));
    expect(texto()).toMatch(/1 día entrenados/);
    expect(texto()).toMatch(/Gemelo de pie/);
    await click(btn('🏅 Logros'));
    expect(screen.getByTestId('logro-ses1').textContent).toMatch(/✓/);
    sinBasura();
  });

  test('pasos, sueño y energía del día; medidas con gráfica, edición y borrado', async () => {
    await montar();
    await tab('Progreso');
    await click(btn('📏 Cuerpo'));
    await type(screen.getByPlaceholderText('pasos'), '12000');
    await click(btn('😴 Sueño (1 = fatal, 5 = genial) 4'));
    await click(btn('⚡ Energía (1 = sin fuerzas, 5 = a tope) 5'));
    await flush();
    const hoy = A.ymd(new Date());
    expect(guardado().registro[hoy]).toEqual({ pasos: 12000, sueno: 4, energia: 5 });
    expect(texto()).toMatch(/100 % ✓/);
    // medidas
    await type(screen.getByPlaceholderText('cm'), '84,5');
    await click(btn('Apuntar cintura de hoy'));
    await flush();
    expect(guardado().medidas.historial).toMatchObject([{ tipo: 'cintura', valor: 84.5 }]);
    await click(btn('✏️ Editar o borrar'));
    await click(btn('🗑️'));
    await click(btn('Borrar'));
    await flush();
    expect(guardado().medidas.historial).toEqual([]);
    sinBasura();
  });

  test('fotos de progreso: se guardan aparte y aparece el comparador con dos', async () => {
    const st = A.buildInitialState();
    st.fotosProgreso = [{ id: 'fa', date: '2026-09-01T10:00:00.000Z', nota: '' }, { id: 'fb', date: '2026-10-01T10:00:00.000Z', nota: 'después' }];
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify(st));
    const img = 'data:image/jpeg;base64,' + btoa('x');
    localStorage.setItem('gymtracker_fotos_v1', JSON.stringify({ prog_fa: img, prog_fb: img }));
    await montar();
    await tab('Progreso');
    await click(btn('📏 Cuerpo'));
    expect(screen.getByAltText('Antes')).toBeTruthy();
    expect(screen.getByAltText('Después')).toBeTruthy();
    expect(screen.getByLabelText('Deslizar entre antes y después')).toBeTruthy();
    sinBasura();
  });
});

describe('ajustes y extras', () => {
  test('tema de color y tamaño de letra', async () => {
    await montar();
    await click(screen.getByTitle('Ajustes'));
    await click(btn(/Violeta/));
    expect(document.documentElement.style.getPropertyValue('--ac')).toBe('#A78BFA');
    await click(btn('Grande'));
    expect(document.documentElement.style.getPropertyValue('zoom')).toBe('1.08');
    await flush();
    expect(guardado().preferencias).toMatchObject({ tema: 'violeta', letra: 'grande' });
    await click(btn('Normal'));
    expect(document.documentElement.style.getPropertyValue('zoom')).toBe('');
    sinBasura();
  });

  test('semana de descarga: se configura en Ajustes y avisa en la rutina', async () => {
    await montar();
    await click(screen.getByTitle('Ajustes'));
    await click(screen.getByText('🧘 Avisarme de la semana de descarga'));
    await flush();
    const d = guardado().preferencias.descarga;
    expect(d.activa).toBe(true);
    expect(d.inicio).toBe(A.ymd(A.mondayOf(new Date())));
    cleanup();
    // con un ciclo que empezó hace 3 semanas y es de 4, esta semana toca descargar
    const st = guardado();
    const hace3 = A.addDays(A.mondayOf(new Date()), -21);
    st.preferencias.descarga = { activa: true, cadaSemanas: 4, inicio: A.ymd(hace3) };
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify(st));
    await montar();
    expect(screen.getByTestId('aviso-descarga').textContent).toMatch(/Semana de descarga/);
  });

  test('recordatorios en la versión web: se explica que solo funcionan en Android', async () => {
    await montar();
    await click(screen.getByTitle('Ajustes'));
    await click(btn('Activar recordatorios'));
    expect(texto()).toMatch(/Los recordatorios solo funcionan en la app de Android/);
    sinBasura();
  });

  test('glosario de técnicas en Extras', async () => {
    await montar();
    await tab('Extras');
    await click(btn(/Rest-pause/));
    expect(texto()).toMatch(/descansas 10–20 segundos/);
  });
});
