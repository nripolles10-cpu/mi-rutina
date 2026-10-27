import React, { useState, useEffect, useContext, createContext, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useBackHandler } from '../native/back.js';
import { T } from '../data/theme.js';
import { fmt, formatDecimal, num, nz, parseDecimal } from '../utils/format.js';

/* =========================================================================
   CONTEXTO Y COMPONENTES PEQUEÑOS
   ========================================================================= */

export const GymContext = createContext(null);

export function useGym() { return useContext(GymContext); }

export function Chip({ active, onClick, children, accent, style }) {
  const c = accent || T.cyan;
  return (
    <button onClick={onClick} className="font-body chip" style={{
      padding: '8px 15px', borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
      border: active ? `1.5px solid ${c}` : '1.5px solid rgba(140,170,255,0.25)',
      background: active ? `${c}26` : 'rgba(10,15,30,0.45)',
      color: active ? '#FFFFFF' : '#B7C0D8',
      boxShadow: active ? `0 0 14px ${c}40` : 'none',
      ...style,
    }}>{children}</button>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.kind === 'pr' ? '#A3E635' : toast.kind === 'warn' ? '#FBBF24' : 'rgba(30,40,70,0.96)';
  const accion = toast.accion;
  return (
    <div role="status" style={{
      position: 'fixed', top: 'calc(14px + var(--safe-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 130,
      background: bg, color: toast.kind ? '#060913' : '#F5F7FF', fontWeight: 700, fontSize: 13,
      padding: accion ? '8px 8px 8px 16px' : '10px 18px', borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)', maxWidth: '88%', textAlign: 'center',
      display: accion ? 'flex' : 'block', alignItems: 'center', gap: 10,
    }} className="font-body">
      <span>{toast.msg}</span>
      {accion && (
        <button onClick={accion.fn} className="font-body" style={{ flexShrink: 0, background: 'rgba(var(--ac-rgb),0.16)', color: 'var(--ac-claro)', border: '1px solid rgba(var(--ac-rgb),0.55)', borderRadius: 10, padding: '6px 10px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{accion.label}</button>
      )}
    </div>
  );
}

// Campo numérico que acepta coma o punto decimal en cualquier teclado ("102,5").
// Es un campo de texto con teclado numérico (inputMode decimal) en lugar de un campo de tipo número,
// porque el de tipo número devuelve vacío con la coma en algunos teclados y navegadores y el valor se borraba.
// Mientras escribes se respeta lo que llevas ("7," no se pierde); al salir del campo se muestra con formato.
export function NumInput({ value, onChange, placeholder, className, style, title }) {
  const [txt, setTxt] = useState(formatDecimal(value));
  const focused = useRef(false);
  useEffect(() => {
    const cur = parseDecimal(txt);
    if (!focused.current || (cur !== undefined && cur !== value)) setTxt(formatDecimal(value));
  }, [value]);
  return (
    <input type="text" inputMode="decimal" autoComplete="off" spellCheck={false} placeholder={placeholder} title={title}
      value={txt}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; setTxt(formatDecimal(value)); }}
      onChange={(e) => {
        const t = e.target.value;
        if (t.trim() !== '' && !/^\d*[.,]?\d*$/.test(t.trim())) return; // ignora letras y símbolos
        setTxt(t);
        const v = parseDecimal(t);
        if (v !== undefined && v !== value) onChange(v);
      }}
      className={className} style={style} />
  );
}

export function NumField({ value, onChange, placeholder, w = 56, forceEditable }) {
  const { state } = useGym();
  const editable = forceEditable || state.meta.editMode;
  if (!editable) {
    return <span className="font-body" style={{ width: w, display: 'inline-block', textAlign: 'center', color: T.text, fontWeight: 700, fontSize: 14, padding: '7px 6px' }}>{nz(value) === null ? '—' : formatDecimal(value)}</span>;
  }
  return (
    <NumInput placeholder={placeholder} value={value} onChange={onChange}
      className="font-body inp" style={{ width: w, fontWeight: 700, padding: '8px 4px', textAlign: 'center' }} />
  );
}

// Texto libre: admite espacios, saltos de línea y textos largos
export function TextField({ value, onChange, placeholder, multiline, forceEditable, rows }) {
  const { state } = useGym();
  const editable = forceEditable || state.meta.editMode;
  if (!editable) {
    return <div className="font-body" style={{ color: value ? T.text : T.dim, fontSize: 13, padding: '8px 2px', fontStyle: value ? 'normal' : 'italic', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{value || placeholder || '—'}</div>;
  }
  if (multiline) {
    const text = value || '';
    const autoRows = rows || Math.max(3, Math.min(10, text.split('\n').length + Math.floor(text.length / 40)));
    return <textarea value={text} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={autoRows} className="font-body inp" style={{ resize: 'vertical', fontSize: 13, lineHeight: 1.5 }} />;
  }
  return <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="font-body inp" style={{ fontSize: 13 }} />;
}

export function SectionTitle({ emoji, children, style }) {
  return (
    <div className="font-display" style={{ color: T.text, fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, ...style }}>
      <span style={{ filter: 'drop-shadow(0 0 8px rgba(var(--ac-rgb),0.45))' }}>{emoji}</span>
      <span>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(var(--ac-rgb),0.5), rgba(167,139,250,0.25), transparent)', marginLeft: 4 }} />
    </div>
  );
}

export function Card({ children, style }) {
  return <div className="card" style={style}>{children}</div>;
}

export function Label({ children, style }) {
  return <div className="font-body lbl" style={style}>{children}</div>;
}

// Botón de editar / bloquear (el modo edición es global: sirve para todas las pestañas)
export function EditLockBar({ showFill }) {
  const { state, toggleEditMode, rellenarObjetivosFaltantes } = useGym();
  const on = state.meta.editMode;
  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={toggleEditMode} className="font-body" style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: on ? 'linear-gradient(135deg, #FBBF24, #FB923C)' : 'rgba(var(--ac-rgb),0.10)', color: on ? '#1A1002' : 'var(--ac-claro)',
        border: `1.5px ${on ? 'solid #FBBF24' : 'dashed rgba(var(--ac-rgb),0.6)'}`, borderRadius: 14, padding: '11px', fontWeight: 800, fontSize: 13, cursor: 'pointer',
        boxShadow: on ? '0 0 22px rgba(251,191,36,0.35)' : 'none',
      }}>
        {on ? '🔓 Modo edición activo — toca para bloquear' : '🔒 Bloqueado — toca para editar'}
      </button>
      {on && showFill && (
        <button onClick={rellenarObjetivosFaltantes} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 8, padding: '9px', fontSize: 12.5 }}>
          🧮 Rellenar objetivos que faltan (+12,5%)
        </button>
      )}
    </div>
  );
}

export function MiniBtn({ onClick, disabled, children, title, style }) {
  return <button title={title} disabled={disabled} onClick={onClick} className="font-body mini" style={style}>{children}</button>;
}

/* =========================================================================
   VENTANAS, CONFIRMACIÓN Y DESLIZAR
   ========================================================================= */

// Ventana a pantalla completa (dentro de la app, sin usar window.open ni alert)
// El botón Atrás de Android (o Escape en el PC) cierra la ventana en vez de salir de la app
export function Modal({ title, onClose, children, wide }) {
  useBackHandler(true, onClose);
  return ReactDOM.createPortal(
    <div className="font-body" style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(3,5,12,0.94)', WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 'calc(14px + var(--safe-top)) 16px 8px', flexShrink: 0 }}>
        <div className="font-display" style={{ color: T.text, fontSize: 24, fontWeight: 700, letterSpacing: '0.04em', minWidth: 0 }}>{title}</div>
        <button onClick={onClose} className="font-body btn btn-ghost" style={{ padding: '8px 12px', borderStyle: 'solid', flexShrink: 0 }}>✕ Cerrar</button>
      </div>
      <div className="gt-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px calc(30px + var(--safe-bottom) + var(--kb-pad, 0px))', maxWidth: wide ? 'none' : 460, width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>{children}</div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ dlg, onClose }) {
  if (!dlg) return null;
  return <ConfirmDialogAbierto dlg={dlg} onClose={onClose} />;
}

function ConfirmDialogAbierto({ dlg, onClose }) {
  useBackHandler(true, onClose);
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(3,5,12,0.8)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 360, width: '100%', padding: 20, textAlign: 'center', borderColor: dlg.danger === false ? 'rgba(var(--ac-rgb),0.4)' : 'rgba(251,113,133,0.35)', background: 'rgba(12,18,34,0.97)' }}>
        <div className="font-display" style={{ color: T.text, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{dlg.title || '¿Confirmar?'}</div>
        {dlg.text && <p className="font-body" style={{ color: '#C9D3EE', fontSize: 13, lineHeight: 1.5, margin: '0 0 18px', whiteSpace: 'pre-wrap' }}>{dlg.text}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 13 }}>Cancelar</button>
          <button onClick={() => { const fn = dlg.onConfirm; onClose(); if (fn) fn(); }} className="font-body btn"
            style={{ flex: 1, background: dlg.danger === false ? 'linear-gradient(135deg, var(--ac), var(--ac2))' : 'linear-gradient(135deg, #FB7185, #F43F5E)', color: dlg.danger === false ? '#04101C' : '#fff' }}>{dlg.confirmLabel || 'Confirmar'}</button>
        </div>
      </div>
    </div>
  );
}

// Devuelve manejadores táctiles: deslizar a la izquierda / derecha (con umbral para no confundirlo con el scroll vertical)
export function useSwipe(onLeft, onRight) {
  const st = useRef(null);
  return {
    onTouchStart: (e) => { const t = e.touches[0]; st.current = { x: t.clientX, y: t.clientY }; },
    onTouchEnd: (e) => {
      if (!st.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - st.current.x, dy = t.clientY - st.current.y;
      st.current = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) { if (dx < 0) onLeft(); else onRight(); }
    },
  };
}

export function LabeledNum({ label, value, onChange, placeholder, suffix }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Label>{label}</Label>
      <div style={{ position: 'relative' }}>
        <NumInput value={value} placeholder={placeholder} onChange={onChange} className="font-body inp" style={{ fontWeight: 700, paddingRight: suffix ? 38 : 10 }} />
        {suffix && <span className="font-body" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: T.dim, fontSize: 12 }}>{suffix}</span>}
      </div>
    </div>
  );
}

export function SupRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid rgba(140,170,255,0.12)' }}>
      <span className="font-body" style={{ color: T.muted, fontSize: 12 }}>{label}</span>
      <span className="font-body" style={{ color: highlight ? '#FCD34D' : T.text, fontWeight: 700, fontSize: 12.5, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// Barra de progreso simple
export function Bar({ pct, color, height }) {
  return (
    <div style={{ position: 'relative', height: height || 12, borderRadius: 999, background: 'rgba(7,11,22,0.9)', border: '1px solid rgba(140,170,255,0.18)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: Math.max(0, Math.min(100, pct)) + '%', borderRadius: 999, background: 'linear-gradient(90deg, ' + color + '88, ' + color + ')', boxShadow: '0 0 12px ' + color + '88', transition: 'width .3s' }} />
    </div>
  );
}

// Estilo de las "pastillas" de información (récord, objetivo…) con el color que se le pase
export function chipStyle(color) {
  return { fontSize: 11, fontWeight: 600, color: '#FFFFFF', background: color + '26', border: '1px solid ' + color + '88', borderRadius: 999, padding: '3px 9px' };
}

// Estilo de etiqueta con el color de acento del tema (función: el tema puede cambiar)
export function chipAcento() { return chipStyle(T.cyan); }

export function Stepper({ value, onChange, min, max, step, suffix }) {
  const st = step || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <MiniBtn disabled={value <= min} onClick={() => onChange(Math.max(min, Math.round((value - st) * 100) / 100))}>−</MiniBtn>
      <span className="font-display" style={{ color: T.text, fontSize: 22, fontWeight: 700, minWidth: 64, textAlign: 'center' }}>{fmt(value, 2)}{suffix ? ' ' + suffix : ''}</span>
      <MiniBtn disabled={value >= max} onClick={() => onChange(Math.min(max, Math.round((value + st) * 100) / 100))}>+</MiniBtn>
    </div>
  );
}

export function MacroLine({ t, small }) {
  return (
    <span className="font-body" style={{ fontSize: small ? 11 : 12, color: T.muted }}>
      <b style={{ color: T.text }}>{Math.round(num(t.kcal)) + ' kcal'}</b>{' · P ' + fmt(num(t.p), 0) + ' · C ' + fmt(num(t.c), 0) + ' · G ' + fmt(num(t.g), 0)}
    </span>
  );
}

/* ---------- Check de opciones ---------- */

export function CheckRow({ on, onClick, children }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
      <span style={{ width: 22, height: 22, borderRadius: 7, border: '2px solid ' + (on ? T.cyan : 'rgba(140,170,255,0.5)'), background: on ? T.cyan : 'transparent', color: '#04101C', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
      <span className="font-body" style={{ color: T.text, fontSize: 13 }}>{children}</span>
    </div>
  );
}
