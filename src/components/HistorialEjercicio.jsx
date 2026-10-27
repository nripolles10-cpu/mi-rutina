import React, { useMemo, useState } from 'react';
import { LineChartSVG } from './LineChart.jsx';
import { Card, Chip, Modal, SupRow, useGym } from './ui.jsx';
import { CATS, catInfo } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { fmt, fmtDateLong, fmtDateShort } from '../utils/format.js';
import { describeSet } from '../utils/training.js';
import { historialEjercicio, sugerenciaProgresion } from '../utils/entreno.js';

/* Sugerencia de progresión: SOLO es una sugerencia. Si propone un peso, se aplica únicamente si tocas el botón. */
export function SugerenciaProgresion({ id, compacta }) {
  const { state, updateExercise, showToast } = useGym();
  const ex = state.exercises[id];
  if (!ex) return null;
  const s = sugerenciaProgresion(ex);
  const color = s.tipo === 'subir' ? '#A3E635' : s.tipo === 'bajar' ? '#FBBF24' : 'var(--ac-claro)';
  const aplicar = () => {
    const sets = ex.currentSets.map((x, i) => (i === 0 ? (x.tipo === 'drop' ? { ...x, weight: s.peso, drops: x.drops.map((d, j) => (j === 0 ? { ...d, weight: s.peso } : d)) } : { ...x, weight: s.peso }) : x));
    updateExercise(id, { currentSets: sets });
    showToast('Serie 1 a ' + fmt(s.peso, 2) + ' kg ✓');
  };
  return (
    <div data-testid={'sugerencia-' + id} className="font-body" style={{ marginTop: compacta ? 8 : 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(140,170,255,0.2)' }}>
      <div style={{ color, fontSize: 12.5, lineHeight: 1.5 }}>💡 {s.texto}</div>
      {s.aviso && <div style={{ color: '#FDE68A', fontSize: 11.5, lineHeight: 1.5, marginTop: 4 }}>⚠️ {s.aviso}</div>}
      {s.peso !== null && (
        <button onClick={aplicar} className="font-body btn btn-ghost" style={{ marginTop: 8, padding: '6px 10px', fontSize: 11.5 }}>Poner {fmt(s.peso, 2)} kg en la serie 1</button>
      )}
      {!compacta && <div style={{ color: T.dim, fontSize: 10.5, marginTop: 6 }}>Es solo una sugerencia: no cambia nada a menos que toques el botón.</div>}
    </div>
  );
}

export function HistorialEjercicioModal({ id, onClose }) {
  const { state } = useGym();
  const ex = state.exercises[id];
  const [ver, setVer] = useState('rm');
  const h = useMemo(() => (ex ? historialEjercicio(ex) : null), [ex]);
  if (!ex || !h) return null;
  const color = catInfo(CATS, ex.cat).color;
  const regs = h.registros.filter((r) => !r.seed);
  const puntos = regs.map((r) => ({ label: fmtDateShort(r.date), y: ver === 'rm' ? (r.rm === null ? null : Math.round(r.rm * 10) / 10) : ver === 'vol' ? Math.round(r.volumen) : (r.sets[0] && typeof r.sets[0].weight === 'number' ? r.sets[0].weight : null) }));
  return (
    <Modal title={'📈 ' + ex.name} onClose={onClose}>
      <Card style={{ marginBottom: 12 }}>
        <SupRow label="🏆 Mejor peso en la serie 1" value={h.mejorPeso === null ? '—' : fmt(h.mejorPeso, 2) + ' kg'} highlight />
        <SupRow label="💪 Mejor 1RM estimado" value={h.mejor1RM === null ? '—' : fmt(h.mejor1RM) + ' kg'} />
        <SupRow label="📦 Mayor volumen en un día" value={h.mejorVolumen ? fmt(h.mejorVolumen, 0) + ' kg' : '—'} />
        <SupRow label="🥇 Récords conseguidos" value={String(h.records)} />
        <SupRow label="📅 Registros guardados" value={String(regs.length)} />
        <div className="font-body" style={{ color: T.dim, fontSize: 10.5, marginTop: 6, lineHeight: 1.5 }}>
          1RM estimado: media de las fórmulas de Epley y Brzycki con la mejor serie de cada día (sin calentamientos). Es orientativo; no hace falta probarlo.
        </div>
      </Card>
      <Card style={{ marginBottom: 12, padding: '12px 6px 8px' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 8px 8px' }}>
          {[['rm', '1RM estimado'], ['peso', 'Peso serie 1'], ['vol', 'Volumen']].map((x) => <Chip key={x[0]} active={ver === x[0]} accent={color} onClick={() => setVer(x[0])} style={{ padding: '6px 12px', fontSize: 12 }}>{x[1]}</Chip>)}
        </div>
        {puntos.filter((p) => typeof p.y === 'number').length >= 2
          ? <LineChartSVG points={puntos} color={color} height={190} />
          : <div className="font-body" style={{ color: T.dim, fontSize: 12.5, textAlign: 'center', padding: '24px 10px' }}>Guarda tu registro en al menos dos entrenamientos para ver la gráfica.</div>}
      </Card>
      <SugerenciaProgresion id={id} />
      <div style={{ marginTop: 14 }}>
        {regs.length === 0 && <div className="font-body" style={{ color: T.dim, fontSize: 12.5, textAlign: 'center', padding: 12 }}>Todavía no hay registros guardados.</div>}
        {regs.slice().reverse().map((r, i) => (
          <div key={i} className="card" style={{ padding: 12, marginBottom: 8, borderLeft: '3px solid ' + (r.record ? '#FBBF24' : color) }}>
            <div className="font-body" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
              <span style={{ color: T.text, fontWeight: 800, fontSize: 13, textTransform: 'capitalize' }}>{fmtDateLong(r.date)}</span>
              {r.record && <span style={{ color: '#FBBF24', fontWeight: 800, fontSize: 11.5, whiteSpace: 'nowrap' }}>🏆 Récord</span>}
            </div>
            {r.sets.map((s, j) => <div key={j} className="font-body" style={{ color: T.muted, fontSize: 12, marginTop: 3 }}>{j + 1}. {describeSet(s)}{s.nota ? ' (' + s.nota + ')' : ''}</div>)}
            <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 5 }}>Volumen {fmt(r.volumen, 0)} kg{r.rm !== null ? ' · 1RM estimado ' + fmt(r.rm) + ' kg' : ''}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
