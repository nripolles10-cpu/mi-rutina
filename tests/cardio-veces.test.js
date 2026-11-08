import { describe, test, expect } from 'vitest';
import * as C from '../src/utils/cardio.js';
import { calendarioMes } from '../src/utils/entreno.js';
import { ymd, fromYmd } from '../src/utils/format.js';

// Lunes 2026-11-02 como referencia de semana
const lunes = fromYmd('2026-11-02');
const dia = (n) => { const d = new Date(lunes); d.setDate(d.getDate() + n); return d; };

describe('cardio: modo días concretos o cuántos días a la semana', () => {
  test('por defecto es modo días; sin días no prevé nada', () => {
    expect(C.modoDe({ dias: [1, 3] })).toBe('dias');
    expect(C.previstosDe({ dias: [1, 3] })).toBe(2);
    expect(C.previstosDe({})).toBe(0);
  });

  test('modo veces: prevé el número elegido y no depende del día', () => {
    const c = { modo: 'veces', veces: 3, dias: [] };
    expect(C.modoDe(c)).toBe('veces');
    expect(C.previstosDe(c)).toBe(3);
    expect(C.tocaHoy(c, dia(0))).toBe(true);
    expect(C.tocaHoy(c, dia(6))).toBe(true);
  });

  test('veces fuera de rango vuelve al modo días', () => {
    expect(C.vecesDe({ veces: 0 })).toBe(0);
    expect(C.vecesDe({ veces: 8 })).toBe(0);
    expect(C.vecesDe({ veces: 2.5 })).toBe(0);
    expect(C.modoDe({ modo: 'veces', veces: 9 })).toBe('dias');
  });

  test('modo días sigue marcando solo los días elegidos', () => {
    const c = { modo: 'dias', dias: [1] };
    expect(C.tocaHoy(c, dia(0))).toBe(true);
    expect(C.tocaHoy(c, dia(1))).toBe(false);
  });

  test('la semana cuenta contra las veces elegidas', () => {
    const c = { modo: 'veces', veces: 2, hechos: [ymd(dia(1)), ymd(dia(4))] };
    expect(C.semanaDe(c, dia(5))).toEqual({ hechas: 2, previstos: 2, cumplida: true });
  });

  test('fechasHechasCardio junta los días de todos los cardios', () => {
    const f = C.fechasHechasCardio([{ hechos: ['2026-11-02'] }, { hechos: ['2026-11-02', '2026-11-05'] }, {}]);
    expect(Object.keys(f).sort()).toEqual(['2026-11-02', '2026-11-05']);
    expect(C.fechasHechasCardio(undefined)).toEqual({});
  });
});

describe('calendario: días de cardio marcados', () => {
  test('marca solo los días con cardio hecho del mes', () => {
    const celdas = calendarioMes('2026-11', [], { '2026-11-05': true, '2026-10-30': true });
    const marcados = celdas.filter((c) => c.cardio).map((c) => c.fecha).sort();
    expect(marcados).toEqual(['2026-10-30', '2026-11-05']);
    expect(celdas.find((c) => c.fecha === '2026-11-05').cardio).toBe(true);
    expect(celdas.find((c) => c.fecha === '2026-11-06').cardio).toBe(false);
  });

  test('sin cardio la celda llega sin marca', () => {
    const celdas = calendarioMes('2026-11', []);
    expect(celdas.every((c) => c.cardio === false)).toBe(true);
  });
});
