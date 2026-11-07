import React, { useState } from 'react';
import { Card, Chip, Label, Modal, useGym } from './ui.jsx';
import { catsDe } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { Native } from '../native/index.js';
import { fmt, uid } from '../utils/format.js';
import { effNutri, entryTotals } from '../utils/health.js';
import { recetasConLoQueTienes, sugerirParaFaltan, consejosDebiles, diaParaMusculo, CARDIO_OBJETIVOS_SIN_IA, CARDIO_PRESETS, cardioPresetParaGuardar, resumenSemanaLocal, frasesResumen } from '../utils/sinIA.js';

const txtPeq = { color: T.muted, fontSize: 12, lineHeight: 1.5 };
const caja = { background: 'rgba(7,11,22,0.7)', border: '1px solid rgba(140,170,255,0.18)', borderRadius: 14, padding: 12 };

/* ---------- Fotos de tus platos (a mano, sin IA) ---------- */

export function useFotoComida(id) {
  const { fotos, setFoto, delFoto } = useGym();
  const src = id && fotos && fotos[id] ? Native.photoSrc(fotos[id]) : null;
  const poner = async (origen) => {
    try { const f = await Native.pickPhoto(origen, 900, 0.72); if (f) await setFoto(id, f); } catch (e) { /* cancelada */ }
  };
  return { src, poner, quitar: () => delFoto(id) };
}

export function FotoRecetaCabecera({ recetaId }) {
  const { src, poner, quitar } = useFotoComida('rec_' + recetaId);
  const { askConfirm } = useGym();
  return (
    <div style={{ marginBottom: 12 }}>
      {src && <img src={src} alt="Foto del plato" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 16, display: 'block', marginBottom: 8 }} />}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => poner('camara')} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>📷 {src ? 'Otra foto' : 'Hacer foto de mi plato'}</button>
        <button onClick={() => poner('galeria')} className="font-body btn btn-ghost" style={{ flex: src ? 1 : 0.6, fontSize: 12.5 }}>🖼️ Galería</button>
        {src && <button onClick={() => askConfirm({ title: '¿Quitar la foto?', text: 'Se quita la foto de esta receta.', confirmLabel: 'Quitar', onConfirm: quitar })} className="font-body btn btn-danger" style={{ fontSize: 12.5, padding: '8px 10px' }} aria-label="Quitar foto">🗑️</button>}
      </div>
    </div>
  );
}

export function FotoMini({ id, size }) {
  const { fotos } = useGym();
  const [grande, setGrande] = useState(false);
  const src = id && fotos && fotos[id] ? Native.photoSrc(fotos[id]) : null;
  if (!src) return null;
  const t = size || 46;
  return (
    <>
      <img src={src} alt="Foto" onClick={(e) => { e.stopPropagation(); setGrande(true); }} style={{ width: t, height: t, objectFit: 'cover', borderRadius: 10, flexShrink: 0, cursor: 'zoom-in' }} />
      {grande && <Modal title="📷 Foto" onClose={() => setGrande(false)}><img src={src} alt="Foto en grande" style={{ width: '100%', borderRadius: 14 }} /></Modal>}
    </>
  );
}

/* ---------- 1) Qué comer para cubrir lo que te falta hoy ---------- */

export function SugerenciasFaltan({ fecha }) {
  const { state, commit, showToast } = useGym();
  const { plan } = effNutri(state);
  const lista = (state.comida.diario || {})[fecha] || [];
  const tot = entryTotals(lista);
  if (plan.falta) return null;
  const resta = { kcal: plan.kcal - tot.kcal, p: plan.protG - tot.p, c: plan.carbG - tot.c, g: plan.fatG - tot.g };
  const sugerencias = sugerirParaFaltan(resta, 5);
  const anadir = (s) => {
    commit((prev) => ({ ...prev, comida: { ...prev.comida, diario: { ...prev.comida.diario, [fecha]: (prev.comida.diario[fecha] || []).concat([{ id: uid(), momento: 'snack', nombre: s.nombre + ' ' + s.gramos + ' g', kcal: s.kcal, p: s.p, c: s.c, g: s.g }]) } } }));
    showToast('Añadido al diario (snack) ✓');
  };
  const quedan = (k, v, u) => (v > 0 ? fmt(v, 0) + ' ' + u : '✓ cubierto');
  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>🧩 Lo que te queda hoy</div>
      <div className="font-body" style={{ ...txtPeq, marginBottom: 10 }}>
        Kcal: <b style={{ color: T.text }}>{quedan('kcal', resta.kcal, 'kcal')}</b> · Proteína: <b style={{ color: T.text }}>{quedan('p', resta.p, 'g')}</b> · Hidratos: <b style={{ color: T.text }}>{quedan('c', resta.c, 'g')}</b> · Grasas: <b style={{ color: T.text }}>{quedan('g', resta.g, 'g')}</b>
      </div>
      {resta.kcal < 60 && <div className="font-body" style={txtPeq}>Ya llegas a tus calorías de hoy. Si necesitas algo, que sea ligero.</div>}
      {resta.kcal >= 60 && !sugerencias.length && <div className="font-body" style={txtPeq}>No encuentro un alimento que encaje con lo que te queda. Apunta lo que comas a mano y ya verás.</div>}
      {sugerencias.map((s) => (
        <div key={s.nombre} style={{ ...caja, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>{s.nombre} · {s.gramos} g</div>
            <div className="font-body" style={{ ...txtPeq, fontSize: 11.5 }}>{s.kcal} kcal · P {s.p} g · H {s.c} g · G {s.g} g</div>
          </div>
          <button onClick={() => anadir(s)} className="font-body btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12, flexShrink: 0 }}>➕ Añadir</button>
        </div>
      ))}
      <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 4 }}>Sugerencias calculadas con la tabla de alimentos de la app. Las cantidades encajan con lo que te queda, sin pasarte.</div>
    </Card>
  );
}

/* ---------- 2) Recetas con lo que tienes en casa ---------- */

export function RecetasEnCasa({ onVer }) {
  const { state } = useGym();
  const [texto, setTexto] = useState('');
  const res = recetasConLoQueTienes(state.comida.recetas, texto);
  return (
    <Card style={{ marginBottom: 12 }}>
      <Label>¿Qué tienes en casa?</Label>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} placeholder="Ej.: pollo, arroz, tomate, huevos" className="font-body inp" style={{ resize: 'vertical', marginBottom: 6 }} />
      <div className="font-body" style={{ ...txtPeq, fontSize: 11.5, marginBottom: 8 }}>Sepáralos con comas. Te busco recetas con lo que tengas y te digo qué te falta.</div>
      {texto.trim() && !res.length && <div className="font-body" style={txtPeq}>Ninguna receta encaja con eso. Prueba con otros ingredientes o crea la tuya.</div>}
      {res.map((x) => (
        <div key={x.receta.id} onClick={() => onVer && onVer(x.receta.id)} style={{ ...caja, marginBottom: 8, cursor: onVer ? 'pointer' : 'default' }}>
          <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 13.5 }}>{x.receta.nombre}</div>
          <div className="font-body" style={{ color: '#A3E635', fontSize: 12, marginTop: 2 }}>Tienes {x.tienes.length} de {x.tienes.length + x.faltan.length} ingredientes ({x.pct} %)</div>
          {x.faltan.length > 0 && <div className="font-body" style={{ ...txtPeq, fontSize: 11.5, marginTop: 2 }}>Te falta: {x.faltan.join(', ')}</div>}
        </div>
      ))}
    </Card>
  );
}

/* ---------- 3) Consejos de Diana: solo para los puntos débiles, se actualizan solos ---------- */

export function ConsejosDianaCard() {
  const { state, addExercise, showToast } = useGym();
  const [anadidos, setAnadidos] = useState({});
  const cats = catsDe(state);
  const lista = consejosDebiles(state, cats);
  const nombreDia = (id) => { const x = (state.days || []).find((y) => y.id === id); return x ? x.label : ''; };
  const anadir = (musc, e, k) => {
    const dia = diaParaMusculo(state, musc);
    if (!dia) { showToast('Crea primero un día en tu rutina', 'warn'); return; }
    addExercise(dia, e.nombre, musc);
    setAnadidos((x) => ({ ...x, [k]: true }));
    showToast('➕ ' + e.nombre + ' añadido a ' + nombreDia(dia));
  };
  return (
    <Card style={{ marginBottom: 14 }}>
      {!lista.length && <div className="font-body" style={txtPeq}>Marca arriba algún músculo como <b style={{ color: '#F43F5E' }}>Punto débil</b> y aquí verás qué hacer para mejorarlo. Si lo cambias a intermedio o fuerte, su consejo desaparece solo.</div>}
      {lista.map((c) => (
        <div key={c.id} data-testid={'consejo-' + c.id} style={{ ...caja, borderLeft: '3px solid ' + c.color, marginTop: 10 }}>
          <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13.5 }}>{c.emoji} {c.nombre} <span style={{ color: '#F43F5E', fontSize: 11, marginLeft: 4 }}>punto débil</span></div>
          <div className="font-body" style={{ ...txtPeq, marginTop: 4 }}>{c.porQue}</div>
          {c.acciones.map((a, j) => <div key={j} className="font-body" style={{ ...txtPeq, color: T.text, marginTop: 3 }}>✓ {a}</div>)}
          {c.ejercicios.map((e, j) => {
            const kk = c.id + '-' + j;
            return (
              <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                <div className="font-body" style={{ color: T.text, fontSize: 12.5, minWidth: 0 }}>🏋️ <b>{e.nombre}</b> · {e.pauta}</div>
                {anadidos[kk]
                  ? <span className="font-body" style={{ color: '#A3E635', fontSize: 12, flexShrink: 0 }}>✓ Añadido</span>
                  : <button onClick={() => anadir(c.id, e, kk)} className="font-body btn btn-ghost" style={{ padding: '5px 9px', fontSize: 11.5, flexShrink: 0 }}>➕ Añadir</button>}
              </div>
            );
          })}
        </div>
      ))}
      {lista.length > 0 && <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 10 }}>"Añadir" pone el ejercicio en tu rutina; luego ajusta sus series.</div>}
    </Card>
  );
}

/* ---------- 4) Resumen de la semana con tus cifras (sin IA) ---------- */

export function RepasoSemanalCard() {
  const { state } = useGym();
  const r = resumenSemanaLocal(state, new Date());
  const frases = frasesResumen(r);
  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>📋 Esta semana</div>
      {frases.map((f, i) => <div key={i} className="font-body" style={{ ...txtPeq, color: T.text, marginBottom: 6 }}>{f}</div>)}
      <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 6 }}>Cifras calculadas con lo que tienes apuntado. Empieza el lunes.</div>
    </Card>
  );
}

/* ---------- 5) Cardio: elige un objetivo y te doy 5 tipos distintos ---------- */

export function CardioPresetsModal({ onClose }) {
  const { commit, showToast } = useGym();
  const [obj, setObj] = useState('grasa');
  const [anadidos, setAnadidos] = useState({});
  const anadir = (p, i) => {
    commit((prev) => ({ ...prev, cardio: (prev.cardio || []).concat([{ id: 'cardio_' + uid(), ...cardioPresetParaGuardar(p) }]) }));
    setAnadidos((x) => ({ ...x, [obj + i]: true }));
    showToast('🏃 Añadido a tu cardio');
  };
  return (
    <Modal title="🏃 Tipos de cardio" onClose={onClose}>
      <Label>¿Para qué lo quieres?</Label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {CARDIO_OBJETIVOS_SIN_IA.map((x) => <Chip key={x[0]} active={obj === x[0]} onClick={() => setObj(x[0])}>{x[1]}</Chip>)}
      </div>
      {CARDIO_PRESETS[obj].map((p, i) => (
        <Card key={p.nombre} style={{ marginBottom: 12 }}>
          <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>{p.nombre}</div>
          <div className="font-body" style={{ ...txtPeq, margin: '4px 0 8px' }}>{p.modalidad} · {p.metodo} · {p.duracion} min · {p.intensidad} · {p.frecuencia}</div>
          {p.detalle.map((x, j) => <div key={j} className="font-body" style={{ ...txtPeq, color: T.text, marginBottom: 2 }}>• {x}</div>)}
          <div className="font-body" style={{ ...txtPeq, marginTop: 6 }}>🕒 {p.cuando}</div>
          {anadidos[obj + i]
            ? <div className="font-body" style={{ color: '#A3E635', fontSize: 12.5, marginTop: 10, textAlign: 'center' }}>✓ Añadido a tu cardio</div>
            : <button onClick={() => anadir(p, i)} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 10 }}>➕ Añadir a mi cardio</button>}
        </Card>
      ))}
      <div className="font-body" style={{ color: T.dim, fontSize: 11 }}>Son propuestas fijas: ajusta el tiempo o las series a tu nivel.</div>
    </Modal>
  );
}
