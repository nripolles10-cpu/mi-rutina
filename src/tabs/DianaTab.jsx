import React, { useState, useMemo } from 'react';
import { Card, Chip, Label, MiniBtn, Modal, SectionTitle, useGym } from '../components/ui.jsx';
import { CATS, CAT_IDS, ESTADO_COLOR, ESTADO_LABEL, REGIONES_MAPA, catInfo } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { fmt } from '../utils/format.js';
import { muscleProgress } from '../utils/training.js';
import { borrarMusculo, cambiarRegionMusculo, crearMusculo, ejerciciosDeMusculo, musculosDeRegion, renombrarMusculo } from '../utils/musculos.js';

export function BodyMap({ view, onSelect, selected }) {
  const { state } = useGym();
  const estados = state.diana.estados;
  const skin = '#3A4666';
  const musculos = state.musculos || [];
  const selRegion = catInfo(CATS, selected).region;

  // Pinta una zona del mapa con el estado de los músculos que tiene asociados (si son varios con estados
  // distintos, la zona sale a franjas con cada color). Al tocarla se elige su primer músculo.
  const region = (key, regionId, d, mirror) => {
    const ms = musculosDeRegion(musculos, regionId);
    const cols = [];
    ms.forEach((m) => { const st = estados[m.id]; const c = st ? ESTADO_COLOR[st] : '#3A4256'; if (cols.indexOf(c) === -1) cols.push(c); });
    const gradId = 'gr-' + key;
    const fill = !ms.length ? '#2A3044' : cols.length > 1 ? 'url(#' + gradId + ')' : cols[0];
    const isSel = !!ms.length && selRegion === regionId;
    const props = {
      d: d, fill: fill, fillOpacity: isSel ? 1 : ms.length ? 0.88 : 0.5, stroke: isSel ? '#FFFFFF' : 'rgba(0,0,0,0.3)', strokeWidth: isSel ? 2 : 1,
      onClick: () => { if (!ms.length) return; const i = ms.findIndex((m) => m.id === selected); onSelect(ms[(i + 1) % ms.length].id); },
      style: { cursor: ms.length ? 'pointer' : 'default', transition: 'all .15s ease' },
    };
    return (
      <g key={key} data-region={regionId}>
        {cols.length > 1 && (
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              {cols.map((c, i) => [<stop key={i + 'a'} offset={(i / cols.length) * 100 + '%'} stopColor={c} />, <stop key={i + 'b'} offset={((i + 1) / cols.length) * 100 + '%'} stopColor={c} />])}
            </linearGradient>
          </defs>
        )}
        <path {...props} />
        {mirror && <path {...props} transform="translate(200,0) scale(-1,1)" />}
      </g>
    );
  };

  const head = (
    <g>
      <circle cx="100" cy="34" r="21" fill={skin} />
      <path d="M90,52 Q100,60 110,52 L108,68 Q100,74 92,68 Z" fill={skin} />
      <circle cx="42" cy="212" r="7" fill={skin} />
      <circle cx="158" cy="212" r="7" fill={skin} />
      <ellipse cx="80" cy="368" rx="13" ry="7" fill={skin} />
      <ellipse cx="120" cy="368" rx="13" ry="7" fill={skin} />
    </g>
  );

  const front = (
    <svg viewBox="0 0 200 420" width="100%" height="340">
      {head}
      <path d="M73,280 Q69,320 74,358 L92,358 Q94,320 92,280 Z" fill={skin} />
      <path d="M127,280 Q131,320 126,358 L108,358 Q106,320 108,280 Z" fill={skin} />
      {region('f-hombro', 'hombro', 'M64,72 Q42,74 38,98 Q37,116 48,120 Q58,100 68,86 Z', true)}
      {region('f-pecho', 'pecho', 'M65,74 Q62,98 70,120 L130,120 Q138,98 135,74 Q100,60 65,74 Z')}
      {region('f-core', 'core', 'M70,120 Q66,148 76,174 L124,174 Q134,148 130,120 Z')}
      {region('f-biceps', 'biceps', 'M46,120 L67,120 L64,168 L45,164 Z', true)}
      {region('f-antebrazo', 'antebrazo', 'M45,166 L64,169 L60,206 L43,200 Z', true)}
      {region('f-cuadriceps', 'cuadriceps', 'M76,176 Q68,220 72,278 L90,278 Q92,230 90,176 Z', true)}
      {region('f-aductores', 'aductores', 'M90,176 L98,178 Q99,220 95,262 L90,262 Q92,220 90,176 Z', true)}
    </svg>
  );

  const back = (
    <svg viewBox="0 0 200 420" width="100%" height="340">
      {head}
      {region('b-hombro', 'hombro', 'M64,72 Q42,74 38,98 Q37,116 48,120 Q58,100 68,86 Z', true)}
      {region('b-espalda', 'espalda', 'M66,80 Q60,104 68,128 Q100,140 132,128 Q140,104 134,80 Q100,94 66,80 Z')}
      {region('b-trapecio', 'trapecio', 'M84,60 Q100,66 116,60 L134,78 Q100,94 66,78 Z')}
      {region('b-lumbar', 'lumbar', 'M80,128 Q100,138 120,128 L122,152 Q100,160 78,152 Z')}
      {region('b-triceps', 'triceps', 'M46,120 L67,120 L64,168 L45,164 Z', true)}
      {region('b-antebrazo', 'antebrazo', 'M45,166 L64,169 L60,206 L43,200 Z', true)}
      {region('b-gluteo', 'gluteo', 'M72,152 Q66,176 76,198 L124,198 Q134,176 128,152 Q100,162 72,152 Z')}
      {region('b-abductores', 'abductores', 'M64,150 Q58,168 66,186 L72,180 Q70,166 72,152 Z', true)}
      {region('b-isquios', 'isquios', 'M76,200 Q70,232 74,272 L96,272 Q98,232 96,200 Z', true)}
      {region('b-gemelos', 'gemelos', 'M73,274 Q69,316 74,358 L92,358 Q94,316 92,274 Z', true)}
    </svg>
  );
  return view === 'front' ? front : back;
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
  const ciclo = (cat) => { const cur = estados[cat] || 'none'; setEstado(cat, cur === 'none' ? 'fuerte' : cur === 'fuerte' ? 'intermedio' : cur === 'intermedio' ? 'debil' : 'none'); };

  const p = prog[selected];
  const estSel = estados[selected] || 'none';
  let aviso = null;
  if (p && p.pct !== null) {
    if (estSel === 'debil' && p.pct >= 95) aviso = 'Solo informativo: lo tienes marcado como débil, pero va al ' + Math.round(p.pct) + ' % de sus objetivos de levantamiento. Tú decides si lo cambias.';
    if (estSel === 'fuerte' && p.pct < 60) aviso = 'Solo informativo: lo tienes como fuerte, pero va al ' + Math.round(p.pct) + ' % de sus objetivos de levantamiento. Tú decides si lo cambias.';
  }
  const grupos = [['fuerte', 'Puntos fuertes'], ['intermedio', 'Intermedios'], ['debil', 'Puntos débiles'], ['none', 'Sin marcar']];

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
          {[['fuerte', '#22C55E'], ['intermedio', '#FBBF24'], ['debil', '#F43F5E'], ['none', '#3A4256']].map((x) => (
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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <Chip active={estSel === 'fuerte'} accent="#22C55E" onClick={() => setEstado(selected, 'fuerte')}>Punto fuerte</Chip>
            <Chip active={estSel === 'intermedio'} accent="#FBBF24" onClick={() => setEstado(selected, 'intermedio')}>Intermedio</Chip>
            <Chip active={estSel === 'debil'} accent="#F43F5E" onClick={() => setEstado(selected, 'debil')}>Punto débil</Chip>
            <Chip active={estSel === 'none'} accent="#94A3B8" onClick={() => setEstado(selected, 'none')}>Sin marcar</Chip>
          </div>
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
            {lista.map((k) => (
              <div key={k} onClick={() => setSelected(k)} className="card" style={{ borderLeft: '3px solid ' + col, borderRadius: 14, padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', outline: selected === k ? '1.5px solid ' + T.cyan : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 13.5 }}>{catInfo(CATS, k).label}{titulos[k] ? ' · ' + titulos[k] : ''}</div>
                  <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>{prog[k] && prog[k].pct !== null ? 'Objetivos: ' + Math.round(prog[k].pct) + ' % · faltan ' + fmt(prog[k].falta) + ' kg' : 'sin objetivos'}</div>
                </div>
                <MiniBtn title="Cambiar estado" onClick={(e) => { e.stopPropagation(); ciclo(k); }}>⟳</MiniBtn>
              </div>
            ))}
          </div>
        );
      })}
      <button onClick={() => setEditando(true)} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 4, marginBottom: 8 }}>✏️ Crear, renombrar o quitar músculos</button>
    </div>
  );
}
