// Cambios pedidos por el dueño el 1 de noviembre: copiar la lista de la compra e ingredientes, y el trofeo
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { loadApp } from './loadApp.js';
import { textoIngredientes, textoListaCompra } from '../src/tabs/ComidaTab.jsx';
import { bloquear, comida, desbloquear, entrarDia, irA } from './nav.js';

let A, errores, oe, copiado;
beforeEach(() => {
  localStorage.clear();
  A = loadApp();
  errores = [];
  oe = console.error;
  console.error = (...a) => { errores.push(a.map(String).join(' ')); };
  copiado = null;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async (t) => { copiado = t; }) } });
});
afterEach(() => {
  cleanup();
  console.error = oe;
  expect(errores, 'errores de consola:\n' + errores.join('\n')).toEqual([]);
});

const tick = () => act(async () => {});
async function click(el) { fireEvent.click(el); await tick(); }
const btn = (name) => screen.getByRole('button', { name });
async function montar() { const r = render(<A.App />); await tick(); await entrarDia(); return r; }
async function tab(nombre) { await irA(nombre); }

describe('textos para copiar', () => {
  test('lista de la compra: una línea por ingrediente, con cantidad', () => {
    expect(textoListaCompra([{ nombre: 'Arroz (peso en crudo)', q: 160, u: 'g' }, { nombre: 'Huevo', q: 3, u: 'ud' }, { nombre: 'Sal', q: 0, u: 'pizca' }]))
      .toBe('🛒 Lista de la compra\n• Arroz (peso en crudo) — 160 g\n• Huevo — 3 ud\n• Sal — pizca');
  });
  test('ingredientes de una receta con las raciones elegidas', () => {
    const r = A.mkRecetas().find((x) => x.id === 'r_avena_platano');
    expect(textoIngredientes(r, 2)).toBe('Avena proteica con plátano y canela (2 raciones)\n• Copos de avena — 120 g\n• Leche semidesnatada — 500 ml\n• Proteína whey — 60 g\n• Plátano — 2 ud\n• Canela — 2 cdta');
  });
});

describe('copiar desde la app', () => {
  test('lista de la compra: se copia lo que queda por comprar (lo marcado no)', async () => {
    const st = A.buildInitialState();
    st.comida.plan = { 0: { desayuno: [], comida: [{ id: 'a', recetaId: 'r_arroz_pollo', raciones: 2 }], cena: [], snack: [] } };
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify(st));
    await montar();
    await tab('Comida');
    await comida('Semana'); // el plan y, debajo, la lista de la compra
    await click(screen.getByText('Aceite de oliva'));
    await click(btn('📋 Copiar lista'));
    expect(copiado).toMatch(/^🛒 Lista de la compra\n/);
    expect(copiado).toContain('• Pechuga de pollo — 300 g');
    expect(copiado).toContain('• Arroz (peso en crudo) — 160 g');
    expect(copiado).not.toContain('Aceite de oliva');
    expect(document.body.textContent).toMatch(/Lista copiada/);
  });

  test('ingredientes de una receta', async () => {
    await montar();
    await tab('Comida');
    await comida('Recetas');
    await click(screen.getByText('Avena proteica con plátano y canela'));
    await click(btn('📋 Copiar ingredientes (1 ración)'));
    expect(copiado).toContain('• Copos de avena — 60 g');
    expect(document.body.textContent).toMatch(/Ingredientes copiados/);
  });
});
