// Compartir, importar, copia de seguridad y exportación
import { describe, test, expect, beforeEach } from 'vitest';
import { loadApp } from './loadApp.js';

let A;
beforeEach(() => { localStorage.clear(); A = loadApp(); });

function miEstado() {
  const st = A.buildInitialState();
  st.formulario.nombre = 'Nacho';
  st.exercises.gemelo.currentSets[0].weight = 102.5;
  st.exercises.gemelo.history.push({ date: '2026-10-20T10:00:00.000Z', sets: [{ tipo: 'top', reps: 8, weight: 102.5 }] });
  st.peso.historial.push({ id: 'k', date: '2026-10-20T10:00:00.000Z', kg: 83.4 });
  return st;
}

describe('códigos GYMR1', () => {
  test('ida y vuelta: lo que se codifica se recupera igual', () => {
    const st = miEstado();
    const obj = A.buildShareObject(st, { historial: true, peso: true, recetas: true, nutricion: true, todo: true }, null);
    const code = A.encodeShare(obj);
    expect(code.startsWith('GYMR1.')).toBe(true);
    const r = A.decodeShare(code);
    expect(r.ok).toBe(true);
    expect(r.obj).toEqual(JSON.parse(JSON.stringify(obj)));
    expect(r.obj.appVersion).toBe(A.APP_VERSION);
  });

  test('admite espacios y saltos de línea (al copiar de WhatsApp o del correo)', () => {
    const code = A.encodeShare(A.buildShareObject(miEstado(), {}, null));
    const roto = code.slice(0, 40) + '\n  ' + code.slice(40, 90) + ' ' + code.slice(90);
    expect(A.decodeShare(roto).ok).toBe(true);
  });

  test('código corrupto: la huella no coincide', () => {
    const code = A.encodeShare(A.buildShareObject(miEstado(), {}, null));
    const i = code.length - 10;
    const otro = code.slice(0, i) + (code[i] === 'A' ? 'B' : 'A') + code.slice(i + 1);
    const r = A.decodeShare(otro);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/corrupto|huella/);
  });

  test('código incompleto (cortado al copiar)', () => {
    const code = A.encodeShare(A.buildShareObject(miEstado(), {}, null));
    expect(A.decodeShare(code.slice(0, code.length - 30)).ok).toBe(false);
    expect(A.decodeShare('GYMR1.abc').ok).toBe(false);
    expect(A.decodeShare('GYMR1.abc.').ok).toBe(false);
  });

  test('textos que no son códigos', () => {
    expect(A.decodeShare('').error).toMatch(/ningún código/);
    expect(A.decodeShare('hola que tal').error).toMatch(/GYMR1/);
  });

  test('código bien formado pero con una rutina rota no se acepta', () => {
    const malo1 = A.encodeShare({ app: 'gymtracker', v: 1, rutina: { days: [{ id: 'd', label: 'D', ids: 'gemelo' }], exercises: { gemelo: { name: 'G' } } } });
    expect(A.decodeShare(malo1).ok).toBe(false);
    const malo2 = A.encodeShare({ app: 'gymtracker', v: 1, rutina: { days: [{ id: 'd', label: 'D', ids: ['noexiste'] }], exercises: {} } });
    expect(A.decodeShare(malo2).error).toMatch(/rota/);
    const malo3 = A.encodeShare({ app: 'otra', rutina: {} });
    expect(A.decodeShare(malo3).ok).toBe(false);
  });

  test('describeShare resume lo que trae el código', () => {
    const obj = A.buildShareObject(miEstado(), { peso: true, recetas: true }, null);
    const d = A.describeShare(obj);
    expect(d[0]).toMatch(/5 días/);
    expect(d.some((x) => /Peso corporal/.test(x))).toBe(true);
    expect(d.some((x) => /Recetas \(60\)/.test(x))).toBe(true);
  });
});

describe('applyImport', () => {
  test('modo "solo la rutina": conserva tu historial de los ejercicios que coinciden, tu peso y tus ejercicios propios ocultos', () => {
    const yo = miEstado();
    yo.exercises.mio = A.normalizeExercise({ name: 'Mío', cat: 'pecho', currentSets: [{ reps: 5, weight: 50 }], history: [{ date: '2026-10-01T10:00:00Z', sets: [{ reps: 5, weight: 50 }] }] });
    yo.days[0].ids.push('mio');
    const amigo = A.buildInitialState();
    amigo.days = [{ id: 'dA', label: 'Día del amigo', equipo: '', nota: '', ids: ['gemelo'] }];
    amigo.exercises.gemelo.currentSets = [A.normalizeSet({ reps: 10, weight: 60 }, 0)];
    amigo.peso.historial = [{ id: 'z', date: '2026-10-01T10:00:00Z', kg: 60 }];
    const obj = JSON.parse(JSON.stringify(A.buildShareObject(amigo, { historial: true, peso: true }, null)));
    const r = A.applyImport(yo, obj, 'rutina');
    expect(r.days.map((d) => d.label)).toEqual(['Día del amigo']);
    expect(r.exercises.gemelo.currentSets[0].weight).toBe(60);
    expect(r.exercises.gemelo.history.some((h) => h.sets[0].weight === 102.5)).toBe(true); // tu historial
    expect(r.exercises.mio.history.length).toBe(1); // tu ejercicio propio, oculto pero no perdido
    expect(r.peso.historial.some((x) => x.kg === 83.4)).toBe(true); // tu peso no se toca
    expect(r.formulario.nombre).toBe('Nacho');
  });

  test('modo "reemplazar todo" (restaurar copia de seguridad en otro móvil)', () => {
    const viejoMovil = miEstado();
    viejoMovil.comida.agua.dias = { '2026-10-20': 2.5 };
    const code = A.encodeShare(A.buildShareObject(viejoMovil, { historial: true, peso: true, recetas: true, nutricion: true, todo: true }, null));
    const nuevoMovil = A.buildInitialState();
    const r = A.applyImport(nuevoMovil, A.decodeShare(code).obj, 'todo');
    expect(r.exercises.gemelo.history.some((h) => h.sets[0].weight === 102.5)).toBe(true);
    expect(r.peso.historial.some((x) => x.kg === 83.4)).toBe(true);
    expect(r.comida.agua.dias['2026-10-20']).toBe(2.5);
    expect(r.version).toBe(A.APP_VERSION);
  });
});

describe('exportar a CSV (Excel)', () => {
  test('BOM UTF-8, ";" como separador, coma decimal, una fila por serie y saltos \\r\\n', () => {
    const st = miEstado();
    const csv = A.buildCsv(st);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    const lines = csv.slice(1).split('\r\n').filter(Boolean);
    expect(lines[0]).toBe('Dia;Equipo;Ejercicio;Musculo;Serie;Tipo;Repeticiones;Peso_kg;Nota_serie;Objetivo;Objetivo_kg;Comentarios');
    const totalSeries = st.days.reduce((a, d) => a + d.ids.reduce((b, id) => b + st.exercises[id].currentSets.length, 0), 0);
    expect(lines.length - 1).toBe(totalSeries);
    expect(csv).toContain(';102,5;');
    expect(csv).toContain('Prensa de placas;Cuádriceps;1;top set;8;75,3;');
  });

  test('rest-pause y dropset: varias cifras separadas por " · " (Excel no las convierte en fechas)', () => {
    const st = miEstado();
    st.exercises.extCuadricepsBi.currentSets = [A.normalizeSet({ tipo: 'rp', weight: 73, tandas: [8, 4, null] }, 0)];
    st.exercises.beltSquat.currentSets = [A.normalizeSet({ tipo: 'drop', drops: [{ weight: 100, reps: 8 }, { weight: 82.5, reps: 6 }] }, 0)];
    const csv = A.buildCsv(st);
    expect(csv).toContain(';rest-pause;8 · 4 · –;73;');
    expect(csv).toContain(';dropset;8 · 6;100 · 82,5;');
    expect(csv).not.toMatch(/;\d+\/\d+/);
  });

  test('textos con ";" o comillas van entre comillas', () => {
    expect(A.csvEsc('a;b')).toBe('"a;b"');
    expect(A.csvEsc('di "hola"')).toBe('"di ""hola"""');
    expect(A.csvEsc('normal')).toBe('normal');
  });
});

describe('exportar a texto y Word', () => {
  test('el .txt incluye todo y sin "undefined" ni "NaN"', () => {
    const t = A.buildTxt(miEstado());
    expect(t).toContain('DÍA 1: PIERNA A');
    expect(t).toContain('CARDIO');
    expect(t).toContain('SUPLEMENTACIÓN');
    expect(t).toContain('83,4 kg');
    expect(t).not.toMatch(/undefined|NaN/);
  });
  test('el .doc escapa el HTML de los textos del usuario', () => {
    const st = miEstado();
    st.exercises.gemelo.comentario = '<script>alert(1)</script>';
    const h = A.buildDocHtml(st);
    expect(h).not.toContain('<script>alert');
    expect(h).toContain('&lt;script&gt;');
  });
});
