// v10: ficha propia para cada persona. Primer arranque sin nombre, sin peso ni datos de otra persona;
// el peso de Ajustes se anota como pesada nueva (lo mismo que ve Progreso y la calculadora).
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { loadApp } from './loadApp.js';

let A;
beforeEach(() => { localStorage.clear(); A = loadApp(); });
afterEach(() => cleanup());

async function click(el) { fireEvent.click(el); await new Promise((r) => setTimeout(r, 0)); }
async function type(el, value) { fireEvent.change(el, { target: { value } }); await new Promise((r) => setTimeout(r, 0)); }
const tick = () => new Promise((r) => setTimeout(r, 0));
const guardado = () => JSON.parse(localStorage.getItem(A.STORAGE_KEY));
const btn = (t) => screen.getByText(t, { selector: 'button' });

describe('primer arranque', () => {
  test('el estado inicial no trae peso, objetivo ni nombre de nadie', () => {
    const st = A.buildInitialState();
    expect(st.formulario.nombre).toBe('');
    expect(st.formulario.pesoInicialKg).toBeNull();
    expect(st.formulario.objetivoPesoKg).toBeNull();
    expect(st.peso.historial).toEqual([]);
    expect(st.peso.objetivoKg).toBeNull();
    expect(A.pesoActualDe(st)).toBeNull();
  });

  test('sin nombre se pide la ficha; al empezar guarda nombre y peso como primera pesada', async () => {
    render(<A.App />); await tick();
    expect(screen.getByRole('dialog', { name: 'Crea tu ficha' })).toBeTruthy();
    expect(btn('Empezar').disabled).toBe(true);
    await type(screen.getByPlaceholderText('Escribe tu nombre'), '  Lucía ');
    await type(screen.getByText('Peso actual (kg)').parentElement.querySelector('input'), '62,5');
    await click(btn('Empezar')); await tick();
    expect(screen.queryByRole('dialog', { name: 'Crea tu ficha' })).toBeNull();
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });
    const g = guardado();
    expect(g.formulario.nombre).toBe('Lucía');
    expect(g.peso.historial.length).toBe(1);
    expect(g.peso.historial[0].kg).toBe(62.5);
  });

  test('con nombre ya guardado no sale la ficha', async () => {
    const st = A.buildInitialState(); st.formulario.nombre = 'Pedro';
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify(st));
    render(<A.App />); await tick();
    expect(screen.queryByRole('dialog', { name: 'Crea tu ficha' })).toBeNull();
  });
});

describe('peso corporal en Ajustes', () => {
  test('cambiar el peso actual añade una pesada nueva y es lo que ve la app', async () => {
    const st = A.buildInitialState(); st.formulario.nombre = 'Pedro';
    st.peso.historial = [{ id: 'p0', date: '2026-10-01T10:00:00.000Z', kg: 84 }];
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify(st));
    render(<A.App />); await tick();
    await click(screen.getByTitle('Ajustes')); await tick();
    const campo = screen.getByText('Peso actual (kg)').parentElement.querySelector('input');
    expect(campo.value).toBe('84');
    await type(campo, '82');
    await click(btn('Guardar cambios')); await tick();
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });
    const g = guardado();
    expect(g.peso.historial.map((h) => h.kg)).toEqual([84, 82]);
    expect(A.pesoActualDe(g)).toBe(82);
    expect(A.effNutri(g).eff.kg).toBe(82);
  });
});
