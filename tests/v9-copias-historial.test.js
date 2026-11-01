// Pruebas de la ronda de mejoras v9: copia cada 7 días, CSV de historial por serie y descanso global
import { describe, test, expect, beforeEach } from 'vitest';
import { loadApp } from './loadApp.js';

let A;
beforeEach(() => { localStorage.clear(); A = loadApp(); A.aplicarCatalogo(A.MUSCULOS_POR_DEFECTO); });

describe('recordatorio de copia cada 7 días', () => {
  test('el plazo es 7 días', () => {
    expect(A.DIAS_SIN_COPIA).toBe(7);
  });
  test('con datos propios y copia de hace 8 días se avisa; hace 6 no', () => {
    const st = A.buildInitialState();
    st.exercises.gemelo.history.push({ date: '2026-11-10T10:00:00Z', sets: [] });
    const ahora = new Date('2026-11-15T10:00:00Z').getTime();
    st.preferencias = { ...st.preferencias, ultimaCopia: '2026-11-07T10:00:00Z' }; // 8 días
    expect(A.necesitaRecordatorioCopia(st, ahora)).toBe(true);
    st.preferencias.ultimaCopia = '2026-11-09T10:00:00Z'; // 6 días
    expect(A.necesitaRecordatorioCopia(st, ahora)).toBe(false);
  });
});

describe('CSV de historial: una fila por serie y registro', () => {
  test('cabecera con fecha y orden, BOM y separador ;', () => {
    const st = A.buildInitialState();
    const csv = A.buildCsvSeries(st);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    const cab = csv.slice(1).split('\r\n')[0].split(';');
    expect(cab).toEqual(['Dia', 'Orden', 'Ejercicio', 'Musculo', 'Serie', 'Tipo', 'Repeticiones', 'Peso_kg', 'Fecha']);
  });

  test('un registro con fecha produce filas con esa fecha (YYYY-MM-DD) y el orden del ejercicio en el día', () => {
    const st = A.buildInitialState();
    const dia = st.days[0];
    const id = dia.ids[1];
    const ex = st.exercises[id];
    const fechaRegistro = new Date(2026, 9, 14, 12, 0, 0);
    ex.history = [{ date: fechaRegistro.toISOString(), sets: [
      { tipo: 'top', weight: 80, reps: 8 },
      { tipo: 'top', weight: 80, reps: 7 },
    ] }];
    const lineas = A.buildCsvSeries(st).slice(1).split('\r\n').filter(Boolean);
    const filas = lineas.filter((l) => l.indexOf(ex.name) !== -1 && l.indexOf('2026-10-14') !== -1);
    expect(filas.length).toBe(2);
    expect(filas[0].split(';')[1]).toBe('2'); // orden 2 dentro del día
    expect(filas[0].split(';')[4]).toBe('1');
    expect(filas[1].split(';')[4]).toBe('2');
    expect(filas[0].split(';')[7]).toBe('80');
  });

  test('las series de la rutina actual (sin registro) van con la fecha vacía, y los datos de semilla no cuentan como historial', () => {
    const st = A.buildInitialState();
    const csv = A.buildCsvSeries(st);
    const lineas = csv.slice(1).split('\r\n').filter(Boolean).slice(1);
    expect(lineas.length).toBeGreaterThan(0);
    // Ninguna fila debe llevar fecha de la semilla (la de creación de la app); todas sus filas van sin fecha
    lineas.forEach((l) => expect(l.split(';')[8]).toBe(''));
  });

  test('un punto y coma o comilla en el nombre se escapa', () => {
    const st = A.buildInitialState();
    const id = st.days[0].ids[0];
    st.exercises[id].name = 'Press "raro"; prueba';
    const linea = A.buildCsvSeries(st).split('\r\n').find((l) => l.indexOf('raro') !== -1);
    expect(linea.indexOf('"Press ""raro""; prueba"')).not.toBe(-1);
  });
});

describe('descanso global del entreno en vivo', () => {
  test('normalizar preferencias: valor válido se conserva, inválido vuelve a 90 s', () => {
    expect(A.normalizarPreferencias({ descanso: 120 }).descanso).toBe(120);
    expect(A.normalizarPreferencias({ descanso: 5 }).descanso).toBe(90);
    expect(A.normalizarPreferencias({ descanso: 'x' }).descanso).toBe(90);
  });
});
