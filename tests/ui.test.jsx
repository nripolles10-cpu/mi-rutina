// Pruebas de interfaz: monta la app real en un navegador simulado (jsdom), recorre pestañas,
// ventanas y flujos, y falla si React o la app escriben cualquier error en consola
// o si aparece "undefined" / "NaN" / "Infinity" en pantalla.
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/react';
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
  vi.useRealTimers();
  expect(errores, 'errores de consola:\n' + errores.join('\n')).toEqual([]);
});

const tick = () => act(async () => {});
async function click(el) { fireEvent.click(el); await tick(); }
async function type(el, value) { fireEvent.change(el, { target: { value } }); await tick(); }
const btn = (name) => screen.getByRole('button', { name });
const texto = () => document.body.textContent;
function sinBasura() { expect(texto()).not.toMatch(/undefined|NaN|Infinity|\[object Object\]/); }
async function montar() { const r = render(<A.App />); await tick(); return r; }
async function tab(nombre) { await click(screen.getAllByText(nombre, { selector: 'span' }).slice(-1)[0]); sinBasura(); } // la barra inferior es lo último
const guardado = () => JSON.parse(localStorage.getItem(A.STORAGE_KEY));
async function flush() { act(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); }); }

describe('arranque y pestañas', () => {
  test('todas las pestañas se pintan sin errores ni textos rotos', async () => {
    await montar();
    expect(screen.getByText('Pierna A')).toBeTruthy();
    for (const t of ['Cardio', 'Progreso', 'Diana', 'Comida', 'Extras', 'Rutina']) await tab(t);
    // secciones de Comida
    await tab('Comida');
    for (const s of ['🍳 Recetas', '📅 Plan', '🛒 Compra', '💧 Agua', '📓 Diario']) { await click(screen.getByText(s)); sinBasura(); }
    // Diana: vista de detrás
    await tab('Diana');
    await click(screen.getByText('Detrás'));
    sinBasura();
    // Ajustes
    await click(screen.getByTitle('Ajustes'));
    expect(screen.getByText('⚙️ Ajustes')).toBeTruthy();
    sinBasura();
  });

  test('el carrusel de días avanza y vuelve', async () => {
    await montar();
    await click(screen.getByText('›'));
    expect(screen.getByText('Pecho, hombro y bíceps')).toBeTruthy();
    await click(screen.getByText('‹'));
    await click(screen.getByText('‹'));
    expect(screen.getByText('Abs y músculos +')).toBeTruthy();
  });
});

describe('rutina', () => {
  test('modo edición: crear ejercicio, series de cada tipo, coma decimal, guardar registro y récord', async () => {
    await montar();
    await click(screen.getByText(/Bloqueado — toca para editar/));
    await click(screen.getByText('➕ Añadir ejercicio a este día'));
    await type(screen.getByPlaceholderText('ej. Press militar'), 'Press de prueba');
    await click(screen.getAllByText('Pecho').find((el) => el.tagName === 'BUTTON'));
    await click(btn('Añadir ejercicio'));
    // abrir la tarjeta nueva
    await click(screen.getByText('Press de prueba'));
    const card = screen.getByText('Press de prueba').closest('.card');
    // escribir peso con coma en la serie 1
    const pesos = within(card).getAllByPlaceholderText('kg');
    await type(pesos[0], '102,5');
    await type(within(card).getAllByPlaceholderText('reps')[0], '8');
    let st = A.migrateState(guardado());
    await flush();
    const id = Object.keys(guardado().exercises).find((k) => guardado().exercises[k].name === 'Press de prueba');
    expect(guardado().exercises[id].currentSets[0].weight).toBe(102.5);
    expect(guardado().exercises[id].currentSets[0].reps).toBe(8);
    // añadir serie y cambiarla a rest-pause y luego a dropset
    await click(within(card).getByText('➕ Añadir serie'));
    const selects = card.querySelectorAll('select.set-select');
    expect(selects.length).toBe(3);
    fireEvent.change(selects[2], { target: { value: 'rp' } }); await tick();
    expect(within(card).getByText('Tanda 3')).toBeTruthy();
    await click(within(card).getByTitle('Más tandas'));
    expect(within(card).getByText('Tanda 4')).toBeTruthy();
    fireEvent.change(card.querySelectorAll('select.set-select')[2], { target: { value: 'drop' } }); await tick();
    expect(within(card).getByText('Descenso 1')).toBeTruthy();
    await click(within(card).getByText('➕ Añadir descenso'));
    expect(within(card).getByText('Descenso 2')).toBeTruthy();
    fireEvent.change(card.querySelectorAll('select.set-select')[2], { target: { value: 'warm' } }); await tick();
    // guardar registro: es récord
    await click(within(card).getByText('💾 Guardar registro de hoy'));
    expect(texto()).toMatch(/Nuevo récord en Press de prueba/);
    // sugerir objetivo (+12,5 % de 102,5 = 115,5)
    await click(within(card).getByText(/Sugerir objetivo/));
    expect(within(card).getAllByText(/115,5 kg \(sugerido/).length).toBeGreaterThan(0);
    sinBasura();
    void st;
  });

  test('deshacer y rehacer: los botones se activan al instante y agrupan el tecleo del mismo campo', async () => {
    await montar();
    const undo = screen.getByTitle('Deshacer');
    const redo = screen.getByTitle('Rehacer');
    expect(undo.disabled).toBe(true);
    await click(screen.getByText(/Bloqueado — toca para editar/));
    expect(undo.disabled).toBe(true); // cambiar a modo edición no entra en la pila
    const label = screen.getByDisplayValue('Pierna A');
    await type(label, 'Pierna A1');
    await type(label, 'Pierna A12');
    expect(undo.disabled).toBe(false);
    await click(undo);
    expect(screen.getByDisplayValue('Pierna A')).toBeTruthy(); // un solo paso deshace todo el tecleo agrupado
    expect(undo.disabled).toBe(true);
    expect(redo.disabled).toBe(false);
    await click(redo);
    expect(screen.getByDisplayValue('Pierna A12')).toBeTruthy();
    expect(redo.disabled).toBe(true);
  });

  test('quitar ejercicio con confirmación, mover, crear y borrar día', async () => {
    await montar();
    await click(screen.getByText(/Bloqueado — toca para editar/));
    // mover el segundo ejercicio arriba
    const subir = screen.getAllByTitle('Subir');
    expect(subir[0].disabled).toBe(true);
    await click(subir[1]);
    await flush();
    expect(guardado().days[0].ids.slice(0, 2)).toEqual(['aductores', 'gemelo']);
    // quitar un ejercicio
    await click(screen.getAllByText('Aductores')[0]);
    await click(screen.getByText('🗑️ Quitar este ejercicio del día'));
    await click(btn('Quitar'));
    await flush();
    expect(guardado().days[0].ids).not.toContain('aductores');
    // crear un día
    await click(screen.getByText('📅 Crear un día nuevo de rutina'));
    await type(screen.getByPlaceholderText('ej. Brazo y hombro'), 'Día extra');
    await click(btn('Crear día'));
    expect(screen.getByDisplayValue('Día extra')).toBeTruthy();
    // borrarlo
    await click(screen.getByText('🗑️ Eliminar este día'));
    await click(btn('Eliminar día'));
    await flush();
    expect(guardado().days.length).toBe(5);
  });
});

describe('progreso y peso', () => {
  test('registrar peso con coma, ver la cifra con coma y ampliar el gráfico', async () => {
    await montar();
    await tab('Progreso');
    const campo = screen.getAllByPlaceholderText('kg')[0];
    await type(campo, '83,4');
    await click(screen.getByText('Registrar peso de hoy'));
    expect(texto()).toContain('83,4 kg');
    await click(screen.getByText('⤢ Ampliar'));
    expect(screen.getAllByText('⚖️ Peso corporal').length).toBeGreaterThan(1);
    for (const r of ['3 meses', '6 meses', 'Todo', 'Mes']) await click(screen.getAllByText(r).slice(-1)[0]);
    sinBasura();
  });
});

describe('comida', () => {
  test('agua en litros: botella, medio litro y corrección con decimales', async () => {
    await montar();
    await tab('Comida');
    await click(screen.getByText('💧 Agua'));
    await click(screen.getByText('🍼 +1 L (botella)'));
    await click(screen.getByText('➕ 0,5 L'));
    expect(texto()).toContain('1,5 / 3 L');
    await type(screen.getByDisplayValue('1,5'), '2,5');
    expect(texto()).toContain('2,5 / 3 L');
    await click(screen.getByText('➖ 0,5 L'));
    expect(texto()).toContain('2 / 3 L');
    await flush();
    expect(guardado().comida.agua.dias[A.ymd(new Date())]).toBe(2);
  });

  test('receta: ingredientes con cantidades, pasos, raciones y añadir al diario', async () => {
    await montar();
    await tab('Comida');
    await click(screen.getByText('🍳 Recetas'));
    await click(screen.getByText('Avena proteica con plátano y canela'));
    expect(screen.getByText('Copos de avena')).toBeTruthy();
    expect(texto()).toContain('60 g');
    expect(screen.getByText('Preparación')).toBeTruthy();
    // dos raciones → cantidades dobles
    const mas = screen.getAllByText('+').slice(-1)[0];
    await click(mas); await click(mas);
    expect(texto()).toContain('120 g');
    await click(screen.getByText('📓 Al diario'));
    await click(btn('Añadir al diario'));
    expect(texto()).toContain('Añadido al diario ✓');
    sinBasura();
  });

  test('planificador → lista de la compra', async () => {
    await montar();
    await tab('Comida');
    await click(screen.getByText('📅 Plan'));
    await click(screen.getAllByTitle('Añadir')[0]); // lunes, desayuno
    await click(screen.getByText('Avena proteica con plátano y canela'));
    await click(btn('Añadir'));
    await click(screen.getByText('🛒 Compra'));
    expect(screen.getByText('Copos de avena')).toBeTruthy();
    expect(texto()).toContain('60 g');
    await click(screen.getByText('Copos de avena'));
    expect(texto()).toMatch(/\d+ por comprar de \d+/);
  });

  test('editor de recetas: calcular macros con los ingredientes', async () => {
    await montar();
    await tab('Comida');
    await click(screen.getByText('🍳 Recetas'));
    await click(screen.getByText('➕ Crear mi receta'));
    await type(screen.getByText('Nombre').nextSibling, 'Pollo solo');
    await type(screen.getByPlaceholderText('Ingrediente'), 'Pechuga de pollo');
    await type(screen.getByPlaceholderText('cant.'), '200');
    await click(screen.getByText('🧮 Calcular macros con los ingredientes'));
    expect(texto()).toContain('Calorías por ración (se calculan): 207 kcal'); // 45 g P y 3 g G
    await click(btn('Guardar receta'));
    expect(screen.getByText('Pollo solo')).toBeTruthy();
  });
});

describe('extras', () => {
  test('1RM todo en español y sin textos pegados', async () => {
    await montar();
    await tab('Extras');
    const peso = screen.getByText('Peso levantado').parentElement.querySelector('input');
    const reps = screen.getByText('Repeticiones (1–30)').parentElement.querySelector('input');
    await type(peso, '100');
    await type(reps, '6');
    const res = screen.getByTestId('rm-resultado').textContent;
    expect(res).toContain('118,1 kg');
    expect(res).toContain('Entre 116,1 y 120 kg según el método de cálculo');
    expect(res).not.toMatch(/(Epley|Brzycki)\d/);
    expect(res).not.toMatch(/\d(kg|Entre|según)/);
    expect(res).toContain('95 % del máximo (unas 2 repeticiones)');
  });

  test('discos sin barra (0 kg) y con decimales', async () => {
    await montar();
    await tab('Extras');
    await click(screen.getByText('Sin barra (0 kg)'));
    const obj = screen.getByText('Peso total que quieres montar').parentElement.querySelector('input');
    await type(obj, '45');
    const r = screen.getByTestId('discos-resultado').textContent;
    expect(r).toContain('1 × 20 kg');
    expect(r).toContain('1 × 2,5 kg');
    expect(r).toContain('Total en discos: 45 kg');
    expect(r).not.toContain('barra 0');
    await click(screen.getByText('20 kg'));
    await type(obj, '21');
    expect(screen.getByTestId('discos-resultado').textContent).toContain('te quedas en 20 kg (faltan 1 kg)');
  });

  test('calculadora nutricional con datos y sin datos', async () => {
    await montar();
    await tab('Extras');
    expect(texto()).toMatch(/necesito tu peso, edad y altura/);
    await type(screen.getByText('Edad').parentElement.querySelector('input'), '30');
    await type(screen.getByText('Altura').parentElement.querySelector('input'), '180');
    expect(texto()).toMatch(/Calorías objetivo al día/);
    sinBasura();
  });
});

describe('ajustes: compartir, importar, copia, exportar y restablecer', () => {
  test('generar código, importarlo y restaurar la copia previa', async () => {
    await montar();
    await click(screen.getByTitle('Ajustes'));
    await click(screen.getByText('📤 Compartir mi rutina'));
    await click(btn('Generar código'));
    const code = document.querySelector('textarea[readonly]').value;
    expect(code.startsWith('GYMR1.')).toBe(true);
    await click(screen.getAllByText('✕ Cerrar').slice(-1)[0]);
    await click(screen.getByText('📥 Importar rutina o restaurar copia'));
    await type(screen.getByPlaceholderText('GYMR1.…'), code);
    await click(btn('Comprobar código'));
    expect(texto()).toContain('✅ Código válido');
    await click(btn('Importar…'));
    await click(btn('Importar'));
    expect(texto()).toContain('Importación completada ✓');
    await click(screen.getByText('↩️ Deshacer la última importación'));
    await click(btn('Restaurar'));
    expect(texto()).toContain('Estado anterior restaurado ✓');
  });

  test('código corrupto: mensaje claro y no cambia nada', async () => {
    await montar();
    await click(screen.getByTitle('Ajustes'));
    await click(screen.getByText('📥 Importar rutina o restaurar copia'));
    await type(screen.getByPlaceholderText('GYMR1.…'), 'GYMR1.abc.def');
    await click(btn('Comprobar código'));
    expect(texto()).toMatch(/corrupto/);
  });

  test('exportaciones .txt / .csv / .doc', async () => {
    const llamadas = [];
    A.Native.saveFile = (name, content, mime) => { llamadas.push({ name, content, mime }); return true; };
    await montar();
    await click(screen.getByTitle('Ajustes'));
    for (const b of screen.getAllByText('⬇️ Descargar')) await click(b);
    expect(llamadas.map((x) => x.name)).toEqual(['mi_rutina.txt', 'mi_rutina.csv', 'mi_rutina.doc']);
    expect(llamadas[1].content.charCodeAt(0)).toBe(0xFEFF);
    expect(texto()).toContain('Archivo preparado ✓');
  });

  test('restablecer guarda copia y vuelve a los datos de serie', async () => {
    await montar();
    await tab('Progreso');
    await type(screen.getAllByPlaceholderText('kg')[0], '77,7');
    await click(screen.getByText('Registrar peso de hoy'));
    await click(screen.getByTitle('Ajustes'));
    await click(screen.getByText('🗑️ Restablecer todos los datos'));
    await click(btn('Restablecer'));
    await flush();
    expect(guardado().peso.historial.some((r) => r.kg === 77.7)).toBe(false);
    expect(JSON.parse(localStorage.getItem(A.BACKUP_KEY)).peso.historial.some((r) => r.kg === 77.7)).toBe(true);
  });

  test('nombre de usuario editable', async () => {
    await montar();
    await click(screen.getByTitle('Ajustes'));
    await type(screen.getByPlaceholderText('Escribe tu nombre'), 'Nacho');
    await click(btn('Guardar cambios'));
    await flush();
    expect(guardado().formulario.nombre).toBe('Nacho');
  });
});

describe('guardado y datos', () => {
  test('lo guardado sobrevive a cerrar y abrir la app', async () => {
    const r = await montar();
    await tab('Comida');
    await click(screen.getByText('💧 Agua'));
    await click(screen.getByText('🍼 +1 L (botella)'));
    await flush();
    r.unmount();
    A = loadApp();
    await montar();
    await tab('Comida');
    await click(screen.getByText('💧 Agua'));
    expect(texto()).toContain('1 / 3 L');
  });

  test('datos dañados: aviso, copia de rescate visible en Ajustes y la app sigue funcionando', async () => {
    localStorage.setItem(A.STORAGE_KEY, '{roto');
    await montar();
    expect(texto()).toMatch(/datos guardados estaban dañados/);
    await click(screen.getByTitle('Ajustes'));
    expect(screen.getByText('Copias de rescate')).toBeTruthy();
    expect(texto()).toMatch(/datos dañados/);
  });

  test('datos de la versión 6 guardados: se abren con la rutina del usuario', async () => {
    const st = A.buildInitialState();
    st.version = 6;
    st.days = [{ id: 'mio', label: 'Mi día propio', equipo: '', nota: '', ids: ['gemelo'] }];
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify(st));
    await montar();
    expect(screen.getByText('Mi día propio')).toBeTruthy();
  });
});

describe('temporizador de descanso', () => {
  test('cuenta con la hora real, se muestra en la cabecera y avisa al terminar', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    let vibro = 0;
    A.Native.vibrate = () => { vibro += 1; return true; };
    await montar();
    await click(screen.getByTitle('Descanso entre series'));
    await click(btn('30 s'));
    expect(screen.getAllByText('0:30').length).toBeGreaterThan(0);
    await click(btn('Seguir entrenando (sigue contando)'));
    await act(async () => { vi.advanceTimersByTime(10000); });
    expect(screen.getByTitle('Descanso entre series').textContent).toContain('0:20');
    await act(async () => { vi.advanceTimersByTime(21000); });
    expect(vibro).toBe(1);
    expect(texto()).toMatch(/Descanso terminado/);
  });
});
