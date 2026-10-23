// Migraciones y arranque: que NUNCA se pierdan datos del usuario
import { describe, test, expect, beforeEach } from 'vitest';
import { loadApp } from './loadApp.js';

let A;
beforeEach(() => { localStorage.clear(); A = loadApp(); });

// Estado de un usuario con la rutina editada: un día propio, un ejercicio propio con historial, peso y comida
function estadoEditado(version) {
  const st = A.buildInitialState();
  st.version = version;
  st.exercises.miPress = A.normalizeExercise({ name: 'Press de Nacho', cat: 'pecho', currentSets: [{ reps: 5, weight: 102.5 }], history: [{ date: '2026-10-01T10:00:00.000Z', sets: [{ reps: 5, weight: 100, tipo: 'top' }] }] });
  st.days = [{ id: 'dia_propio', label: 'Mi día', equipo: 'Straps', nota: 'nota', ids: ['miPress', 'gemelo', 'pesoMuertoBelt', 'abduccion'] }];
  st.peso.historial.push({ id: 'pz', date: '2026-10-20T10:00:00.000Z', kg: 82.4 });
  st.comida.diario = { '2026-10-20': [{ id: 'x', momento: 'comida', nombre: 'Lentejas', kcal: 500, p: 30, c: 60, g: 10 }] };
  st.formulario.nombre = 'Nacho';
  return st;
}

describe('migrateState', () => {
  test('versión actual (7): la rutina del usuario se mantiene intacta', () => {
    const st = estadoEditado(7);
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    expect(m.days.map((d) => d.id)).toEqual(['dia_propio']);
    expect(m.days[0].ids).toEqual(['miPress', 'gemelo', 'pesoMuertoBelt', 'abduccion']);
    expect(m.exercises.miPress.history.length).toBe(1);
    expect(m.exercises.miPress.currentSets[0].weight).toBe(102.5);
    expect(m.peso.historial.some((r) => r.kg === 82.4)).toBe(true);
    expect(m.comida.diario['2026-10-20'].length).toBe(1);
    expect(m.formulario.nombre).toBe('Nacho');
    expect(m.version).toBe(7);
  });

  test('versión 6: migración incremental, NO sustituye la rutina y pasa peso muerto → lumbar y abducción → abductores', () => {
    const st = estadoEditado(6);
    st.exercises.pesoMuertoBelt.cat = 'isquios';
    st.exercises.abduccion.cat = 'gluteo';
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    expect(m.days.map((d) => d.id)).toEqual(['dia_propio']);
    expect(m.exercises.miPress.name).toBe('Press de Nacho');
    expect(m.exercises.pesoMuertoBelt.cat).toBe('lumbar');
    expect(m.exercises.abduccion.cat).toBe('abductores');
    expect(m.version).toBe(7);
  });

  test('v6 → v7 respeta un músculo cambiado a mano por el usuario', () => {
    const st = estadoEditado(6);
    st.exercises.pesoMuertoBelt.cat = 'espalda';
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    expect(m.exercises.pesoMuertoBelt.cat).toBe('espalda');
  });

  test('ACTUALIZACIÓN FUTURA: si se sube APP_VERSION a 8, un usuario en 7 conserva su rutina', () => {
    const st = estadoEditado(7);
    const m = A.migrateState(JSON.parse(JSON.stringify(st)), 8);
    expect(m.days.map((d) => d.label)).toEqual(['Mi día']);
    expect(m.exercises.miPress.history.length).toBe(1);
    expect(m.version).toBe(8);
  });

  test('version guardada como texto ("7") no se trata como app antigua', () => {
    const st = estadoEditado('7');
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    expect(m.days[0].id).toBe('dia_propio');
  });

  test('app antigua (sin version): rutina nueva, conserva historial por nombre y guarda ocultos los ejercicios sin equivalente', () => {
    const viejo = {
      exercises: {
        g1: { name: 'Gemelo de pie', cat: 'gemelos', history: [{ date: '2026-01-01T10:00:00.000Z', sets: [{ reps: 8, weight: 70 }] }, { date: '2026-02-01T10:00:00.000Z', sets: [{ reps: 8, weight: 75 }] }], photo: 'data:image/jpeg;base64,AAA' },
        raro: { name: 'Ejercicio que ya no existe', cat: 'pecho', history: [{ date: '2026-01-01T10:00:00.000Z', sets: [{ reps: 10, weight: 40 }] }] },
      },
      days: [{ id: 'x', label: 'Antiguo', ids: ['g1', 'raro'] }],
      peso: { historial: [{ date: '2026-01-01T10:00:00.000Z', kg: 90 }], objetivoKg: 85 },
      formulario: { nombre: 'Nacho', esNacho: true },
      profile: { fuertes: [{ region: 'pecho', titulo: 'Pecho grande' }] },
      comida: { diario: { '2026-01-01': [{ id: 'a', momento: 'cena', nombre: 'Pizza', kcal: 800 }] } },
    };
    const m = A.migrateState(JSON.parse(JSON.stringify(viejo)));
    expect(m.version).toBe(A.APP_VERSION);
    expect(m.days.map((d) => d.id)).toEqual(A.DAYS_SEED.map((d) => d.id));
    expect(m.exercises.gemelo.history.length).toBe(2);
    expect(m.exercises.gemelo.history[0].seed).toBe(true);
    expect(m.exercises.antiguo_raro).toBeTruthy();
    expect(m.exercises.antiguo_raro.history.length).toBe(1);
    expect(m.days.some((d) => d.ids.indexOf('antiguo_raro') !== -1)).toBe(false);
    expect(m.peso.historial[0].kg).toBe(90);
    expect(m.peso.historial[0].id).toBeTruthy();
    expect(m.formulario.esNacho).toBeUndefined();
    expect(m.diana.estados.pecho).toBe('fuerte');
    expect(m.diana.titulos.pecho).toBe('Pecho grande');
    expect(m.comida.diario['2026-01-01'][0].nombre).toBe('Pizza');
  });

  test('datos rotos dentro de un estado válido se reparan sin perder lo demás', () => {
    const st = estadoEditado(7);
    st.exercises.nulo = null;
    st.days.push(null);
    st.days[0].ids.push('noExiste');
    st.peso.historial.push({ date: 'no es fecha', kg: 80 }, { date: '2026-10-21T10:00:00Z', kg: 'ochenta' });
    st.comida.agua = { objetivo: 12, dias: { '2026-10-20': 8 } };
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    expect(m.exercises.nulo).toBeUndefined();
    expect(m.days.length).toBe(1);
    expect(m.days[0].ids).toEqual(['miPress', 'gemelo', 'pesoMuertoBelt', 'abduccion']);
    expect(m.peso.historial.every((r) => typeof r.kg === 'number')).toBe(true);
    expect(m.comida.agua).toEqual({ objetivo: 3, dias: { '2026-10-20': 2 }, unidad: 'litros' });
  });

  test('una migración aplicada dos veces da lo mismo (idempotente)', () => {
    const once = A.migrateState(JSON.parse(JSON.stringify(estadoEditado(6))));
    const twice = A.migrateState(JSON.parse(JSON.stringify(once)));
    expect(twice.exercises).toEqual(once.exercises);
    expect(twice.days).toEqual(once.days);
  });

  test('datos vacíos o inválidos → rutina de serie', () => {
    expect(A.migrateState(null).days.length).toBe(5);
    expect(A.migrateState('texto').days.length).toBe(5);
  });
});

describe('arranque: los datos guardados nunca se pisan sin copia', () => {
  test('sin nada guardado: rutina de serie y sin aviso', () => {
    const r = A.readInitialState();
    expect(r.state.days.length).toBe(5);
    expect(r.aviso).toBeUndefined();
  });

  test('JSON dañado: se guarda una copia de rescate con el texto original y se avisa', () => {
    localStorage.setItem(A.STORAGE_KEY, '{"exercises": {roto');
    const r = A.readInitialState();
    expect(r.aviso).toMatch(/dañados/);
    const keys = A.listRescueKeys();
    expect(keys.length).toBe(1);
    expect(localStorage.getItem(keys[0])).toBe('{"exercises": {roto');
  });

  test('objeto sin ejercicios: también se rescata', () => {
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify({ hola: 1 }));
    const r = A.readInitialState();
    expect(r.aviso).toBeTruthy();
    expect(A.listRescueKeys().length).toBe(1);
  });

  test('datos de otra versión: copia previa a la migración y migración correcta', () => {
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify(estadoEditado(6)));
    const r = A.readInitialState();
    expect(r.aviso).toBeUndefined();
    expect(r.state.days[0].id).toBe('dia_propio');
    const keys = A.listRescueKeys();
    expect(keys.length).toBe(1);
    expect(keys[0]).toMatch(/premigracion_v6$/);
  });

  test('datos de la versión actual: no se hacen copias innecesarias', () => {
    localStorage.setItem(A.STORAGE_KEY, JSON.stringify(estadoEditado(7)));
    A.readInitialState();
    expect(A.listRescueKeys().length).toBe(0);
  });

  test('se guardan como mucho 3 copias de rescate', () => {
    for (let i = 0; i < 5; i++) A.saveRescue('dato' + i, 'ilegible');
    expect(A.listRescueKeys().length).toBe(3);
  });
});
