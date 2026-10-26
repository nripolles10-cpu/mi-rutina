// Pruebas de las funciones puras de la app (se importan de los módulos de src/)
import { describe, test, expect, beforeAll } from 'vitest';
import { loadApp } from './loadApp.js';

let A;
beforeAll(() => { localStorage.clear(); A = loadApp(); });


describe('series efectivas', () => {
  test('effectiveCount: calentamiento 0, normal 1, rest-pause y dropset suman 0,5 por tanda/descenso extra', () => {
    expect(A.effectiveCount({ tipo: 'warm', reps: 10, weight: 50 })).toBe(0);
    expect(A.effectiveCount({ tipo: 'top', reps: 8, weight: 100 })).toBe(1);
    expect(A.effectiveCount({ tipo: 'backoff', reps: 8, weight: 90 })).toBe(1);
    expect(A.effectiveCount({ tipo: 'rp', weight: 70, tandas: [8, 4, 3] })).toBe(2);
    expect(A.effectiveCount({ tipo: 'rp', weight: 70, tandas: [8, 4] })).toBe(1.5);
    expect(A.effectiveCount({ tipo: 'drop', drops: [{ weight: 60, reps: 8 }, { weight: 50, reps: 6 }, { weight: 40, reps: 6 }] })).toBe(2);
    expect(A.effectiveCount(null)).toBe(0);
  });

  test('weeklySets con la rutina de serie: el gemelo cuenta en los dos días, los calentamientos no cuentan', () => {
    const st = A.buildInitialState();
    const w = A.weeklySets(st);
    expect(w.gemelos).toBe(6); // 3 series × 2 días
    expect(w.cuadriceps).toBe(8); // 2+2+2 + rest-pause de 3 tandas (2)
    expect(w.pecho).toBe(6); // aperturas solo calentamiento (0) + 2 + 2 + 2
    expect(w.lumbar).toBe(2);
    expect(w.abductores).toBe(2);
    expect(Object.keys(w).length).toBe(15);
  });

  test('weeklySets ignora ejercicios que no están en ningún día', () => {
    const st = A.buildInitialState();
    st.exercises.oculto = A.normalizeExercise({ name: 'Oculto', cat: 'pecho', currentSets: [{ reps: 8, weight: 50 }, { reps: 8, weight: 50 }] });
    expect(A.weeklySets(st).pecho).toBe(6);
  });
});

describe('progreso hacia objetivos por músculo', () => {
  test('media de (mejor marca / objetivo) con tope 100 % y kg que faltan', () => {
    const st = A.buildInitialState();
    st.exercises = {
      a: A.normalizeExercise({ name: 'A', cat: 'pecho', objetivo: { text: '100 kg', value: 100 }, currentSets: [{ reps: 8, weight: 80 }], history: [] }),
      b: A.normalizeExercise({ name: 'B', cat: 'pecho', objetivo: { text: '50 kg', value: 50 }, currentSets: [{ reps: 8, weight: 60 }], history: [] }),
      c: A.normalizeExercise({ name: 'C', cat: 'pecho', objetivo: { text: 'Máquina entera', value: null }, currentSets: [{ reps: 8, weight: 60 }], history: [] }),
    };
    st.days = [{ id: 'd', label: 'D', equipo: '', nota: '', ids: ['a', 'b', 'c'] }];
    const p = A.muscleProgress(st);
    expect(p.pecho.pct).toBeCloseTo(90, 6);
    expect(p.pecho.falta).toBeCloseTo(10, 6);
    expect(p.pecho.ignorados).toBe(1);
    expect(p.espalda.pct).toBeNull();
  });

  test('la mejor marca sale del historial aunque la serie actual sea menor', () => {
    const ex = A.normalizeExercise({ name: 'X', cat: 'pecho', currentSets: [{ reps: 8, weight: 70 }], history: [{ date: '2026-10-01T10:00:00Z', sets: [{ reps: 6, weight: 90 }] }, { date: '2026-10-08T10:00:00Z', sets: [{ reps: 8, weight: 80 }] }] });
    expect(A.bestSerie1(ex)).toBe(90);
    expect(A.latestSerie1(ex)).toBe(80);
  });
});

describe('nutrición', () => {
  test('Mifflin-St Jeor (hombre y mujer) y Katch-McArdle con % de grasa', () => {
    expect(A.calcBMRInfo({ kg: 80, cm: 180, edad: 30, sexo: 'M' })).toMatchObject({ bmr: 1780, metodo: 'Mifflin-St Jeor' });
    expect(A.calcBMRInfo({ kg: 80, cm: 180, edad: 30, sexo: 'F' }).bmr).toBe(1614);
    const k = A.calcBMRInfo({ kg: 80, cm: 180, edad: 30, sexo: 'M', grasaPct: 15 });
    expect(k.metodo).toBe('Katch-McArdle');
    expect(k.bmr).toBeCloseTo(370 + 21.6 * 68, 6);
    expect(A.calcBMRInfo({ kg: 80 })).toBeNull();
  });

  test('factores de actividad 1,2 / 1,35 / 1,5 / 1,65', () => {
    expect(A.ACTIVIDAD_FACTOR).toEqual({ sedentario: 1.2, ligero: 1.35, moderado: 1.5, intenso: 1.65 });
  });

  test('calcPlan: definición ritmo normal, macros y semanas', () => {
    const p = A.calcPlan({ objetivo: 'definicion', ritmo: 'normal', kg: 80, objetivoKg: 75, alturaCm: 180, edad: 30, sexo: 'M', actividad: 'moderado' });
    expect(p.falta).toBe(false);
    expect(p.tdee).toBe(2670);
    expect(p.delta).toBe(-450);
    expect(p.kcal).toBe(2220);
    expect(p.protG).toBe(184); // 2,3 g/kg
    expect(p.fatG).toBe(56); // 0,7 g/kg
    expect(p.carbG).toBe(Math.round((2220 - 184 * 4 - 56 * 9) / 4));
    expect(p.semanas).toBe(13);
    expect(p.carbBajo).toBe(false);
  });

  test('calcPlan: volumen y mantenimiento; gasto real sustituye a la fórmula', () => {
    const v = A.calcPlan({ objetivo: 'volumen', ritmo: 'rapido', kg: 70, objetivoKg: 75, alturaCm: 175, edad: 25, sexo: 'M', actividad: 'intenso' });
    expect(v.delta).toBe(450);
    const m = A.calcPlan({ objetivo: 'mantenimiento', ritmo: 'normal', kg: 70, alturaCm: 175, edad: 25, sexo: 'M', actividad: 'intenso', tdeeReal: 3000 });
    expect(m.tdee).toBe(3000);
    expect(m.kcal).toBe(3000);
    expect(m.semanas).toBeNull();
    expect(A.calcPlan({ objetivo: 'definicion', kg: 70 }).falta).toBe(true);
  });

  test('macroSplit avisa si no llegan las calorías', () => {
    const s = A.macroSplit(1000, 100, 2.3, 0.7);
    expect(s.carbBajo).toBe(true);
    expect(s.carbG).toBe(0);
  });
});

describe('gasto real con datos (≥ 14 días)', () => {
  function stateCon(dias, kcal, pesoInicial, kgDia) {
    const st = A.buildInitialState();
    st.comida.diario = {};
    st.peso.historial = [];
    for (let i = dias; i >= 1; i--) {
      const d = A.addDays(new Date(), -i);
      st.comida.diario[A.ymd(d)] = [{ id: 'e' + i, momento: 'comida', nombre: 'x', kcal: kcal, p: 0, c: 0, g: 0 }];
      const n = new Date(d); n.setHours(12, 0, 0, 0);
      st.peso.historial.push({ id: 'p' + i, date: n.toISOString(), kg: pesoInicial + kgDia * (dias - i) });
    }
    return st;
  }
  test('pierde 0,1 kg/día comiendo 2500 → gasto ≈ 3270 kcal', () => {
    const g = A.gastoReal(stateCon(20, 2500, 85, -0.1));
    expect(g.ok).toBe(true);
    expect(g.kcalMed).toBe(2500);
    expect(g.tdee).toBeGreaterThanOrEqual(3268);
    expect(g.tdee).toBeLessThanOrEqual(3272);
    expect(g.kgSemana).toBeCloseTo(-0.7, 2);
  });
  test('con menos de 14 días explica qué falta', () => {
    const g = A.gastoReal(stateCon(10, 2500, 85, -0.1));
    expect(g.ok).toBe(false);
    expect(g.motivo).toMatch(/14/);
  });
  test('sin pesos suficientes también lo explica', () => {
    const st = stateCon(20, 2500, 85, -0.1);
    st.peso.historial = st.peso.historial.slice(0, 1);
    const g = A.gastoReal(st);
    expect(g.ok).toBe(false);
    expect(g.motivo).toMatch(/peso/);
  });
});

describe('recetas e ingredientes', () => {
  test('ingMacros por 100 g, por unidad y por cucharada', () => {
    const pollo = A.ingMacros('Pechuga de pollo', 150, 'g');
    expect(pollo[0]).toBeCloseTo(33.75, 6);
    expect(A.ingMacros('Huevo', 2, 'ud')).toEqual([15, 0.8, 12.6]);
    expect(A.ingMacros('Aceite de oliva', 1, 'cda')[2]).toBeCloseTo(13.65, 6);
    expect(A.ingMacros('Aceite de oliva', 1, 'cdta')[2]).toBeCloseTo(4.55, 6);
    expect(A.ingMacros('No existe', 100, 'g')).toEqual([0, 0, 0]);
  });

  test('las 60 recetas de serie (31 de siempre + 29 nuevas): cada ingrediente existe en NUTRI_DB con una unidad válida, y los macros salen de las cantidades', () => {
    const recetas = A.mkRecetas();
    expect(recetas.length).toBe(60);
    expect(A.mkRecetasOriginales().length).toBe(31);
    expect(A.RECETAS_NUEVAS_V8().length).toBe(29);
    const ids = new Set();
    recetas.forEach((r) => {
      expect(ids.has(r.id)).toBe(false); ids.add(r.id);
      expect(r.pasos.length).toBeGreaterThan(0);
      let p = 0, c = 0, g = 0;
      r.ingredientes.forEach((x) => {
        const d = A.NUTRI_DB[x.n];
        expect(d, 'ingrediente sin datos: ' + x.n).toBeTruthy();
        const porPeso = ['g', 'ml', 'cda', 'cdta'].indexOf(x.u) !== -1;
        // un ingrediente "por 100 g" con una unidad que no es de peso daría 0 sin avisar
        if (d.per100 && !d.ud) expect(porPeso, x.n + ' en ' + x.u).toBe(true);
        expect(typeof x.q).toBe('number');
        const m = A.ingMacros(x.n, x.q, x.u);
        p += m[0]; c += m[1]; g += m[2];
      });
      expect(r.p).toBe(Math.round(p));
      expect(r.c).toBe(Math.round(c));
      expect(r.g).toBe(Math.round(g));
      expect(A.recKcal(r)).toBe(4 * r.p + 4 * r.c + 9 * r.g);
    });
  });

  test('macrosFromIngredientes calcula y lista los ingredientes desconocidos', () => {
    const m = A.macrosFromIngredientes([{ n: 'Pechuga de pollo', q: 100, u: 'g' }, { n: 'Kebab', q: 1, u: 'ud' }]);
    expect(m).toEqual({ p: 23, c: 0, g: 2, desconocidos: ['Kebab'] });
  });

  test('normalizeRecetas repara tipos y datos raros sin romper', () => {
    const r = A.normalizeRecetas([{ nombre: 'X', tipo: 'merienda', objetivos: ['volumen', 'raro'], ingredientes: [{ n: 'Huevo', q: '2', u: 'ud' }, null] }, null], []);
    expect(r.length).toBe(1);
    expect(r[0].tipo).toBe('comida');
    expect(r[0].objetivos).toEqual(['volumen']);
    expect(r[0].ingredientes).toEqual([{ n: 'Huevo', q: null, u: 'ud' }]);
  });

  test('listaCompra suma cantidades de todos los días según las raciones', () => {
    const st = A.buildInitialState();
    st.comida.plan = {
      0: { desayuno: [], comida: [{ id: 'a', recetaId: 'r_arroz_pollo', raciones: 2 }], cena: [], snack: [] },
      3: { desayuno: [], comida: [], cena: [{ id: 'b', recetaId: 'r_arroz_pollo', raciones: 1 }], snack: [] },
      5: { desayuno: [], comida: [{ id: 'c', recetaId: 'no_existe', raciones: 1 }], cena: [], snack: [] },
    };
    const l = A.listaCompra(st);
    const pollo = l.find((x) => x.nombre === 'Pechuga de pollo');
    expect(pollo.q).toBe(450);
    expect(pollo.u).toBe('g');
    const aceite = l.find((x) => x.nombre === 'Aceite de oliva');
    expect(aceite.q).toBe(3);
    expect(aceite.u).toBe('cda');
    // ordenada alfabéticamente en español
    const nombres = l.map((x) => x.nombre);
    expect(nombres).toEqual(nombres.slice().sort((a, b) => a.localeCompare(b, 'es')));
  });
});

describe('agua en litros', () => {
  test('datos antiguos en vasos de 250 ml pasan a litros (con decimales)', () => {
    const a = A.normalizeAgua({ objetivo: 12, dias: { '2026-10-20': 6, '2026-10-21': 7, '2026-10-22': 10 } });
    expect(a.unidad).toBe('litros');
    expect(a.objetivo).toBe(3);
    expect(a.dias['2026-10-20']).toBe(1.5);
    expect(a.dias['2026-10-21']).toBe(1.75);
    expect(a.dias['2026-10-22']).toBe(2.5);
    expect(A.normalizeAgua({ objetivo: 10, dias: {} }).objetivo).toBe(2.5);
  });
  test('datos ya en litros no se tocan; sin datos → objetivo 3 L', () => {
    const l = { objetivo: 3.5, dias: { '2026-10-22': 2.5 }, unidad: 'litros' };
    expect(A.normalizeAgua(l)).toEqual(l);
    expect(A.normalizeAgua(undefined)).toEqual({ objetivo: 3, dias: {}, unidad: 'litros' });
  });
});

describe('1RM', () => {
  test('media de Epley y Brzycki, rango y tabla', () => {
    const r = A.calc1RM(100, 6);
    expect(r.epley).toBeCloseTo(120, 6);
    expect(r.brzycki).toBeCloseTo(3600 / 31, 6);
    expect(r.media).toBeCloseTo((120 + 3600 / 31) / 2, 6);
    expect(r.min).toBeCloseTo(3600 / 31, 6);
    expect(r.max).toBeCloseTo(120, 6);
    expect(r.tabla.length).toBe(9);
    expect(r.tabla[0]).toEqual({ pct: 100, reps: 1, kg: r.media });
    expect(A.calc1RM(100, 1).media).toBe(100);
  });
  test('datos no válidos → null', () => {
    expect(A.calc1RM(100, 31)).toBeNull();
    expect(A.calc1RM(100, 0)).toBeNull();
    expect(A.calc1RM(0, 5)).toBeNull();
    expect(A.calc1RM(null, 5)).toBeNull();
  });
});

describe('discos', () => {
  test('barra de 20 kg', () => {
    expect(A.calcDiscos(20, 100)).toEqual({ usados: [[25, 1], [15, 1]], resto: 0, enDiscos: 80, montado: 100 });
    expect(A.calcDiscos(20, 20)).toEqual({ usados: [], resto: 0, enDiscos: 0, montado: 20 });
  });
  test('sin barra (0 kg): solo cuentan los discos', () => {
    expect(A.calcDiscos(0, 45)).toEqual({ usados: [[20, 1], [2.5, 1]], resto: 0, enDiscos: 45, montado: 45 });
    expect(A.calcDiscos(0, 2.5)).toEqual({ usados: [[1.25, 1]], resto: 0, enDiscos: 2.5, montado: 2.5 });
  });
  test('peso que no se puede montar exacto y objetivo menor que la barra', () => {
    const r = A.calcDiscos(20, 21);
    expect(r.resto).toBe(0.5);
    expect(r.montado).toBe(20);
    expect(A.calcDiscos(20, 10)).toEqual({ menor: true });
    expect(A.calcDiscos(20, null)).toBeNull();
  });
});

describe('números con coma decimal', () => {
  test('parseDecimal acepta coma y punto', () => {
    expect(A.parseDecimal('102,5')).toBe(102.5);
    expect(A.parseDecimal('102.5')).toBe(102.5);
    expect(A.parseDecimal('7,')).toBe(7);
    expect(A.parseDecimal('')).toBeNull();
    expect(A.parseDecimal(',')).toBeUndefined();
    expect(A.parseDecimal('1,2,3')).toBeUndefined();
    expect(A.parseDecimal('abc')).toBeUndefined();
  });
  test('formatDecimal muestra coma y sin separador de miles', () => {
    expect(A.formatDecimal(102.5)).toBe('102,5');
    expect(A.formatDecimal(1500)).toBe('1500');
    expect(A.formatDecimal(0.1 + 0.2)).toBe('0,3');
    expect(A.formatDecimal(null)).toBe('');
    expect(A.formatDecimal(NaN)).toBe('');
  });
  test('fmt usa formato español', () => {
    expect(A.fmt(2.5, 2)).toBe('2,5');
    expect(A.fmt(10000)).toBe('10.000');
    expect(A.fmt(null)).toBe('—');
    expect(A.fmt(NaN)).toBe('—');
  });
});

describe('fechas locales', () => {
  test('ymd y fromYmd no se desplazan con la zona horaria', () => {
    const d = A.fromYmd('2026-10-25'); // día del cambio de hora en España
    expect(d.getDate()).toBe(25);
    expect(A.ymd(d)).toBe('2026-10-25');
    expect(A.ymd(A.addDays(d, 1))).toBe('2026-10-26');
    expect(A.ymd(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
  });
});

describe('enlaces seguros', () => {
  test('solo http y https', () => {
    expect(A.safeUrl('https://www.youtube.com/watch?v=x')).toBe('https://www.youtube.com/watch?v=x');
    expect(A.safeUrl('javascript:alert(1)')).toBeNull();
    expect(A.safeUrl('')).toBeNull();
  });
});
