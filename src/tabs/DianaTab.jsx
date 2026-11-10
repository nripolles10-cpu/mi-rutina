import React, { useState, useMemo } from 'react';
import { Card, Chip, Label, MiniBtn, Modal, SectionTitle, useGym } from '../components/ui.jsx';
import { CATS, CAT_IDS, ESTADO_COLOR, ESTADO_LABEL, REGIONES_MAPA, catInfo } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { ConsejosDianaCard } from '../components/Herramientas.jsx';
import { fmt } from '../utils/format.js';
import { muscleProgress } from '../utils/training.js';
import { CUERPO_DIANA } from '../data/cuerpoDiana.js';
import { borrarMusculo, cambiarRegionMusculo, crearMusculo, ejerciciosDeMusculo, musculosDeRegion, renombrarMusculo } from '../utils/musculos.js';

// Colores del cuerpo humano de la Diana: piel, pelo y músculo sin marcar
const PIEL = '#C99A7E';
const PELO = '#2B1D14';
export const COLOR_SIN_MARCAR = '#B98A70';

// Cuerpo de hombre o de mujer (según Ajustes), delante o detrás. Cada zona se pinta con el estado de sus
// músculos (si son varios con estados distintos, a franjas). Al tocarla se elige su músculo (o el siguiente).
export function BodyMap({ view, onSelect, selected }) {
  const { state } = useGym();
  const estados = state.diana.estados;
  const musculos = state.musculos || [];
  const sexo = state.formulario && state.formulario.sexo === 'F' ? 'F' : 'M';
  const lado = view === 'back' ? 'back' : 'front';
  const fig = CUERPO_DIANA[sexo][lado];
  const selRegion = catInfo(CATS, selected).region;
  const pre = 'dn-' + sexo + lado;

  const zonas = useMemo(() => {
    const z = {};
    fig.piezas.forEach((p) => {
      if (!p.r || p.r === 'pelo' || z[p.r]) return;
      const ms = musculosDeRegion(musculos, p.r);
      const cols = [];
      ms.forEach((m) => { const st = estados[m.id]; const c = st ? ESTADO_COLOR[st] : COLOR_SIN_MARCAR; if (cols.indexOf(c) === -1) cols.push(c); });
      z[p.r] = { ms, cols };
    });
    return z;
  }, [fig, musculos, estados]);

  const relleno = (r) => {
    if (r === 'pelo') return PELO;
    const zz = r && zonas[r];
    if (!zz || !zz.ms.length) return PIEL; // zona sin músculo (o piel): no se marca
    return zz.cols.length > 1 ? 'url(#' + pre + '-mix-' + r + ')' : zz.cols[0];
  };
  const tocar = (r) => {
    const zz = zonas[r];
    if (!zz || !zz.ms.length) return;
    const i = zz.ms.findIndex((m) => m.id === selected);
    onSelect(zz.ms[(i + 1) % zz.ms.length].id);
  };

  return (
    <svg viewBox={fig.vb.join(' ')} width="100%" height="360" role="img" aria-label={(sexo === 'F' ? 'Cuerpo de mujer' : 'Cuerpo de hombre') + (lado === 'front' ? ', delante' : ', detrás')}
      data-testid="diana-cuerpo" data-sexo={sexo} data-lado={lado} style={{ display: 'block', margin: '4px auto 0' }}>
      <defs>
        <radialGradient id={pre + '-luz'} cx="38%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.38" />
        </radialGradient>
        <filter id={pre + '-sombra'} x="-20%" y="-10%" width="140%" height="120%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#000000" floodOpacity="0.55" />
        </filter>
        {Object.keys(zonas).filter((r) => zonas[r].cols.length > 1).map((r) => {
          const cols = zonas[r].cols;
          return (
            <linearGradient key={r} id={pre + '-mix-' + r} x1="0" y1="0" x2="1" y2="0">
              {cols.map((c, i) => [<stop key={i + 'a'} offset={(i / cols.length) * 100 + '%'} stopColor={c} />, <stop key={i + 'b'} offset={((i + 1) / cols.length) * 100 + '%'} stopColor={c} />])}
            </linearGradient>
          );
        })}
        {fig.piezas.map((p, i) => (p.c ? <clipPath key={i} id={pre + '-c' + i}><rect x={p.c[0]} y={p.c[1]} width={p.c[2]} height={p.c[3]} /></clipPath> : null))}
      </defs>
      <g filter={'url(#' + pre + '-sombra)'}>
        {fig.piezas.map((p, i) => {
          const activa = !!(p.r && p.r !== 'pelo' && zonas[p.r] && zonas[p.r].ms.length);
          const sel = activa && selRegion === p.r;
          return (
            <g key={i} data-region={activa ? p.r : undefined} clipPath={p.c ? 'url(#' + pre + '-c' + i + ')' : undefined}
              onClick={activa ? () => tocar(p.r) : undefined} style={{ cursor: activa ? 'pointer' : 'default' }}>
              <path d={p.d} fill={relleno(p.r)} stroke={sel ? '#FFFFFF' : 'rgba(40,20,10,0.55)'} strokeWidth={sel ? 7 : 2} />
              <path d={p.d} fill={'url(#' + pre + '-luz)'} pointerEvents="none" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ---------- Editor de músculos (crear, renombrar, zona del mapa, quitar) ---------- */
const SIN_ZONA = '__ninguna__';

function ZonaSelect({ value, onChange, label }) {
  return (
    <select aria-label={label || 'Zona del mapa'} value={value || SIN_ZONA} onChange={(e) => onChange(e.target.value === SIN_ZONA ? null : e.target.value)}
      className="font-body inp" style={{ fontSize: 12.5, padding: '8px 10px', width: '100%' }}>
      <option value={SIN_ZONA}>Sin zona en el mapa (solo en la lista)</option>
      {REGIONES_MAPA.map((r) => <option key={r[0]} value={r[0]}>Pinta la zona: {r[1]}</option>)}
    </select>
  );
}

function FilaMusculo({ m, total }) {
  const { state, commit, commitDeshacible, showToast } = useGym();
  const [nombre, setNombre] = useState(m.label);
  const [borrando, setBorrando] = useState(false);
  const usados = ejerciciosDeMusculo(state, m.id);
  const otros = (state.musculos || []).filter((x) => x.id !== m.id);
  const [destino, setDestino] = useState(otros.length ? otros[0].id : '');
  const guardarNombre = () => {
    if (nombre.trim() === m.label) return;
    const r = renombrarMusculo(state, m.id, nombre);
    if (!r.ok) { showToast(r.error, 'warn'); setNombre(m.label); return; }
    commitDeshacible(() => r.state, 'Renombrado a "' + r.state.musculos.find((x) => x.id === m.id).label + '"');
  };
  const quitar = () => {
    const r = borrarMusculo(state, m.id, usados.length ? destino : null);
    if (!r.ok) { showToast(r.error, 'warn'); return; }
    setBorrando(false);
    commitDeshacible(() => r.state, '"' + m.label + '" quitado' + (r.movidos ? ' · ' + r.movidos + ' ejercicio(s) pasan a ' + catInfo(CATS, destino).label : ''));
  };
  return (
    <div className="card" data-testid={'musculo-' + m.id} style={{ borderLeft: '3px solid ' + m.color, borderRadius: 14, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ width: 12, height: 12, borderRadius: 999, background: m.color, flexShrink: 0 }} />
        <input type="text" maxLength={40} value={nombre} aria-label={'Nombre de ' + m.label} onChange={(e) => setNombre(e.target.value)}
          onBlur={guardarNombre} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} className="font-body inp" style={{ fontSize: 13.5, flex: 1 }} />
        <MiniBtn title={'Quitar ' + m.label} disabled={total <= 1} onClick={() => setBorrando(!borrando)}>🗑</MiniBtn>
      </div>
      <ZonaSelect value={m.region} label={'Zona del mapa de ' + m.label} onChange={(reg) => { const r = cambiarRegionMusculo(state, m.id, reg); if (r.ok) commit(() => r.state); }} />
      <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 6 }}>{usados.length ? usados.length + ' ejercicio(s) con este músculo' : 'Ningún ejercicio lo usa'}</div>
      {borrando && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.35)' }}>
          {usados.length ? (
            <>
              <div className="font-body" style={{ color: '#FECDD3', fontSize: 12.5, lineHeight: 1.5, marginBottom: 8 }}>
                "{m.label}" tiene {usados.length} ejercicio(s). No se pierde ninguno ni su historial: elige a qué músculo pasan.
              </div>
              <select aria-label="Músculo de destino" value={destino} onChange={(e) => setDestino(e.target.value)} className="font-body inp" style={{ fontSize: 13, marginBottom: 8 }}>
                {otros.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </>
          ) : <div className="font-body" style={{ color: '#FECDD3', fontSize: 12.5, marginBottom: 8 }}>¿Quitar "{m.label}"? Ningún ejercicio lo usa.</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setBorrando(false)} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>Cancelar</button>
            <button onClick={quitar} className="font-body btn" style={{ flex: 1, fontSize: 12.5, background: 'linear-gradient(135deg, #FB7185, #F43F5E)', color: '#fff' }}>Quitar músculo</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EditorMusculosModal({ onClose }) {
  const { state, commitDeshacible, showToast } = useGym();
  const [nombre, setNombre] = useState('');
  const [zona, setZona] = useState(null);
  const musculos = state.musculos || [];
  const crear = () => {
    const r = crearMusculo(state, nombre, zona);
    if (!r.ok) { showToast(r.error, 'warn'); return; }
    commitDeshacible(() => r.state, '"' + r.state.musculos[r.state.musculos.length - 1].label + '" creado ✓');
    setNombre(''); setZona(null);
  };
  return (
    <Modal title="💪 Tus músculos" onClose={onClose}>
      <Card style={{ marginBottom: 14 }}>
        <div className="font-body" style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
          Crea, renombra o quita grupos musculares (por ejemplo, quita "Pecho" y crea "Pecho superior", "Pecho medio" y "Pecho inferior").
          Se usan en toda la app: al elegir el músculo de un ejercicio, en las series por semana, en los objetivos, en la Diana y en las copias.
          Si eliges una zona del mapa, el músculo pinta esa zona; si no, aparece solo en la lista.
        </div>
        <Label>Nuevo músculo</Label>
        <input type="text" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') crear(); }}
          placeholder="ej. Pecho superior" aria-label="Nombre del músculo nuevo" className="font-body inp" style={{ fontSize: 13.5, marginBottom: 8 }} />
        <ZonaSelect value={zona} onChange={setZona} label="Zona del mapa del músculo nuevo" />
        <button onClick={crear} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 10 }}>＋ Añadir músculo</button>
      </Card>
      {musculos.map((m) => <FilaMusculo key={m.id + ':' + m.label} m={m} total={musculos.length} />)}
    </Modal>
  );
}

export function DianaFisicaTab() {
  const { state, commit } = useGym();
  const [view, setView] = useState('front');
  const [selectedRaw, setSelected] = useState('hombro');
  const [editando, setEditando] = useState(false);
  const selected = CATS[selectedRaw] ? selectedRaw : (CATS.hombro ? 'hombro' : CAT_IDS[0]);
  const prog = useMemo(() => muscleProgress(state), [state.days, state.exercises]);
  const estados = state.diana.estados;
  const titulos = state.diana.titulos;

  const setEstado = (cat, est) => commit((prev) => {
    const e = { ...prev.diana.estados };
    if (est === 'none') delete e[cat]; else e[cat] = est;
    return { ...prev, diana: { ...prev.diana, estados: e } };
  });
  const setTitulo = (cat, txt) => commit((prev) => ({ ...prev, diana: { ...prev.diana, titulos: { ...prev.diana.titulos, [cat]: txt } } }), { key: 'diana:' + cat });

  const p = prog[selected];
  const estSel = estados[selected] || 'none';
  let aviso = null;
  if (p && p.pct !== null) {
    if (estSel === 'debil' && p.pct >= 95) aviso = 'Solo informativo: lo tienes marcado como débil, pero va al ' + Math.round(p.pct) + ' % de sus objetivos de levantamiento. Tú decides si lo cambias.';
    if (estSel === 'fuerte' && p.pct < 60) aviso = 'Solo informativo: lo tienes como fuerte, pero va al ' + Math.round(p.pct) + ' % de sus objetivos de levantamiento. Tú decides si lo cambias.';
  }
  const grupos = [['fuerte', 'Puntos fuertes'], ['intermedio', 'Puntos intermedios'], ['debil', 'Puntos débiles'], ['none', 'Sin marcar']];

  return (
    <div>
      <SectionTitle emoji="🎯">Diana física</SectionTitle>
      {editando && <EditorMusculosModal onClose={() => setEditando(false)} />}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          <Chip active={view === 'front'} onClick={() => setView('front')}>Delante</Chip>
          <Chip active={view === 'back'} onClick={() => setView('back')}>Detrás</Chip>
        </div>
        <BodyMap view={view} onSelect={setSelected} selected={selected} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 4, marginBottom: 12, flexWrap: 'wrap' }}>
          {[['fuerte', ESTADO_COLOR.fuerte], ['intermedio', ESTADO_COLOR.intermedio], ['debil', ESTADO_COLOR.debil], ['none', COLOR_SIN_MARCAR]].map((x) => (
            <div key={x[0]} className="font-body" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.muted }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: x[1], display: 'inline-block' }} />{ESTADO_LABEL[x[0]]}
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(7,11,22,0.7)', border: '1px solid rgba(140,170,255,0.18)', borderRadius: 14, padding: 12 }}>
          <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>{catInfo(CATS, selected).emoji} {catInfo(CATS, selected).label}</div>
          {catInfo(CATS, selected).region && musculosDeRegion(state.musculos, catInfo(CATS, selected).region).length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {musculosDeRegion(state.musculos, catInfo(CATS, selected).region).map((m) => <Chip key={m.id} active={m.id === selected} accent={m.color} onClick={() => setSelected(m.id)} style={{ padding: '5px 10px', fontSize: 11.5 }}>{m.label}</Chip>)}
            </div>
          )}
          {!catInfo(CATS, selected).region && <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: -4, marginBottom: 8 }}>No tiene zona en el mapa: se marca desde aquí o desde la lista.</div>}
          <Label>Título corto (opcional)</Label>
          <input type="text" maxLength={40} value={titulos[selected] || ''} onChange={(e) => setTitulo(selected, e.target.value)} placeholder="ej. Deltoides redondo" className="font-body inp" style={{ fontSize: 13 }} />
          <div className="font-body" style={{ marginTop: 10, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
            {p && p.pct !== null
              ? <>Progreso hacia tus objetivos de levantamiento: <b style={{ color: T.text }}>{Math.round(p.pct)} %</b> · te faltan de media <b style={{ color: T.text }}>{fmt(p.falta)} kg</b></>
              : 'Este músculo no tiene objetivos de levantamiento con número.'}
          </div>
          {aviso && <div className="font-body" style={{ marginTop: 8, fontSize: 11.5, color: '#FDE68A', lineHeight: 1.5 }}>ℹ️ {aviso}</div>}
        </div>
      </Card>

      {grupos.map((g) => {
        const lista = CAT_IDS.filter((k) => (estados[k] || 'none') === g[0]);
        if (!lista.length) return null;
        const col = g[0] === 'none' ? '#94A3B8' : ESTADO_COLOR[g[0]];
        return (
          <div key={g[0]} style={{ marginBottom: 14 }}>
            <div className="font-body" style={{ color: col, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{g[1]} ({lista.length})</div>
            {lista.map((k) => {
              const act = estados[k] || 'none';
              return (
                <div key={k} data-testid={'diana-' + k} className="card" onClick={() => setSelected(k)} style={{ borderLeft: '3px solid ' + catInfo(CATS, k).color, borderRadius: 14, padding: '10px 12px', marginBottom: 8, cursor: 'pointer', outline: selected === k ? '1.5px solid rgba(var(--ac-rgb),0.7)' : 'none' }}>
                  <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 13.5 }}>{catInfo(CATS, k).label}{titulos[k] ? ' · ' + titulos[k] : ''}</div>
                  <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 2, marginBottom: 8 }}>{prog[k] && prog[k].pct !== null ? 'Objetivos: ' + Math.round(prog[k].pct) + ' % · faltan ' + fmt(prog[k].falta) + ' kg' : 'sin objetivos'}</div>
                  <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    {[['fuerte', 'Punto fuerte', '#22C55E'], ['intermedio', 'Intermedio', '#FBBF24'], ['debil', 'Punto débil', '#F43F5E']].map((b) => (
                      <Chip key={b[0]} active={act === b[0]} accent={b[2]} onClick={() => setEstado(k, act === b[0] ? 'none' : b[0])} style={{ flex: 1, textAlign: 'center', padding: '7px 4px', fontSize: 11.5 }}>{b[1]}</Chip>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      <button onClick={() => setEditando(true)} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 4, marginBottom: 18 }}>✏️ Crear, renombrar o quitar músculos</button>

      <SectionTitle emoji="💡">Cómo mejorar tus puntos débiles</SectionTitle>
      <ConsejosDianaCard />
    </div>
  );
}
