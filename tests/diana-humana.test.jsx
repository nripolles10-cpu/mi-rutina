// Diana humana: cuerpo de hombre o mujer, músculos por partes y paso de los datos de antes.
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { loadApp } from './loadApp.js';
import { CUERPO_DIANA } from '../src/data/cuerpoDiana.js';
import { irA } from './nav.js';

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
  expect(errores, 'errores de consola:\n' + errores.join('\n')).toEqual([]);
});

const tick = () => act(async () => {});
async function click(el) { fireEvent.click(el); await tick(); }
const esperar = () => act(async () => { await new Promise((r) => setTimeout(r, 350)); });
const guardado = () => JSON.parse(localStorage.getItem(A.STORAGE_KEY));
async function montar(retoque) {
  const s = A.buildInitialState(); s.formulario.nombre = 'Prueba';
  if (retoque) retoque(s);
  localStorage.setItem(A.STORAGE_KEY, JSON.stringify(s));
  render(<A.App />); await tick();
  await irA('Diana');
}
const zonasDe = (sexo, lado) => new Set(CUERPO_DIANA[sexo][lado].piezas.map((p) => p.r).filter((r) => r && r !== 'pelo'));

describe('dibujos del cuerpo', () => {
  test('hombre y mujer, delante y detrás: todas las zonas existen y cada músculo de serie sale en el cuerpo', () => {
    const regiones = A.REGIONES_MAPA.map((r) => r[0]);
    for (const sexo of ['M', 'F']) {
      const todas = new Set([...zonasDe(sexo, 'front'), ...zonasDe(sexo, 'back')]);
      todas.forEach((r) => expect(regiones, sexo + ' ' + r).toContain(r));
      regiones.forEach((r) => expect(todas.has(r), sexo + ' sin zona ' + r).toBe(true));
      for (const lado of ['front', 'back']) {
        const f = CUERPO_DIANA[sexo][lado];
        expect(f.vb).toHaveLength(4);
        f.piezas.forEach((p) => {
          expect(typeof p.d).toBe('string');
          if (p.c) { expect(p.c).toHaveLength(4); p.c.forEach((n) => expect(Number.isFinite(n)).toBe(true)); }
        });
      }
    }
  });

  test('las partes van donde deben: pecho y hombro anterior/lateral delante; posterior, espalda alta y dorsal detrás', () => {
    for (const sexo of ['M', 'F']) {
      ['pecho_sup', 'pecho', 'hombro', 'hombro_lat'].forEach((r) => expect(zonasDe(sexo, 'front').has(r), sexo + ' ' + r).toBe(true));
      ['hombro_post', 'espalda_alta', 'espalda', 'trapecio', 'gluteo', 'abductores', 'lumbar'].forEach((r) => expect(zonasDe(sexo, 'back').has(r), sexo + ' ' + r).toBe(true));
    }
  });
});

describe('Diana en la app', () => {
  test('sale el cuerpo de hombre o de mujer según Ajustes, delante y detrás', async () => {
    await montar((s) => { s.formulario.sexo = 'M'; });
    let svg = screen.getByTestId('diana-cuerpo');
    expect(svg.getAttribute('data-sexo')).toBe('M');
    expect(svg.getAttribute('data-lado')).toBe('front');
    await click(screen.getByText('Detrás'));
    expect(screen.getByTestId('diana-cuerpo').getAttribute('data-lado')).toBe('back');
    cleanup(); localStorage.clear();
    await montar((s) => { s.formulario.sexo = 'F'; });
    svg = screen.getByTestId('diana-cuerpo');
    expect(svg.getAttribute('data-sexo')).toBe('F');
    expect(svg.getAttribute('aria-label')).toContain('mujer');
  });

  test('tocar una zona elige su músculo y los colores siguen el estado', async () => {
    await montar((s) => { s.diana.estados = { pecho_sup: 'debil', pecho: 'fuerte' }; });
    const sup = document.querySelector('[data-region="pecho_sup"] path');
    expect(sup.getAttribute('fill')).toBe(A.ESTADO_COLOR.debil);
    expect(document.querySelector('[data-region="pecho"] path').getAttribute('fill')).toBe(A.ESTADO_COLOR.fuerte);
    await click(sup);
    expect(document.body.textContent).toContain('Pectoral superior');
    // detrás: hombro posterior, espalda alta y dorsal se pueden tocar
    await click(screen.getByText('Detrás'));
    for (const r of ['hombro_post', 'espalda_alta', 'espalda']) {
      await click(document.querySelector('[data-region="' + r + '"] path'));
      expect(document.body.textContent).toContain(A.MUSCULOS_POR_DEFECTO.find((m) => m.id === r).label);
    }
  });

  test('marcar un músculo nuevo como débil se guarda y lo pinta', async () => {
    await montar();
    await click(screen.getByText('Detrás'));
    const tarjeta = screen.getByTestId('diana-espalda_alta');
    await click(Array.from(tarjeta.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Punto débil'));
    await esperar();
    expect(guardado().diana.estados.espalda_alta).toBe('debil');
    expect(document.querySelector('[data-region="espalda_alta"] path').getAttribute('fill')).toBe(A.ESTADO_COLOR.debil);
  });
});

describe('paso de los datos de antes', () => {
  const antiguo = () => {
    const s = A.buildInitialState();
    delete s.meta.musculosVersion;
    s.musculos = s.musculos.filter((m) => ['pecho_sup', 'hombro_lat', 'hombro_post', 'espalda_alta'].indexOf(m.id) === -1)
      .map((m) => ({ ...m, label: { pecho: 'Pecho', hombro: 'Hombro', espalda: 'Espalda' }[m.id] || m.label }));
    Object.values(s.exercises).forEach((e) => { e.cat = { pecho_sup: 'pecho', hombro_lat: 'hombro', hombro_post: 'hombro', espalda_alta: 'espalda' }[e.cat] || e.cat; });
    return s;
  };

  test('añade las partes, renombra, copia los estados y reparte los ejercicios por el nombre (una sola vez)', () => {
    const s = antiguo();
    s.diana.estados = { pecho: 'debil', espalda: 'fuerte' };
    const m = A.migrateState(JSON.parse(JSON.stringify(s)));
    const label = (id) => m.musculos.find((x) => x.id === id).label;
    expect(label('pecho')).toBe('Pectoral medio/inferior');
    expect(label('hombro')).toBe('Hombro anterior');
    expect(label('espalda')).toBe('Dorsal');
    ['pecho_sup', 'hombro_lat', 'hombro_post', 'espalda_alta'].forEach((id) => expect(m.musculos.some((x) => x.id === id), id).toBe(true));
    expect(m.musculos.map((x) => x.id).slice(0, 2)).toEqual(['pecho_sup', 'pecho']); // junto a su músculo
    expect(m.diana.estados).toMatchObject({ pecho: 'debil', pecho_sup: 'debil', espalda: 'fuerte', espalda_alta: 'fuerte' });
    const cat = (nombre) => Object.values(m.exercises).find((e) => e.name === nombre).cat;
    expect(cat('Press inclinado en máquina')).toBe('pecho_sup');
    expect(cat('Press en máquina')).toBe('pecho');
    expect(cat('Elevaciones laterales')).toBe('hombro_lat');
    expect(cat('Aperturas hacia atrás')).toBe('hombro_post');
    expect(cat('Remo T en máquina')).toBe('espalda_alta');
    expect(cat('Jalón al pecho')).toBe('espalda');
    expect(m.meta.musculosVersion).toBe(2);
    // una vez convertidos, si cambias algo a mano no se vuelve a tocar
    m.exercises[Object.keys(m.exercises).find((id) => m.exercises[id].name === 'Press inclinado en máquina')].cat = 'pecho';
    const m2 = A.migrateState(JSON.parse(JSON.stringify(m)));
    expect(Object.values(m2.exercises).find((e) => e.name === 'Press inclinado en máquina').cat).toBe('pecho');
  });

  test('si renombraste un músculo, se respeta tu nombre', () => {
    const s = antiguo();
    s.musculos = s.musculos.map((m) => (m.id === 'pecho' ? { ...m, label: 'Mi pecho' } : m));
    const m = A.migrateState(JSON.parse(JSON.stringify(s)));
    expect(m.musculos.find((x) => x.id === 'pecho').label).toBe('Mi pecho');
  });

  test('un código compartido de antes también se reparte al importarlo', () => {
    const viejo = A.buildShareObject(antiguo(), { todo: true }, null);
    delete viejo.musculosVersion;
    const res = A.applyImport(A.buildInitialState(), viejo, 'todo');
    expect(Object.values(res.exercises).find((e) => e.name === 'Press inclinado en máquina').cat).toBe('pecho_sup');
    expect(res.musculos.some((x) => x.id === 'hombro_post')).toBe(true);
    // uno nuevo lleva su versión y no se toca
    const nuevo = A.buildShareObject(A.buildInitialState(), { todo: true }, null);
    expect(nuevo.musculosVersion).toBe(2);
  });
});
