/* =========================================================================
   WORD (.docx) con la librería "docx" (funciona sin internet).
   Se carga solo cuando se pide el documento, para que la app arranque rápido.
   ========================================================================= */
import { CATS } from '../data/catalog.js';
import { describeSet } from './training.js';

// Devuelve el .docx en base64
export async function buildDocxBase64(state) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType } = await import('docx');
  const nombre = (state.formulario && state.formulario.nombre) || '';
  const celda = (texto, cabecera) => new TableCell({
    shading: cabecera ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E8EEF7' } : undefined,
    children: String(texto || '').split('\n').map((linea) => new Paragraph({ children: [new TextRun({ text: linea, bold: !!cabecera, size: 20 })] })),
  });
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun('Mi rutina' + (nombre ? ' — ' + nombre : ''))] }),
    new Paragraph({ children: [new TextRun({ text: 'Generada el ' + new Date().toLocaleDateString('es-ES'), italics: true })] }),
  ];
  (state.days || []).forEach((d) => {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(d.label)] }));
    if (d.equipo) children.push(new Paragraph({ children: [new TextRun({ text: 'Llevar: ', bold: true }), new TextRun(d.equipo)] }));
    if (d.nota) children.push(new Paragraph({ children: [new TextRun({ text: d.nota, italics: true })] }));
    const filas = [new TableRow({ tableHeader: true, children: ['Ejercicio', 'Músculo', 'Series', 'Objetivo', 'Comentarios'].map((t) => celda(t, true)) })];
    (d.ids || []).forEach((id) => {
      const ex = state.exercises[id];
      if (!ex) return;
      filas.push(new TableRow({ children: [
        celda(ex.name + (ex.altName ? '\no ' + ex.altName : '')),
        celda(CATS[ex.cat] ? CATS[ex.cat].label : ''),
        celda((ex.currentSets || []).map((s, i) => (i + 1) + '. ' + describeSet(s) + (s.nota ? ' (' + s.nota + ')' : '')).join('\n')),
        celda(ex.objetivo ? ex.objetivo.text : ''),
        celda(ex.comentario || ''),
      ] }));
    });
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filas }));
  });
  const doc = new Document({ creator: 'Mi Rutina', title: 'Mi rutina', sections: [{ children }] });
  return Packer.toBase64String(doc);
}
