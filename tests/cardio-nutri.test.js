import { describe, test, expect } from 'vitest';
import * as C from '../src/utils/cardio.js';
import { ymd } from '../src/utils/format.js';

describe('cardio: días y cumplimiento', () => {
  const miercoles = new Date(2026, 10, 4, 18, 0); // 4 nov 2026 = miércoles
  test('lunes = 1 … domingo = 7', () => {
    expect(C.diaDeLaSemana(new Date(2026, 10, 2))).toBe(1);
    expect(C.diaDeLaSemana(miercoles)).toBe(3);
    expect(C.diaDeLaSemana(new Date(2026, 10, 8))).toBe(7);
  });
  test('elegir días los ordena y no repite', () => {
    let c = { dias: [] };
    c = { ...c, dias: C.toggleDia(c, 5) };
    c = { ...c, dias: C.toggleDia(c, 1) };
    c = { ...c, dias: C.toggleDia(c, 3) };
    expect(C.diasDe(c)).toEqual([1, 3, 5]);
    c = { ...c, dias: C.toggleDia(c, 3) };
    expect(C.diasDe(c)).toEqual([1, 5]);
  });
  test('toca hoy solo en sus días', () => {
    const c = { dias: [1, 3, 5] };
    expect(C.tocaHoy(c, miercoles)).toBe(true);
    expect(C.tocaHoy({ dias: [2] }, miercoles)).toBe(false);
    expect(C.tocaHoy({}, miercoles)).toBe(false);
  });
  test('marcar y desmarcar hoy', () => {
    let c = { dias: [3], hechos: [] };
    c = { ...c, hechos: C.alternarHoy(c, miercoles) };
    expect(C.hechoHoy(c, miercoles)).toBe(true);
    c = { ...c, hechos: C.alternarHoy(c, miercoles) };
    expect(C.hechoHoy(c, miercoles)).toBe(false);
  });
  test('cuenta la semana (lunes a domingo) y avisa al cumplirla', () => {
    const c = { dias: [1, 3, 5], hechos: ['2026-11-02', '2026-11-04', '2026-10-30'] };
    const s = C.semanaDe(c, miercoles);
    expect(s).toEqual({ hechas: 2, previstos: 3, cumplida: false });
    const c2 = { ...c, hechos: c.hechos.concat(['2026-11-06']) };
    expect(C.semanaDe(c2, miercoles).cumplida).toBe(true);
    // la semana anterior no cuenta
    expect(C.semanaDe({ dias: [1], hechos: ['2026-10-30'] }, miercoles).hechas).toBe(0);
  });
  test('sin días no hay cumplimiento', () => {
    expect(C.semanaDe({}, miercoles).previstos).toBe(0);
  });
  test('el historial de cumplidos no crece sin fin', () => {
    const hechos = Array.from({ length: 150 }, (_, i) => ymd(new Date(2026, 0, 1 + i)));
    const nuevo = C.alternarHoy({ hechos }, new Date(2026, 6, 1));
    expect(nuevo.length).toBe(120);
  });
});
