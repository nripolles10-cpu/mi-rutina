/* =========================================================================
   ZONAS DE MEDIDAS CORPORALES (cintura, cadera… y las que añadas tú)
   Las zonas que vienen de serie tienen los mismos ids que antes, así que las medidas guardadas siguen igual.
   ========================================================================= */

export const UNIDADES_MEDIDA = ['cm', '%', 'kg'];

export const ZONAS_DEFECTO = [
  { id: 'cintura', label: 'Cintura', unidad: 'cm' },
  { id: 'cadera', label: 'Cadera', unidad: 'cm' },
  { id: 'pecho', label: 'Pecho', unidad: 'cm' },
  { id: 'brazo', label: 'Brazo', unidad: 'cm' },
  { id: 'muslo', label: 'Muslo', unidad: 'cm' },
  { id: 'gemelo', label: 'Gemelo', unidad: 'cm' },
  { id: 'cuello', label: 'Cuello', unidad: 'cm' },
  { id: 'grasa', label: '% de grasa', unidad: '%' },
];

// Repara la lista de zonas guardada. Nunca descarta una zona que tenga medidas: si falta, se recupera con
// el id como nombre. Las zonas de serie que faltan se añaden.
export function normalizarZonas(lista, idsConMedidas) {
  const out = [];
  const vistos = {};
  (Array.isArray(lista) ? lista : []).forEach((z) => {
    if (!z || typeof z !== 'object' || typeof z.id !== 'string' || !z.id || vistos[z.id]) return;
    const base = ZONAS_DEFECTO.find((d) => d.id === z.id);
    const label = typeof z.label === 'string' && z.label.trim() ? z.label.trim().slice(0, 40) : (base ? base.label : z.id);
    const unidad = UNIDADES_MEDIDA.indexOf(z.unidad) !== -1 ? z.unidad : (base ? base.unidad : 'cm');
    vistos[z.id] = true;
    out.push({ id: z.id, label, unidad });
  });
  ZONAS_DEFECTO.forEach((d) => { if (!vistos[d.id]) { vistos[d.id] = true; out.push({ ...d }); } });
  (Array.isArray(idsConMedidas) ? idsConMedidas : []).forEach((id) => {
    if (typeof id === 'string' && id && !vistos[id]) { vistos[id] = true; out.push({ id, label: id, unidad: 'cm' }); }
  });
  return out;
}

// Nombre de zona válido: texto no vacío, sin repetir una zona existente
export function validarNombreZona(nombre, zonas) {
  const n = String(nombre || '').trim();
  if (!n) return { ok: false, error: 'Escribe un nombre para la zona.' };
  if (n.length > 40) return { ok: false, error: 'El nombre es demasiado largo (máximo 40 letras).' };
  const igual = (zonas || []).some((z) => z.label.toLowerCase() === n.toLowerCase());
  if (igual) return { ok: false, error: 'Ya tienes una zona con ese nombre.' };
  return { ok: true, nombre: n };
}

// Id nuevo y estable para una zona propia
export function idZonaNueva(nombre, zonas, uidFn) {
  const base = 'z_' + String(nombre).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
  let id = base || 'zona';
  let n = 2;
  while ((zonas || []).some((z) => z.id === id)) { id = base + '_' + n; n++; }
  return id || ('z_' + uidFn());
}
