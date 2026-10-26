// Pruebas de lo nuevo de la Fase 2: Excel y CSV (ida y vuelta), datos por defecto, Word y el script make-default
import { describe, test, expect, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { loadApp } from './loadApp.js';

let A;
beforeEach(() => { localStorage.clear(); A = loadApp(); });

// Lo que importa de una rutina: días con sus ejercicios y las series de cada uno
function resumenRutina(st) {
  return st.days.map((d) => ({ label: d.label, ex: d.ids.map((id) => ({ name: st.exercises[id].name, cat: st.exercises[id].cat, sets: st.exercises[id].currentSets })) }));
}
function rutinaCompleja() {
  const st = A.buildInitialState();
  st.exercises.beltSquat.currentSets = [A.normalizeSet({ tipo: 'drop', drops: [{ weight: 100, reps: 8 }, { weight: 82.5, reps: 6 }, { weight: 60, reps: 5 }] }, 0)];
  st.exercises.extCuadricepsBi.currentSets = [A.normalizeSet({ tipo: 'rp', weight: 73, tandas: [8, 4, 3] }, 0)];
  st.exercises.gemelo.comentario = 'Pesado; "técnica" perfecta\nsegunda línea';
  st.exercises.gemelo.currentSets[0].nota = 'con pausa';
  return st;
}

describe('Excel (.xlsx)', () => {
  test('exportar y volver a importar deja la misma rutina', () => {
    const st = rutinaCompleja();
    const rows = A.readXlsxRows(A.buildXlsx(st));
    expect(rows[0]).toEqual(A.XLSX_HEADER);
    const r = A.rowsToRutina(rows, st);
    expect(r.ok).toBe(true);
    const nuevo = A.applyImport(st, r.obj, 'rutina');
    expect(resumenRutina(nuevo)).toEqual(resumenRutina(st));
    // se reutilizan los ids (se conserva el historial) y el gemelo sigue compartido entre los dos días de pierna
    expect(nuevo.days[0].ids).toEqual(st.days[0].ids);
    expect(nuevo.days[2].ids[0]).toBe('gemelo');
    // el femoral sentado del día B y del día 5 tienen el mismo nombre pero series distintas: siguen separados
    expect(nuevo.days[2].ids).toContain('femoralSentadoA');
    expect(nuevo.days[4].ids).toContain('femoralSentadoB');
    expect(nuevo.exercises.gemelo.history.length).toBe(st.exercises.gemelo.history.length);
  });

  test('el libro tiene las hojas Rutina y Peso y abre como ZIP válido', () => {
    const files = unzipSync(A.buildXlsx(rutinaCompleja()));
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/styles.xml']));
    const wb = strFromU8(files['xl/workbook.xml']);
    expect(wb).toContain('name="Rutina"');
    expect(wb).toContain('name="Peso"');
    const hoja = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(hoja).toContain('&quot;técnica&quot;'); // los textos se escapan
    expect(hoja).toContain('<v>102.5</v>'.replace('102.5', '75.3')); // los números van como números (con punto, como exige Excel)
  });

  test('lee un .xlsx con textos compartidos (como los que guarda Excel)', async () => {
    const { zipSync, strToU8 } = await import('fflate');
    const xml = (s) => strToU8('<?xml version="1.0" encoding="UTF-8"?>' + s);
    const bytes = zipSync({
      'xl/workbook.xml': xml('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Hoja1" sheetId="1" r:id="rId7"/></sheets></workbook>'),
      'xl/_rels/workbook.xml.rels': xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId7" Type="x" Target="worksheets/hojaRara.xml"/></Relationships>'),
      'xl/sharedStrings.xml': xml('<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Dia</t></si><si><t>Ejercicio</t></si><si><t>Pierna</t></si><si><r><t>Senta</t></r><r><t>dilla</t></r></si></sst>'),
      'xl/worksheets/hojaRara.xml': xml('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1" t="inlineStr"><is><t>Peso_kg</t></is></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c><c r="D2"><v>102.5</v></c></row></sheetData></worksheet>'),
    });
    const rows = A.readXlsxRows(bytes);
    expect(rows[0]).toEqual(['Dia', 'Ejercicio', null, 'Peso_kg']);
    expect(rows[1]).toEqual(['Pierna', 'Sentadilla', null, 102.5]);
    const r = A.rowsToRutina(rows, null);
    expect(r.ok).toBe(true);
    const ex = Object.values(r.obj.rutina.exercises)[0];
    expect(ex.name).toBe('Sentadilla');
    expect(ex.currentSets[0].weight).toBe(102.5);
  });

  test('un archivo que no es Excel da un error claro', () => {
    expect(() => A.readXlsxRows(new Uint8Array([1, 2, 3]))).toThrow(/no es un Excel/);
  });
});

describe('CSV', () => {
  test('exportar y volver a importar deja la misma rutina', () => {
    const st = rutinaCompleja();
    const r = A.rowsToRutina(A.parseCsv(A.buildCsv(st)), st);
    expect(r.ok).toBe(true);
    expect(resumenRutina(A.applyImport(st, r.obj, 'rutina'))).toEqual(resumenRutina(st));
  });

  test('admite "," o tabulador como separador, comillas y decimales con coma', () => {
    const coma = 'Dia,Ejercicio,Peso_kg,Repeticiones\n"Día, uno","Press ""bonito""","82,5",8\n';
    const r1 = A.rowsToRutina(A.parseCsv(coma), null);
    expect(r1.obj.rutina.days[0].label).toBe('Día, uno');
    const ex = Object.values(r1.obj.rutina.exercises)[0];
    expect(ex.name).toBe('Press "bonito"');
    expect(ex.currentSets[0].weight).toBe(82.5);
    const tab = 'Dia\tEjercicio\tTipo\tRepeticiones\tPeso_kg\nA\tB\trest-pause\t8/4/2\t50\n';
    const ex2 = Object.values(A.rowsToRutina(A.parseCsv(tab), null).obj.rutina.exercises)[0];
    expect(ex2.currentSets[0].tandas).toEqual([8, 4, 2]);
  });

  test('la plantilla de la app se importa bien', () => {
    const r = A.rowsToRutina(A.parseCsv(A.PLANTILLA_CSV), null);
    expect(r.ok).toBe(true);
    expect(r.resumen).toBe('2 días, 4 ejercicios y 6 series');
    expect(r.avisos).toEqual([]);
  });

  test('errores y avisos claros', () => {
    expect(A.rowsToRutina(A.parseCsv('Hola;Adios\n1;2'), null).error).toMatch(/Dia.*Ejercicio/);
    expect(A.rowsToRutina(A.parseCsv('Dia;Ejercicio'), null).error).toMatch(/vacío/);
    const r = A.rowsToRutina(A.parseCsv('Dia;Ejercicio;Musculo;Tipo\nA;B;Orejas;superserie\n;C;;\n'), null);
    expect(r.ok).toBe(true);
    expect(r.avisos.join(' ')).toMatch(/Orejas/);
    expect(r.avisos.join(' ')).toMatch(/superserie/);
    expect(r.avisos.join(' ')).toMatch(/Fila 3/);
  });
});

describe('datos por defecto (defaultData.json)', () => {
  test('el defaultData.json incluido da la misma rutina que la de serie', () => {
    const a = A.stateFromDefaults(A.defaultData);
    const b = A.buildInitialState();
    expect(resumenRutina(a)).toEqual(resumenRutina(b));
    expect(a.comida.recetas.length).toBe(60); // las 31 del archivo + las 29 nuevas
    // cada ejercicio arranca con su marca de referencia
    Object.values(a.exercises).forEach((ex) => expect(ex.history.length).toBe(1));
  });

  test('buildDefaultData no lleva datos personales ni historial', () => {
    const st = rutinaCompleja();
    st.formulario.nombre = 'Zacarías';
    st.peso.historial.push({ id: 'x', date: '2026-10-01T10:00:00Z', kg: 83.4 });
    st.comida.diario = { '2026-10-01': [{ id: 'a', nombre: 'Cachopo XL', kcal: 900 }] };
    const d = A.buildDefaultData(st);
    const txt = JSON.stringify(d);
    expect(txt).not.toContain('Zacarías');
    expect(txt).not.toContain('83.4');
    expect(txt).not.toContain('Cachopo XL');
    expect(txt).not.toContain('"history"');
    expect(A.validateShareObj(d).ok).toBe(true);
    expect(A.buildDefaultData(st, { recetas: false }).recetas).toBeUndefined();
  });

  test('un defaultData.json roto no impide arrancar: se usa la rutina de serie', () => {
    expect(A.stateFromDefaults({ hola: 1 }).days.length).toBe(5);
    expect(A.stateFromDefaults(null).days.length).toBe(5);
  });

  test('primer arranque sin nada guardado: usa defaultData.json', () => {
    const r = A.readInitialState();
    expect(r.primeraVez).toBe(true);
    expect(r.state.days.map((d) => d.label)).toEqual(A.defaultData.rutina.days.map((d) => d.label));
  });

  test('npm run make-default convierte un código de la app en defaultData.json', () => {
    const st = rutinaCompleja();
    st.days = st.days.slice(0, 2);
    st.peso.historial.push({ id: 'x', date: '2026-10-01T10:00:00Z', kg: 83.4 });
    const code = A.encodeShare(A.buildShareObject(st, { historial: true, peso: true, recetas: true, todo: true }, null));
    const salida = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mr-')), 'defaultData.json');
    const out = execFileSync(process.execPath, ['scripts/make-default.mjs', code, '--salida=' + salida], { encoding: 'utf8' });
    expect(out).toMatch(/2 días/);
    const obj = JSON.parse(fs.readFileSync(salida, 'utf8'));
    expect(obj.rutina.days.length).toBe(2);
    expect(JSON.stringify(obj)).not.toContain('83.4');
    expect(resumenRutina(A.stateFromDefaults(obj))).toEqual(resumenRutina(st));
  });

  test('make-default avisa si el código está mal', () => {
    let error = '';
    try { execFileSync(process.execPath, ['scripts/make-default.mjs', 'GYMR1.abc.def', '--salida=/tmp/no.json'], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { error = String(e.stderr); }
    expect(error).toMatch(/corrupto/);
  });
});

describe('Word (.docx)', () => {
  test('genera un .docx con una tabla por día y los ejercicios', async () => {
    const b64 = await A.buildDocxBase64(rutinaCompleja());
    const files = unzipSync(A.base64ToBytes(b64));
    const doc = strFromU8(files['word/document.xml']);
    expect(doc).toContain('Pierna A');
    expect(doc).toContain('Belt squat');
    expect(doc).toContain('Dropset');
    expect((doc.match(/<w:tbl>/g) || []).length).toBe(5);
  });
});
