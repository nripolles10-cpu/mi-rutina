// Pruebas de la Fase 3: sesiones, calendario, rachas, récords, 1RM, sugerencias, resumen semanal, logros,
// semana de descarga, duplicar, recordatorios y datos nuevos (migración y copias)
import { describe, test, expect, beforeEach } from 'vitest';
import { loadApp } from './loadApp.js';

let A;
beforeEach(() => { localStorage.clear(); A = loadApp(); A.aplicarCatalogo(A.MUSCULOS_POR_DEFECTO); });

// Fecha local a mediodía (evita líos de zona horaria)
const dia = (k, h) => new Date(k + 'T' + (h || '12') + ':00:00').toISOString();
function conRegistros(regs) {
  const st = A.buildInitialState();
  regs.forEach(([id, fecha, w, r, extra]) => {
    const sets = [{ tipo: 'top', weight: w, reps: r }, { tipo: 'backoff', weight: w - 10, reps: r + 2 }].concat(extra || []);
    st.exercises[id].history.push({ date: dia(fecha), sets });
  });
  return st;
}

describe('sesiones y calendario', () => {
  test('una sesión por día; si un ejercicio se guarda dos veces el mismo día cuenta el último; los registros de partida no cuentan', () => {
    const st = conRegistros([['gemelo', '2026-10-20', 100, 8], ['aductores', '2026-10-20', 90, 10], ['gemelo', '2026-10-22', 102.5, 8]]);
    st.exercises.gemelo.history.push({ date: dia('2026-10-20', '19'), sets: [{ tipo: 'top', weight: 50, reps: 2 }] });
    const s = A.sesionesDe(st);
    expect(s.map((x) => x.fecha)).toEqual(['2026-10-20', '2026-10-22']);
    const lunes20 = s[0];
    expect(lunes20.ejercicios.map((e) => e.id).sort()).toEqual(['aductores', 'gemelo']);
    expect(lunes20.ejercicios.find((e) => e.id === 'gemelo').volumen).toBe(100); // 50 × 2: el último del día
    expect(lunes20.volumen).toBe(100 + 90 * 10 + 80 * 12);
    expect(lunes20.series).toBe(1 + 2);
  });

  test('calendario de un mes empieza en lunes y marca los días entrenados', () => {
    const st = conRegistros([['gemelo', '2026-10-20', 100, 8], ['gemelo', '2026-10-01', 90, 8]]);
    const c = A.calendarioMes('2026-10', A.sesionesDe(st));
    expect(c[0].fecha).toBe('2026-09-28'); // lunes
    expect(c.length % 7).toBe(0);
    expect(c.filter((x) => x.delMes).length).toBe(31);
    expect(c.find((x) => x.fecha === '2026-10-20').sesion).not.toBeNull();
    expect(c.find((x) => x.fecha === '2026-10-21').sesion).toBeNull();
    expect(c.find((x) => x.fecha === '2026-10-20').intensidad).toBe(1); // el día con más volumen del mes
  });

  test('racha de semanas: la semana en curso no rompe la racha si aún no has llegado al objetivo', () => {
    const regs = [];
    ['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21'].forEach((f) => regs.push(['gemelo', f, 100, 8]));
    const ses = A.sesionesDe(conRegistros(regs));
    const hoy = new Date('2026-10-21T20:00:00');
    let r = A.rachaSemanas(ses, 3, hoy);
    expect(r.actual).toBe(3); // 3 semanas completas antes; esta va 2/3
    expect(r.estaSemana).toBe(2);
    expect(r.mejor).toBe(3);
    // con objetivo de 2 días, esta semana también cuenta
    r = A.rachaSemanas(ses, 2, hoy);
    expect(r.actual).toBe(4);
    // una semana sin entrenar rompe la racha
    expect(A.rachaSemanas(ses, 3, new Date('2026-11-09T12:00:00')).actual).toBe(0);
    expect(A.rachaDias(ses, new Date('2026-10-21T20:00:00'))).toBe(1);
  });
});

describe('historial de ejercicio, récords, 1RM y sugerencias', () => {
  test('récords de la serie 1 (solo los que superan todo lo anterior) y 1RM estimado', () => {
    const st = conRegistros([['gemelo', '2026-10-01', 100, 8], ['gemelo', '2026-10-08', 105, 6], ['gemelo', '2026-10-15', 100, 6], ['gemelo', '2026-10-22', 110, 5]]);
    const h = A.historialEjercicio(st.exercises.gemelo);
    // la semilla del gemelo es 100 × 7 → 1/10 (100×8 = 800 > 700), 8/10 (105×6 = 630, no), 22/10 (110×5 = 550, no)
    expect(h.registros.filter((r) => r.record).map((r) => r.date.slice(0, 10))).toEqual(['2026-10-01']);
    expect(h.records).toBe(1);
    expect(h.mejorPeso).toBe(110);
    const rm = A.calc1RM(100, 8).media;
    expect(h.mejor1RM).toBeGreaterThanOrEqual(rm);
    expect(A.pesoReps({ tipo: 'rp', weight: 70, tandas: [8, 4, 2] })).toEqual({ peso: 70, reps: 8 });
    expect(A.pesoReps({ tipo: 'drop', drops: [{ weight: 60, reps: 10 }, { weight: 45, reps: 8 }] })).toEqual({ peso: 60, reps: 10 });
    expect(A.mejor1RMSeries([{ tipo: 'warm', weight: 200, reps: 5 }])).toBeNull(); // el calentamiento no cuenta
  });

  test('sugerencia de progresión: subir, mantener o bajar (y nunca cambia nada sola)', () => {
    const sube = conRegistros([['gemelo', '2026-10-01', 100, 10]]);
    const antes = JSON.stringify(sube.exercises.gemelo.currentSets);
    const s = A.sugerenciaProgresion(sube.exercises.gemelo);
    expect(s.tipo).toBe('subir');
    expect(s.peso).toBe(102.5);
    expect(JSON.stringify(sube.exercises.gemelo.currentSets)).toBe(antes);
    expect(A.sugerenciaProgresion(conRegistros([['gemelo', '2026-10-01', 100, 7]]).exercises.gemelo)).toMatchObject({ tipo: 'mantener', peso: null });
    const baja = A.sugerenciaProgresion(conRegistros([['gemelo', '2026-10-01', 100, 5], ['gemelo', '2026-10-08', 100, 4]]).exercises.gemelo);
    expect(baja.tipo).toBe('bajar');
    expect(baja.peso).toBe(90);
    const cansado = A.sugerenciaProgresion(conRegistros([['gemelo', '2026-10-01', 100, 9], ['gemelo', '2026-10-08', 100, 8], ['gemelo', '2026-10-15', 100, 7]]).exercises.gemelo);
    expect(cansado.aviso).toMatch(/dos sesiones seguidas bajando/);
    expect(A.sugerenciaProgresion(A.buildInitialState().exercises.gemelo).tipo).toBe('sin-datos');
    expect(A.redondeaPeso(52.3)).toBe(52.5);
    expect(A.redondeaPeso(12.3)).toBe(12.5);
  });
});

describe('resumen semanal, logros y semana de descarga', () => {
  test('resumen de la semana con pasos, sueño, energía, peso y récords', () => {
    const st = conRegistros([['gemelo', '2026-10-20', 110, 8], ['aductores', '2026-10-21', 90, 10], ['gemelo', '2026-10-13', 100, 8]]);
    st.registro = { '2026-10-19': { pasos: 8000, sueno: 4, energia: 3 }, '2026-10-20': { pasos: 10000, sueno: 2, energia: null } };
    st.peso.historial.push({ id: 'a', date: dia('2026-10-20'), kg: 83 }, { id: 'b', date: dia('2026-10-22'), kg: 82 });
    const r = A.resumenSemana(st, '2026-10-19');
    expect(r.sesiones).toBe(2);
    expect(r.pasosMedios).toBe(9000);
    expect(r.suenoMedio).toBe(3);
    expect(r.energiaMedia).toBe(3);
    expect(r.pesoMedio).toBe(82.5);
    expect(r.records).toBe(1); // el gemelo del 20 supera al del 13 (que también fue récord, pero la semana anterior)
    expect(A.resumenSemana(st, '2026-10-12').records).toBe(1);
  });

  test('logros: se calculan de tus datos (no se guarda nada aparte)', () => {
    const st = conRegistros([['gemelo', '2026-10-20', 110, 8]]);
    const L = A.logros(st, new Date('2026-10-21T12:00:00'));
    const por = {}; L.forEach((l) => { por[l.id] = l; });
    expect(por.ses1.conseguido).toBe(true);
    expect(por.ses10.conseguido).toBe(false);
    expect(por.ses10.progreso).toBeCloseTo(0.1);
    expect(por.pr1.conseguido).toBe(true);
    expect(por.foto1.conseguido).toBe(false);
    expect(L.every((l) => l.titulo && l.desc && l.emoji)).toBe(true);
  });

  test('semana de descarga: la última de cada ciclo', () => {
    const d = { activa: true, cadaSemanas: 4, inicio: '2026-10-05' };
    expect(A.semanaDescarga(d, new Date('2026-10-07T12:00:00'))).toMatchObject({ es: false, semanaDelCiclo: 1, proxima: '2026-10-26' });
    expect(A.semanaDescarga(d, new Date('2026-10-28T12:00:00'))).toMatchObject({ es: true, semanaDelCiclo: 4 });
    expect(A.semanaDescarga(d, new Date('2026-11-02T12:00:00'))).toMatchObject({ es: false, semanaDelCiclo: 1 });
    expect(A.semanaDescarga({ ...d, activa: false }, new Date()).activa).toBe(false);
  });
});

describe('duplicar día y ejercicio', () => {
  test('duplicar un ejercicio: copia sin historial justo detrás; el original no cambia', () => {
    const st = A.buildInitialState();
    const r = A.duplicarEjercicio(st, 'piernaA', 'aductores');
    expect(r.ok).toBe(true);
    const d = r.state.days.find((x) => x.id === 'piernaA');
    expect(d.ids[d.ids.indexOf('aductores') + 1]).toBe(r.id);
    const copia = r.state.exercises[r.id];
    expect(copia.name).toBe('Aductores (copia)');
    expect(copia.history).toEqual([]);
    expect(copia.currentSets).toEqual(st.exercises.aductores.currentSets);
    expect(r.state.exercises.aductores).toBe(st.exercises.aductores);
  });

  test('duplicar un día: copias de sus ejercicios (también los alternos) sin tocar el original', () => {
    const st = A.buildInitialState();
    st.days[0].alternos = [{ a: 'beltSquat', b: 'prensaPlacas', activo: 'prensaPlacas' }];
    const r = A.duplicarDia(st, 'piernaA');
    const i = r.state.days.findIndex((d) => d.id === r.id);
    expect(i).toBe(1);
    const nuevo = r.state.days[i];
    expect(nuevo.label).toBe('Pierna A (copia)');
    expect(nuevo.ids.length).toBe(st.days[0].ids.length);
    nuevo.ids.forEach((id) => { expect(st.days[0].ids).not.toContain(id); expect(r.state.exercises[id].history).toEqual([]); });
    expect(nuevo.alternos.length).toBe(1);
    expect(nuevo.ids).toContain(nuevo.alternos[0].activo);
    expect(r.state.days[0]).toBe(st.days[0]);
    expect(r.state.meta.activeDay).toBe(r.id);
  });
});

describe('recordatorios de entrenamiento', () => {
  test('próximas fechas: días elegidos (0 = lunes) y hora, a partir de ahora y para 8 semanas', () => {
    const desde = new Date('2026-10-21T19:00:00'); // miércoles 19:00
    const r = A.proximosRecordatorios([0, 2], '18:30', desde);
    expect(r.length).toBe(16);
    expect(new Date(r[0].at).toString()).toMatch(/Mon Oct 26 2026 18:30/); // el miércoles 18:30 ya ha pasado
    expect(new Date(r[1].at).toString()).toMatch(/Wed Oct 28 2026 18:30/);
    expect(r.map((x) => x.id)).toEqual(Array.from({ length: 16 }, (_, i) => A.RECORDATORIO_ID_BASE + i));
    expect(A.proximosRecordatorios([], '18:00', desde)).toEqual([]);
    expect(A.proximosRecordatorios([1], 'a las 6', desde)).toEqual([]);
  });
});

describe('datos nuevos: migración y copias', () => {
  test('migración desde la versión 8: aparecen registro, medidas, fotos y preferencias nuevas sin tocar nada tuyo', () => {
    const st = conRegistros([['gemelo', '2026-10-20', 110, 8]]);
    st.version = 8;
    delete st.registro; delete st.medidas; delete st.fotosProgreso;
    st.preferencias = { pantallaEncendida: true, ultimaCopia: '2026-10-20T10:00:00Z' };
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    expect(m.version).toBe(A.APP_VERSION);
    expect(m.registro).toEqual({});
    expect(m.medidas).toEqual({ historial: [] });
    expect(m.fotosProgreso).toEqual([]);
    expect(m.preferencias).toMatchObject({ pantallaEncendida: true, ultimaCopia: '2026-10-20T10:00:00Z', tema: 'cian', letra: 'normal', descanso: 90, objetivoDiasSemana: 3 });
    expect(m.preferencias.descarga).toEqual({ activa: false, cadaSemanas: 6, inicio: null });
    expect(m.preferencias.recordatorios).toEqual({ activos: false, dias: [0, 2, 4], hora: '18:00', ids: [] });
    expect(m.exercises.gemelo.history.length).toBe(2);
  });

  test('datos raros se reparan sin romper', () => {
    const st = A.buildInitialState();
    st.registro = { '2026-10-20': { pasos: -5, sueno: 9, energia: 3 }, 'ayer': { pasos: 100 }, '2026-10-21': { pasos: 'mucho' } };
    st.medidas = { historial: [{ tipo: 'cintura', valor: 80, date: dia('2026-10-01') }, { tipo: 'oreja', valor: 3, date: dia('2026-10-01') }, { tipo: 'brazo', valor: NaN, date: dia('2026-10-01') }] };
    st.preferencias = { tema: 'rosa', letra: 'gigante', descanso: 5, recordatorios: { activos: true, dias: [9, 1, 1, 'x'], hora: '25:00' } };
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    expect(m.registro).toEqual({ '2026-10-20': { pasos: null, sueno: null, energia: 3 } });
    expect(m.medidas.historial.map((x) => x.tipo)).toEqual(['cintura']);
    expect(m.preferencias).toMatchObject({ tema: 'cian', letra: 'normal', descanso: 90 });
    expect(m.preferencias.recordatorios).toMatchObject({ activos: true, dias: [1], hora: '18:00' });
  });

  test('la copia de seguridad completa lleva registro, medidas, fotos de progreso y preferencias; defaultData nunca', () => {
    const st = A.buildInitialState();
    st.registro = { '2026-10-20': { pasos: 9000, sueno: 4, energia: 4 } };
    st.medidas = { historial: [{ id: 'm1', tipo: 'cintura', valor: 80, date: dia('2026-10-01') }] };
    st.fotosProgreso = [{ id: 'f1', date: dia('2026-10-01'), nota: 'notaFotoUnica' }];
    st.preferencias = { ...st.preferencias, tema: 'fuego', recordatorios: { activos: true, dias: [0], hora: '07:30', ids: [3000, 3001] } };
    const code = A.encodeShare(A.buildShareObject(st, { historial: true, peso: true, recetas: true, nutricion: true, todo: true }, null));
    const otro = A.applyImport(A.buildInitialState(), A.decodeShare(code).obj, 'todo');
    expect(otro.registro).toEqual(st.registro);
    expect(otro.medidas.historial[0].valor).toBe(80);
    expect(otro.fotosProgreso[0].nota).toBe('notaFotoUnica');
    expect(otro.preferencias.tema).toBe('fuego');
    expect(otro.preferencias.recordatorios).toMatchObject({ activos: true, hora: '07:30', ids: [] }); // los avisos se programan en el móvil nuevo
    const dd = JSON.stringify(A.buildDefaultData(st));
    expect(dd).not.toContain('9000');
    expect(dd).not.toContain('notaFotoUnica');
    expect(dd).not.toContain('"tema"');
  });
});
