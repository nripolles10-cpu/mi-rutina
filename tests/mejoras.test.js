// Pruebas de las mejoras de la versión 8: objetivo de peso, calorías, músculos editables y recetas nuevas
import { describe, test, expect, beforeEach } from 'vitest';
import { loadApp } from './loadApp.js';

let A;
beforeEach(() => { localStorage.clear(); A = loadApp(); A.aplicarCatalogo(A.MUSCULOS_POR_DEFECTO); });

/* ---------------------------------------------------------------- 1) objetivo de peso */
describe('objetivo de peso corporal', () => {
  test('validar: coma decimal, rango razonable y vacío = quitar', () => {
    expect(A.validarObjetivoPeso('78,5')).toEqual({ ok: true, kg: 78.5 });
    expect(A.validarObjetivoPeso('78.25')).toEqual({ ok: true, kg: 78.3 });
    expect(A.validarObjetivoPeso(80)).toEqual({ ok: true, kg: 80 });
    expect(A.validarObjetivoPeso('')).toEqual({ ok: true, kg: null });
    expect(A.validarObjetivoPeso(null)).toEqual({ ok: true, kg: null });
    expect(A.validarObjetivoPeso('abc').ok).toBe(false);
    expect(A.validarObjetivoPeso('-5').ok).toBe(false);
    expect(A.validarObjetivoPeso('12').ok).toBe(false);
    expect(A.validarObjetivoPeso('450').error).toMatch(/entre 30 y 300/);
  });

  test('el mismo dato en Progreso (peso.objetivoKg) y en Ajustes (formulario.objetivoPesoKg); la calculadora lo lee', () => {
    const st = A.buildInitialState(); // pesa 84 y el objetivo es 80
    const n = A.aplicarObjetivoPeso(st, 90);
    expect(n.peso.objetivoKg).toBe(90);
    expect(n.formulario.objetivoPesoKg).toBe(90);
    expect(n.peso.direccion).toBe('subir');
    expect(A.effNutri(n).eff.objetivoKg).toBe(90);
    const b = A.aplicarObjetivoPeso(n, 75);
    expect(b.peso.direccion).toBe('bajar');
  });

  test('"alcanzado" solo se reinicia si el objetivo cambia; quitar el objetivo', () => {
    const st = A.buildInitialState();
    st.peso.objetivoAlcanzado = true;
    expect(A.aplicarObjetivoPeso(st, 80)).toBe(st); // mismo objetivo: no cambia nada
    const n = A.aplicarObjetivoPeso(st, 79);
    expect(n.peso.objetivoAlcanzado).toBe(false);
    const q = A.aplicarObjetivoPeso(n, null);
    expect(q.peso.objetivoKg).toBeNull();
    expect(q.formulario.objetivoPesoKg).toBeNull();
    expect(q.peso.direccion).toBeNull();
    expect(q.peso.historial).toBe(n.peso.historial); // los registros de peso no se tocan
  });

  test('la dirección usa el último peso registrado', () => {
    const st = A.buildInitialState();
    st.peso.historial.push({ id: 'x', date: '2026-10-25T10:00:00Z', kg: 70 });
    expect(A.aplicarObjetivoPeso(st, 75).peso.direccion).toBe('subir');
  });

  test('migración: la calculadora deja de tener un objetivo propio y Ajustes queda igual que Progreso', () => {
    const st = A.buildInitialState();
    st.version = 7;
    st.nutricion.pesoObjetivo = 70;
    st.formulario.objetivoPesoKg = 81;
    st.peso.objetivoKg = 80;
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    expect(m.peso.objetivoKg).toBe(80);
    expect(m.formulario.objetivoPesoKg).toBe(80);
    expect(m.nutricion.pesoObjetivo).toBeNull();
  });
});

/* ---------------------------------------------------------------- 2) calorías */
describe('calorías según sexo, edad, altura, peso, % de grasa y actividad', () => {
  const base = { objetivo: 'definicion', ritmo: 'normal', kg: 75, alturaCm: 175, edad: 30, actividad: 'moderado' };
  const plan = (o) => A.calcPlan({ ...base, ...o });

  test('hombre y mujer con la misma edad, altura y peso: la mujer sale con menos calorías', () => {
    const h = plan({ sexo: 'M' });
    const m = plan({ sexo: 'F' });
    expect([h.bmr, h.tdee, h.kcal]).toEqual([1699, 2548, 2098]);
    expect([m.bmr, m.tdee, m.kcal]).toEqual([1533, 2299, 1849]);
    expect(m.kcal).toBeLessThan(h.kcal);
    expect(h.kcal - m.kcal).toBe(249); // 166 kcal de basal × 1,5 de actividad
    // la mujer lleva algo más de grasa en la dieta (0,8 g/kg en definición en vez de 0,7)
    expect(h.fatG).toBe(53);
    expect(m.fatG).toBe(60);
  });

  test('la edad influye: a más edad, menos calorías', () => {
    expect(plan({ sexo: 'M', edad: 20 }).kcal).toBe(2173);
    expect(plan({ sexo: 'M', edad: 50 }).kcal).toBe(1948);
    expect(plan({ sexo: 'F', edad: 20 }).kcal).toBe(1924);
    expect(plan({ sexo: 'F', edad: 50 }).kcal).toBe(1699);
  });

  test('con % de grasa: Katch-McArdle (masa magra); a igual masa magra, igual basal, y se explica', () => {
    const h = plan({ sexo: 'M', grasaPct: 20 });
    const m = plan({ sexo: 'F', grasaPct: 20 });
    expect(h.metodo).toBe('Katch-McArdle');
    expect(h.lbm).toBe(60);
    expect(h.bmr).toBe(1666);
    expect(m.bmr).toBe(1666); // la masa magra ya refleja el sexo: con la misma, mismo basal
    expect(m.mifflin).toBe(1533); // para enseñarlo en pantalla al lado
    expect(h.mifflin).toBe(1699);
    // los macros sí cambian con el sexo: peso de referencia para la proteína y grasa mínima
    expect(h.protG).toBe(162); // 2,3 g × 70,6 kg (el peso con un 15 % de grasa)
    expect(m.protG).toBe(173);
    expect(m.fatG).toBeGreaterThan(h.fatG);
  });

  test('un % de grasa que no es creíble para el sexo se ignora (y se avisa)', () => {
    const m = plan({ sexo: 'F', grasaPct: 8 });
    expect(m.metodo).toBe('Mifflin-St Jeor');
    expect(m.grasaIgnorada).toBe(true);
    expect(plan({ sexo: 'M', grasaPct: 8 }).metodo).toBe('Katch-McArdle');
    expect(plan({ sexo: 'M', grasaPct: 60 }).grasaIgnorada).toBe(true);
  });

  test('suelo de seguridad: nunca por debajo de 1.200 (mujer) / 1.500 (hombre) ni del basal', () => {
    const m = plan({ sexo: 'F', kg: 55, alturaCm: 160, actividad: 'sedentario', ritmo: 'rapido' });
    expect(m.kcalSinSuelo).toBe(887);
    expect(m.kcal).toBe(1239); // su basal, que es mayor que 1.200
    expect(m.ajustadoAlSuelo).toBe(true);
    const h = plan({ sexo: 'M', kg: 60, alturaCm: 165, actividad: 'sedentario', ritmo: 'rapido' });
    expect(h.kcal).toBe(1500);
    expect(h.ajustadoAlSuelo).toBe(true);
    expect(h.delta).toBe(1500 - h.tdee); // el déficit que se muestra es el real
    // con volumen no hay suelo que aplicar
    expect(plan({ sexo: 'F', objetivo: 'volumen' }).ajustadoAlSuelo).toBe(false);
  });

  test('déficit excesivo: más del 25 % del gasto o más del 1 % del peso por semana', () => {
    // Persona pequeña con ritmo rápido sin llegar al suelo: 600 kcal sobre ~2.000 de gasto (> 25 %)
    const p = plan({ sexo: 'F', kg: 60, alturaCm: 165, edad: 25, actividad: 'moderado', ritmo: 'rapido' });
    expect(p.ajustadoAlSuelo).toBe(false);
    expect(p.deficitExcesivo).toBe(true);
    expect(plan({ sexo: 'M' }).deficitExcesivo).toBe(false);
  });

  test('Ajustes (calcCalorias): la mujer sale con menos y "bajar" respeta el suelo', () => {
    const f = { pesoInicialKg: 75, alturaCm: 175, edad: 30, actividad: 'moderado', grasaPct: null };
    const h = A.calcCalorias({ ...f, sexo: 'M' });
    const m = A.calcCalorias({ ...f, sexo: 'F' });
    expect(m.mantener).toBeLessThan(h.mantener);
    const peq = A.calcCalorias({ pesoInicialKg: 50, alturaCm: 155, edad: 40, sexo: 'F', actividad: 'sedentario' });
    expect(peq.bajar).toBeGreaterThanOrEqual(1200);
  });

  test('el sexo es un único dato: el de Ajustes (la calculadora ya no guarda uno propio)', () => {
    const st = A.buildInitialState();
    st.formulario = { ...st.formulario, sexo: 'F', edad: 30, alturaCm: 175 };
    st.nutricion = { ...st.nutricion, sexo: 'M' }; // dato antiguo de la calculadora
    expect(A.effNutri(st).eff.sexo).toBe('F');
    st.version = 7;
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    expect(m.formulario.sexo).toBe('F');
    expect(m.nutricion.sexo).toBeNull();
  });
});

/* ---------------------------------------------------------------- 3) músculos editables */
describe('catálogo de músculos editable', () => {
  test('datos antiguos sin catálogo propio cargan los 15 de serie con los mismos ids y colores', () => {
    const st = A.buildInitialState();
    delete st.musculos;
    st.version = 7;
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    expect(m.musculos.map((x) => x.id)).toEqual(['pecho', 'espalda', 'hombro', 'biceps', 'triceps', 'cuadriceps', 'aductores', 'isquios', 'gluteo', 'gemelos', 'core', 'antebrazo', 'trapecio', 'lumbar', 'abductores']);
    expect(m.musculos.find((x) => x.id === 'pecho').color).toBe('#F43F5E');
    expect(m.exercises.aperturasMaq.cat).toBe('pecho');
  });

  test('quitar "Pecho" y crear superior, medio e inferior: los ejercicios pasan sin perder historial', () => {
    let st = A.buildInitialState();
    const histAntes = JSON.stringify(st.exercises.pressIncMaq.history);
    let r = A.crearMusculo(st, 'Pecho superior', 'pecho'); expect(r.ok).toBe(true); st = r.state; const sup = r.id;
    r = A.crearMusculo(st, 'Pecho medio', 'pecho'); st = r.state;
    r = A.crearMusculo(st, '  Pecho   inferior ', 'pecho'); st = r.state;
    expect(st.musculos.slice(-3).map((m) => m.label)).toEqual(['Pecho superior', 'Pecho medio', 'Pecho inferior']);
    expect(new Set(st.musculos.map((m) => m.color)).size).toBe(st.musculos.length); // cada uno con su color
    // no deja quitar Pecho sin decir a dónde van sus ejercicios
    expect(A.borrarMusculo(st, 'pecho').ok).toBe(false);
    const usados = A.ejerciciosDeMusculo(st, 'pecho');
    expect(usados.length).toBeGreaterThan(0);
    r = A.borrarMusculo(st, 'pecho', sup);
    expect(r.ok).toBe(true);
    expect(r.movidos).toBe(usados.length);
    st = r.state;
    expect(st.musculos.some((m) => m.id === 'pecho')).toBe(false);
    usados.forEach((id) => expect(st.exercises[id].cat).toBe(sup));
    expect(JSON.stringify(st.exercises.pressIncMaq.history)).toBe(histAntes);
    expect(Object.keys(st.exercises).length).toBe(Object.keys(A.buildInitialState().exercises).length);
  });

  test('renombrar, nombres repetidos y no dejar la lista vacía', () => {
    let st = A.buildInitialState();
    expect(A.renombrarMusculo(st, 'core', 'abdomen').state.musculos.find((m) => m.id === 'core').label).toBe('abdomen');
    expect(A.renombrarMusculo(st, 'core', 'PÉCHO').ok).toBe(false); // ya existe "Pecho" (sin mirar tildes ni mayúsculas)
    expect(A.renombrarMusculo(st, 'core', '   ').ok).toBe(false);
    expect(A.crearMusculo(st, 'Espalda').ok).toBe(false);
    st = { ...st, musculos: [st.musculos[0]], exercises: {} };
    expect(A.borrarMusculo(st, 'pecho').error).toMatch(/al menos un músculo/);
  });

  test('quitar un músculo borra su estado de la Diana; los demás estados no se tocan', () => {
    let st = A.buildInitialState();
    st.diana = { estados: { trapecio: 'debil', pecho: 'fuerte' }, titulos: { trapecio: 'x' } };
    st = A.borrarMusculo(st, 'trapecio', 'espalda').state;
    expect(st.diana.estados).toEqual({ pecho: 'fuerte' });
    expect(st.diana.titulos).toEqual({});
  });

  test('un músculo propio cuenta en series por semana, objetivos y exportaciones', () => {
    let st = A.buildInitialState();
    const r = A.crearMusculo(st, 'Pecho superior', 'pecho');
    st = r.state;
    st.exercises.pressIncMaq = { ...st.exercises.pressIncMaq, cat: r.id };
    const ws = A.weeklySets(st);
    expect(ws[r.id]).toBe(2);
    const prog = A.muscleProgress(st);
    expect(prog[r.id].items.length).toBe(1);
    expect(A.buildCsv(st)).toContain(';Pecho superior;');
    expect(A.buildTxt(st)).toContain('[Pecho superior]');
    expect(A.buildDocHtml(st)).toContain('Pecho superior');
    const rows = A.readXlsxRows(A.buildXlsx(st));
    expect(rows.some((x) => x[3] === 'Pecho superior')).toBe(true);
  });

  test('compartir e importar: el código lleva los músculos; la copia completa los restaura y "solo rutina" añade los que falten', () => {
    let st = A.buildInitialState();
    const r = A.crearMusculo(st, 'Pecho superior', 'pecho');
    st = r.state;
    st.exercises.pressIncMaq = { ...st.exercises.pressIncMaq, cat: r.id };
    const code = A.encodeShare(A.buildShareObject(st, { historial: true, todo: true }, null));
    const dec = A.decodeShare(code);
    expect(dec.ok).toBe(true);
    // copia completa en un móvil nuevo
    const nuevo = A.applyImport(A.buildInitialState(), dec.obj, 'todo');
    expect(nuevo.musculos.some((m) => m.id === r.id && m.label === 'Pecho superior')).toBe(true);
    expect(nuevo.exercises.pressIncMaq.cat).toBe(r.id);
    // un amigo con sus propios músculos importa solo la rutina: conserva los suyos y recibe el nuevo
    let amigo = A.buildInitialState();
    const ra = A.crearMusculo(amigo, 'Cuello', null); amigo = ra.state;
    const res = A.applyImport(amigo, dec.obj, 'rutina');
    expect(res.musculos.some((m) => m.id === ra.id)).toBe(true);
    expect(res.musculos.some((m) => m.id === r.id)).toBe(true);
    expect(res.exercises.pressIncMaq.cat).toBe(r.id);
  });

  test('un código antiguo (sin músculos) con "copia completa" vuelve a los músculos de serie', () => {
    let st = A.buildInitialState();
    st = A.borrarMusculo(st, 'trapecio', 'espalda').state;
    const viejo = A.buildShareObject(A.buildInitialState(), { todo: true }, null);
    delete viejo.musculos; viejo.appVersion = 7;
    const res = A.applyImport(st, viejo, 'todo');
    expect(res.musculos.length).toBe(15);
  });

  test('un ejercicio con un músculo que ya no existe pasa a Core (o al primero) al cargar, sin romper', () => {
    const st = A.buildInitialState();
    st.exercises.gemelo.cat = 'no_existe';
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    expect(m.exercises.gemelo.cat).toBe('core');
    const sinCore = A.borrarMusculo(A.buildInitialState(), 'core', 'espalda').state;
    sinCore.exercises.gemelo.cat = 'no_existe';
    expect(A.migrateState(JSON.parse(JSON.stringify(sinCore))).exercises.gemelo.cat).toBe('pecho');
  });

  test('importar CSV reconoce tus músculos propios por el nombre', () => {
    let st = A.buildInitialState();
    st = A.crearMusculo(st, 'Pecho superior', 'pecho').state;
    const r = A.rowsToRutina(A.parseCsv('Dia;Ejercicio;Musculo\nA;Press inclinado;Pecho superior\n'), st);
    expect(r.avisos).toEqual([]);
    const ex = Object.values(r.obj.rutina.exercises)[0];
    expect(st.musculos.find((m) => m.id === ex.cat).label).toBe('Pecho superior');
  });

  test('normalizarMusculos repara datos raros y nunca devuelve una lista vacía', () => {
    expect(A.normalizarMusculos([]).length).toBe(15);
    expect(A.normalizarMusculos(null).length).toBe(15);
    const l = A.normalizarMusculos([{ id: 'a', label: '', color: 'rojo', region: 'cabeza' }, { id: 'a', label: 'dup' }, null, { id: 'pecho' }]);
    expect(l).toEqual([{ id: 'a', label: 'Músculo', color: '#94A3B8', emoji: '🎯', region: null }, { id: 'pecho', label: 'Pecho', color: '#F43F5E', emoji: '🎯', region: 'pecho' }]);
  });
});

/* ---------------------------------------------------------------- 4) recetas nuevas */
describe('recetas nuevas', () => {
  test('29 recetas nuevas repartidas entre desayuno, comida, cena y snack, con pasos y valores razonables', () => {
    const nuevas = A.RECETAS_NUEVAS_V8();
    expect(nuevas.length).toBe(29);
    const porTipo = {};
    nuevas.forEach((r) => { porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1; });
    expect(porTipo).toEqual({ desayuno: 7, comida: 8, cena: 7, snack: 7 });
    nuevas.forEach((r) => {
      const kcal = A.recKcal(r);
      expect(kcal, r.nombre).toBe(4 * r.p + 4 * r.c + 9 * r.g);
      expect(kcal, r.nombre).toBeGreaterThanOrEqual(150);
      expect(kcal, r.nombre).toBeLessThanOrEqual(800);
      expect(r.p, r.nombre + ' (proteína)').toBeGreaterThanOrEqual(15);
      expect(r.pasos.length).toBeGreaterThan(0);
      expect(r.objetivos.length).toBeGreaterThan(0);
    });
    // ninguna repite id con las de siempre
    const viejas = new Set(A.mkRecetasOriginales().map((r) => r.id));
    nuevas.forEach((r) => expect(viejas.has(r.id)).toBe(false));
  });

  test('NUTRI_DB: valores por 100 g creíbles (proteína + hidratos + grasa ≤ 100 g y sin negativos)', () => {
    Object.keys(A.NUTRI_DB).forEach((n) => {
      const d = A.NUTRI_DB[n];
      const v = d.per100 || d.ud;
      v.forEach((x) => expect(x, n).toBeGreaterThanOrEqual(0));
      if (d.per100) expect(v[0] + v[1] + v[2], n).toBeLessThanOrEqual(100);
    });
  });

  test('migración: se añaden las nuevas a tu lista guardada sin tocar tus recetas ni duplicar', () => {
    const st = A.buildInitialState();
    st.version = 7;
    const viejas = A.mkRecetasOriginales();
    viejas[0] = { ...viejas[0], nombre: 'Mi avena cambiada', editada: true };
    const propia = { id: 'r_mia', nombre: 'Mi receta', tipo: 'cena', objetivos: [], p: 1, c: 2, g: 3, ingredientes: [], pasos: ['x'], propia: true };
    // una nueva ya existía (por ejemplo, la creaste con el mismo id): no se pisa
    const yaEstaba = { ...A.RECETAS_NUEVAS_V8()[0], nombre: 'Mi porridge' };
    st.comida.recetas = viejas.slice(0, 5).concat([propia, yaEstaba]);
    const m = A.migrateState(JSON.parse(JSON.stringify(st)));
    const ids = m.comida.recetas.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(m.comida.recetas.length).toBe(5 + 1 + 29);
    expect(m.comida.recetas[0].nombre).toBe('Mi avena cambiada');
    expect(m.comida.recetas.find((r) => r.id === 'r_mia').nombre).toBe('Mi receta');
    expect(m.comida.recetas.find((r) => r.id === yaEstaba.id).nombre).toBe('Mi porridge');
    // las recetas de serie que borraste no vuelven
    expect(ids).not.toContain(viejas[10].id);
    // volver a abrir la app (ya en la versión 8) no las duplica
    const otra = A.migrateState(JSON.parse(JSON.stringify(m)));
    expect(otra.comida.recetas.length).toBe(m.comida.recetas.length);
  });

  test('restaurar una copia antigua (versión 7) también trae las recetas nuevas', () => {
    const viejo = A.buildShareObject(A.buildInitialState(), { recetas: true, todo: true }, null);
    viejo.appVersion = 7;
    viejo.recetas = A.mkRecetasOriginales();
    const res = A.applyImport(A.buildInitialState(), viejo, 'todo');
    expect(res.comida.recetas.length).toBe(60);
  });
});
