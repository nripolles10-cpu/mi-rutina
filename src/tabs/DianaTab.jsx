import React, { useState, useMemo } from 'react';
import { Card, Chip, Label, MiniBtn, SectionTitle, useGym } from '../components/ui.jsx';
import { CATS, CAT_IDS, ESTADO_COLOR, ESTADO_LABEL } from '../data/catalog.js';
import { ACCENT, T } from '../data/theme.js';
import { fmt } from '../utils/format.js';
import { muscleProgress } from '../utils/training.js';

export function BodyMap({ view, onSelect, selected }) {
  const { state } = useGym();
  const estados = state.diana.estados;
  const skin = '#3A4666';

  // Pinta una región (y su espejo para el lado derecho si hace falta)
  const region = (key, cat, d, mirror) => {
    const st = estados[cat];
    const fill = st ? ESTADO_COLOR[st] : '#3A4256';
    const isSel = selected === cat;
    const props = {
      d: d, fill: fill, fillOpacity: isSel ? 1 : 0.88, stroke: isSel ? '#FFFFFF' : 'rgba(0,0,0,0.3)', strokeWidth: isSel ? 2 : 1,
      onClick: () => onSelect(cat), style: { cursor: 'pointer', transition: 'all .15s ease' },
    };
    return (
      <g key={key}>
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

export function DianaFisicaTab() {
  const { state, commit } = useGym();
  const [view, setView] = useState('front');
  const [selected, setSelected] = useState('hombro');
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
          <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>{CATS[selected].emoji} {CATS[selected].label}</div>
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
              <div key={k} onClick={() => setSelected(k)} className="card" style={{ borderLeft: '3px solid ' + col, borderRadius: 14, padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', outline: selected === k ? '1.5px solid ' + ACCENT : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 13.5 }}>{CATS[k].label}{titulos[k] ? ' · ' + titulos[k] : ''}</div>
                  <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>{prog[k].pct !== null ? 'Objetivos: ' + Math.round(prog[k].pct) + ' % · faltan ' + fmt(prog[k].falta) + ' kg' : 'sin objetivos'}</div>
                </div>
                <MiniBtn title="Cambiar estado" onClick={(e) => { e.stopPropagation(); ciclo(k); }}>⟳</MiniBtn>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
