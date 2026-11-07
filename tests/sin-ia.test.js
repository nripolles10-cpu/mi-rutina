import { describe, test, expect } from 'vitest';
import { buildInitialState } from '../src/state/migrate.js';
import { NUTRI_DB, mkRecetas } from '../src/data/recetas.js';
import * as S from '../src/utils/sinIA.js';
import { textoDescanso, OPCIONES_DESCANSO } from '../src/utils/descanso.js';
import { ymd } from '../src/utils/format.js';

describe('recetas con lo que tienes en casa', () => {
  const recetas = mkRecetas();
  test('sin ingredientes no devuelve nada', () => {
    expect(S.recetasConLoQueTienes(recetas, '')).toEqual([]);
    expect(S.recetasConLoQueTienes(recetas, '  ,  ')).toEqual([]);
  });
  test('encuentra recetas con lo que escribes y dice qué te falta', () => {
    const res = S.recetasConLoQueTienes([
      { id: 'a', nombre: 'Pollo con arroz', ingredientes: [{ n: 'Pechuga de pollo', q: 150, u: 'g' }, { n: 'Arroz (peso en crudo)', q: 80, u: 'g' }, { n: 'Sal y pimienta', q: 1, u: 'pizca' }] },
      { id: 'b', nombre: 'Tortilla', ingredientes: [{ n: 'Huevo', q: 2, u: 'ud' }] },
    ], 'pollo, arroz');
    expect(res.map((x) => x.receta.id)).toEqual(['a']);
    expect(res[0].tienes).toEqual(['Pechuga de pollo', 'Arroz (peso en crudo)']);
    expect(res[0].faltan).toEqual([]);
    expect(res[0].pct).toBe(100);
  });
  test('ordena primero las que te faltan menos cosas', () => {
    const res = S.recetasConLoQueTienes([
      { id: 'x', nombre: 'X', ingredientes: [{ n: 'Huevo', q: 2, u: 'ud' }, { n: 'Espinacas', q: 50, u: 'g' }, { n: 'Queso', q: 30, u: 'g' }] },
      { id: 'y', nombre: 'Y', ingredientes: [{ n: 'Huevo', q: 2, u: 'ud' }] },
    ], 'huevos');
    expect(res.map((x) => x.receta.id)).toEqual(['y', 'x']);
    expect(res[1].faltan).toEqual(['Espinacas', 'Queso']);
  });
});

describe('qué comer para cubrir lo que te falta', () => {
  test('sin nada que cubrir no sugiere nada', () => {
    expect(S.sugerirParaFaltan({ kcal: 0, p: 0, c: 0, g: 0 })).toEqual([]);
    expect(S.sugerirParaFaltan({ kcal: 40, p: 10, c: 0, g: 0 })).toEqual([]);
  });
  test('no se pasa de las calorías que quedan y usa cantidades de 10 g', () => {
    const r = { kcal: 350, p: 35, c: 30, g: 10 };
    const sug = S.sugerirParaFaltan(r, 5);
    expect(sug.length).toBeGreaterThan(0);
    sug.forEach((s) => {
      expect(s.kcal).toBeLessThanOrEqual(350);
      expect(s.gramos % 10).toBe(0);
      expect(NUTRI_DB[s.nombre].per100).toBeTruthy();
    });
  });
  test('prioriza lo que más falta: si falta proteína, sugiere algo con proteína', () => {
    const sug = S.sugerirParaFaltan({ kcal: 300, p: 40, c: 0, g: 0 }, 3);
    expect(sug[0].p).toBeGreaterThan(sug[0].c);
  });
  test('no sugiere aceite ni sal', () => {
    const nombres = S.sugerirParaFaltan({ kcal: 500, p: 10, c: 10, g: 40 }, 10).map((s) => s.nombre);
    nombres.forEach((n) => expect(/aceite|sal/i.test(n)).toBe(false));
  });
});

describe('consejos de Diana: solo para los puntos débiles', () => {
  const st = buildInitialState();
  const cats = {};
  (st.musculos || []).forEach((m) => { cats[m.id] = m; });
  test('sin puntos débiles no hay consejos', () => {
    expect(S.consejosDebiles({ ...st, diana: { estados: { pecho: 'fuerte' } } }, cats)).toEqual([]);
  });
  test('muestra consejos solo de los músculos marcados como débiles, y se quitan al cambiarlos', () => {
    const conDebiles = { ...st, diana: { estados: { pecho: 'debil', gluteo: 'debil', core: 'intermedio' } } };
    expect(S.consejosDebiles(conDebiles, cats).map((c) => c.id)).toEqual(['pecho', 'gluteo']);
    const cambiado = { ...st, diana: { estados: { pecho: 'intermedio', gluteo: 'debil' } } };
    expect(S.consejosDebiles(cambiado, cats).map((c) => c.id)).toEqual(['gluteo']);
  });
  test('cada consejo trae acciones y ejercicios; un músculo nuevo usa el consejo general', () => {
    const extra = { ...cats, nuevo1: { id: 'nuevo1', label: 'Nuevo', color: '#000', emoji: '🎯' } };
    const lista = S.consejosDebiles({ ...st, diana: { estados: { nuevo1: 'debil', pecho: 'debil' } } }, extra);
    const nuevo = lista.find((c) => c.id === 'nuevo1');
    expect(nuevo.acciones.length).toBeGreaterThan(0);
    expect(nuevo.ejercicios).toEqual([]);
    const pecho = lista.find((c) => c.id === 'pecho');
    expect(pecho.ejercicios.length).toBe(2);
  });
});

describe('cardio: 5 tipos por objetivo', () => {
  test('hay 5 propuestas distintas para cada objetivo', () => {
    ['grasa', 'resistencia', 'recuperacion'].forEach((o) => {
      const nombres = S.CARDIO_PRESETS[o].map((p) => p.nombre);
      expect(nombres.length).toBe(5);
      expect(new Set(nombres).size).toBe(5);
    });
  });
  test('lo que se guarda en Cardio incluye método, duración y detalle', () => {
    const p = S.CARDIO_PRESETS.grasa[0];
    const g = S.cardioPresetParaGuardar(p);
    expect(g.name).toBe(p.nombre);
    expect(g.detalle).toContain(p.metodo);
    expect(g.detalle).toContain(p.duracion + ' min');
    expect(g.detalle.split('\n').length).toBeGreaterThan(p.detalle.length);
  });
});

describe('resumen de la semana (cifras calculadas)', () => {
  test('cuenta desde el lunes y no inventa datos', () => {
    const st = buildInitialState();
    const hoy = new Date(2026, 10, 4, 18, 0); // miércoles
    const r = S.resumenSemanaLocal(st, hoy);
    expect(r.lunes).toBe('2026-11-02');
    expect(r.comida.dias).toBe(0);
    expect(r.comida.kcalMedia).toBeNull();
    const frases = S.frasesResumen(r);
    expect(frases.some((f) => f.includes('aún no has apuntado'))).toBe(true);
  });
  test('la media de comida solo cuenta los días con comidas apuntadas de esta semana', () => {
    const st = buildInitialState();
    st.comida.diario = {
      '2026-11-02': [{ id: '1', momento: 'comida', nombre: 'A', kcal: 600, p: 40, c: 60, g: 20 }],
      '2026-11-03': [{ id: '2', momento: 'comida', nombre: 'B', kcal: 800, p: 50, c: 80, g: 30 }],
      '2026-10-30': [{ id: '3', momento: 'comida', nombre: 'C', kcal: 9999, p: 1, c: 1, g: 1 }],
    };
    const r = S.resumenSemanaLocal(st, new Date(2026, 10, 4, 18, 0));
    expect(r.comida.dias).toBe(2);
    expect(r.comida.kcalMedia).toBe(700);
    expect(r.comida.protMedia).toBe(45);
    expect(ymd(new Date(2026, 10, 4))).toBe('2026-11-04');
  });
});

describe('descanso en minutos y segundos', () => {
  test('se lee como lo dices tú', () => {
    expect(textoDescanso(30)).toBe('30 segundos');
    expect(textoDescanso(60)).toBe('1 minuto');
    expect(textoDescanso(90)).toBe('1 minuto y medio');
    expect(textoDescanso(120)).toBe('2 minutos');
    expect(textoDescanso(150)).toBe('2 minutos y medio');
    expect(textoDescanso(180)).toBe('3 minutos');
    expect(textoDescanso(210)).toBe('3 minutos y medio');
    expect(textoDescanso(165)).toBe('2 min y 45 s');
  });
  test('el selector va de 30 segundos a 5 minutos', () => {
    expect(OPCIONES_DESCANSO[0].texto).toBe('30 segundos');
    expect(OPCIONES_DESCANSO[OPCIONES_DESCANSO.length - 1].valor).toBe(300);
  });
});
