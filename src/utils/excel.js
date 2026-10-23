/* =========================================================================
   EXCEL (.xlsx) SIN LIBRERÍAS EXTERNAS
   Un .xlsx es un ZIP con unos XML. Aquí se escriben y se leen esos XML a mano
   (con fflate para el ZIP). No se usa SheetJS: la versión que hay en npm (0.18.5)
   está desactualizada y tiene fallos de seguridad conocidos al LEER archivos.
   ========================================================================= */
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { CATS, SET_TYPES } from '../data/catalog.js';
import { TIPO_CSV } from './exportar.js';

const xmlEsc = (s) => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // caracteres de control no permitidos en XML
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); // eslint-disable-line no-control-regex

function colName(i) { let s = ''; let n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

// rows: array de filas; cada celda es número, texto, null. La primera fila va en negrita (estilo 1).
function sheetXml(rows, widths) {
  const cols = (widths || []).map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('');
  const body = rows.map((row, r) => '<row r="' + (r + 1) + '">' + row.map((v, c) => {
    const ref = colName(c) + (r + 1);
    const st = r === 0 ? ' s="1"' : '';
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
    return '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>';
  }).join('') + '</row>').join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + (cols ? '<cols>' + cols + '</cols>' : '') + '<sheetData>' + body + '</sheetData></worksheet>';
}

// sheets: [{ name, rows, widths }]. Devuelve Uint8Array con el .xlsx
export function buildXlsxBytes(sheets) {
  const files = {};
  files['[Content_Types].xml'] = strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + sheets.map((s, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')
    + '</Types>');
  files['_rels/.rels'] = strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  files['xl/workbook.xml'] = strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
    + sheets.map((s, i) => '<sheet name="' + xmlEsc(s.name).slice(0, 31) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('')
    + '</sheets></workbook>');
  files['xl/_rels/workbook.xml.rels'] = strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('')
    + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + '</Relationships>');
  files['xl/styles.xml'] = strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
  sheets.forEach((s, i) => { files['xl/worksheets/sheet' + (i + 1) + '.xml'] = strToU8(sheetXml(s.rows, s.widths)); });
  return zipSync(files, { level: 6 });
}

export function bytesToBase64(bytes) {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  return btoa(bin);
}
export function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const XLSX_HEADER = ['Dia', 'Equipo', 'Ejercicio', 'Musculo', 'Serie', 'Tipo', 'Repeticiones', 'Peso_kg', 'Nota_serie', 'Objetivo', 'Objetivo_kg', 'Comentarios'];

// Libro de la rutina: hoja "Rutina" (una fila por serie, mismas columnas que el CSV) y hoja "Peso"
export function buildXlsx(state) {
  const rows = [XLSX_HEADER.slice()];
  (state.days || []).forEach((d) => {
    (d.ids || []).forEach((id) => {
      const ex = state.exercises[id];
      if (!ex) return;
      (ex.currentSets || []).forEach((s, i) => {
        let reps, peso;
        const v = (x) => (x === null || x === undefined ? '–' : String(x).replace('.', ','));
        if (s.tipo === 'rp') { reps = (s.tandas || []).map(v).join(' · '); peso = typeof s.weight === 'number' ? s.weight : null; }
        else if (s.tipo === 'drop') { reps = (s.drops || []).map((x) => v(x.reps)).join(' · '); peso = (s.drops || []).map((x) => v(x.weight)).join(' · '); }
        else { reps = typeof s.reps === 'number' ? s.reps : null; peso = typeof s.weight === 'number' ? s.weight : null; }
        rows.push([d.label, d.equipo || '', ex.name, CATS[ex.cat] ? CATS[ex.cat].label : ex.cat, i + 1, TIPO_CSV[s.tipo] || (SET_TYPES[s.tipo] && SET_TYPES[s.tipo].label) || 'top set',
          reps, peso, s.nota || '', ex.objetivo ? ex.objetivo.text : '', ex.objetivo && typeof ex.objetivo.value === 'number' ? ex.objetivo.value : null, ex.comentario || '']);
      });
    });
  });
  const peso = [['Fecha', 'Peso_kg']].concat((state.peso.historial || []).slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((r) => [new Date(r.date).toLocaleDateString('es-ES'), r.kg]));
  return buildXlsxBytes([
    { name: 'Rutina', rows, widths: [26, 24, 34, 13, 7, 14, 14, 12, 18, 22, 12, 40] },
    { name: 'Peso', rows: peso, widths: [14, 10] },
  ]);
}

/* ---------- Lectura de un .xlsx (para importar una rutina) ----------
   Devuelve las filas de la PRIMERA hoja como arrays de texto/número. Sirve para los .xlsx de la app
   y para los guardados con Excel, LibreOffice o Google Sheets. */
export function readXlsxRows(bytes) {
  let files;
  try { files = unzipSync(bytes); } catch (e) { throw new Error('El archivo no es un Excel (.xlsx) válido.'); }
  const parse = (name) => {
    const f = files[name];
    if (!f) return null;
    return new DOMParser().parseFromString(strFromU8(f), 'application/xml');
  };
  const byLocal = (doc, tag) => Array.prototype.slice.call(doc.getElementsByTagName('*')).filter((el) => el.localName === tag);
  const wb = parse('xl/workbook.xml');
  if (!wb) throw new Error('El archivo no es un Excel (.xlsx) válido.');
  const firstSheet = byLocal(wb, 'sheet')[0];
  if (!firstSheet) throw new Error('El Excel no tiene hojas.');
  const rid = firstSheet.getAttribute('r:id') || firstSheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  let path = 'xl/worksheets/sheet1.xml';
  const rels = parse('xl/_rels/workbook.xml.rels');
  if (rels && rid) {
    const rel = byLocal(rels, 'Relationship').find((r) => r.getAttribute('Id') === rid);
    if (rel) { const t = rel.getAttribute('Target').replace(/^\//, ''); path = t.indexOf('xl/') === 0 ? t : 'xl/' + t; }
  }
  const sheet = parse(path);
  if (!sheet) throw new Error('No se encuentra la primera hoja del Excel.');
  const shared = [];
  const ss = parse('xl/sharedStrings.xml');
  if (ss) byLocal(ss, 'si').forEach((si) => { shared.push(byLocal(si, 't').map((t) => t.textContent).join('')); });
  const rows = [];
  byLocal(sheet, 'row').forEach((rowEl) => {
    const rIdx = Number(rowEl.getAttribute('r')) - 1;
    const row = [];
    byLocal(rowEl, 'c').forEach((c, k) => {
      const ref = c.getAttribute('r');
      let col = k;
      if (ref) { const letters = ref.replace(/[0-9]/g, ''); col = 0; for (let i = 0; i < letters.length; i++) col = col * 26 + (letters.charCodeAt(i) - 64); col -= 1; }
      const t = c.getAttribute('t');
      const vEl = byLocal(c, 'v')[0];
      let val = null;
      if (t === 's') val = vEl ? shared[Number(vEl.textContent)] : null;
      else if (t === 'inlineStr') val = byLocal(c, 't').map((x) => x.textContent).join('');
      else if (t === 'str' || t === 'e') val = vEl ? vEl.textContent : null;
      else if (t === 'b') val = vEl ? (vEl.textContent === '1' ? 'VERDADERO' : 'FALSO') : null;
      else val = vEl ? Number(vEl.textContent) : null;
      row[col] = val;
    });
    rows[isNaN(rIdx) || rIdx < 0 ? rows.length : rIdx] = row;
  });
  return rows.filter(Boolean).map((r) => Array.from(r, (x) => (x === undefined ? null : x)));
}
