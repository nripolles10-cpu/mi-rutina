
/* =========================================================================
   SECCIÓN 3 · UTILIDADES
   Funciones puras: formato, series, marcas, series por semana, objetivos por músculo, salud, nutrición y comida.
   ========================================================================= */

/* =========================================================================
   UTILIDADES
   ========================================================================= */

export function uid() { return Math.random().toString(36).slice(2, 10); }

export function clone(o) { return JSON.parse(JSON.stringify(o)); }

export function nz(v) { return v === undefined || v === null ? null : v; }

export function num(v) { return typeof v === 'number' && !isNaN(v) ? v : 0; }

export function numOrNull(v) { return typeof v === 'number' && !isNaN(v) ? v : null; }

export function pad2(n) { return String(n).padStart(2, '0'); }

// Fecha local en formato AAAA-MM-DD (sirve de clave para diario, agua, sueño…)
export function ymd(d) {
  const x = d instanceof Date ? d : new Date(d);
  return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' + pad2(x.getDate());
}

export function fromYmd(k) { const p = String(k).split('-').map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1); }

export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export function mondayOf(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

export function fmt(n, d) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-ES', { maximumFractionDigits: d === undefined ? 1 : d });
}

export function fmtDateShort(iso) {
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); } catch (e) { return ''; }
}

export function fmtDateLong(iso) {
  try { return new Date(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return ''; }
}

// Primer número que aparece en un texto ("115 kg + minis" -> 115). Si no hay, null.
export function parseNum(text) {
  if (text === null || text === undefined) return null;
  const m = String(text).replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// N\u00famero escrito por el usuario: admite coma o punto decimal ("102,5" = "102.5").
// Devuelve null si est\u00e1 vac\u00edo, el n\u00famero si es v\u00e1lido y undefined si todav\u00eda no es un n\u00famero (por ejemplo "," o "7,x").
export function parseDecimal(text) {
  const t = String(text === null || text === undefined ? '' : text).trim().replace(/\s/g, '');
  if (t === '') return null;
  if (!/^\d*([.,]\d*)?$/.test(t) || t === '.' || t === ',') return undefined;
  const v = parseFloat(t.replace(',', '.'));
  return isFinite(v) ? v : undefined;
}

// N\u00famero para mostrar dentro de un campo: con coma decimal y sin separador de miles ("102,5", "1500")
export function formatDecimal(v) {
  if (v === null || v === undefined || typeof v !== 'number' || !isFinite(v)) return '';
  return String(Math.round(v * 1000) / 1000).replace('.', ',');
}

// Enlace seguro: solo http/https. Devuelve el enlace o null.
export function safeUrl(u) {
  const s = String(u || '').trim();
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : null;
}

export function stripAcc(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

export function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }

export function pick(a, b) { return a === null || a === undefined ? b : a; }

export function escHtml(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* =========================================================================
   TAB: PROGRESO
   ========================================================================= */

export function groupByMonth(hist) {
  const map = {};
  hist.forEach((h) => { const key = ymd(h.date).slice(0, 7); (map[key] = map[key] || []).push(h); });
  return Object.keys(map).sort().map((key) => ({ key, entries: map[key] }));
}

export function monthLabel(key) {
  const p = key.split('-').map(Number);
  return new Date(p[0], p[1] - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

/* =========================================================================
   TEMPORIZADOR DE DESCANSO (cuenta con la hora real, Date.now)
   Al acabar: Native.vibrate + Native.beep. Con la app en segundo plano o la pantalla apagada,
   el aviso lo da Native.scheduleNotification (en el navegador no hace nada: solo avisa con la app abierta).
   ========================================================================= */

export function fmtMS(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ':' + pad2(s % 60);
}
