import React, { useState, useEffect, useMemo } from 'react';
import { LineChartSVG } from '../components/LineChart.jsx';
import { Bar, Card, Chip, Label, LabeledNum, MiniBtn, Modal, NumField, SectionTitle, SupRow, useGym, useSwipe } from '../components/ui.jsx';
import { CATS, CAT_IDS, catInfo } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { fmt, fmtDateLong, fmtDateShort, formatDecimal, groupByMonth, mean, monthLabel, ymd } from '../utils/format.js';
import { bmiCategory, calcBMI } from '../utils/health.js';
import { OBJETIVO_PESO_MAX, OBJETIVO_PESO_MIN, validarObjetivoPeso } from '../utils/peso.js';
import { activeExerciseIds, muscleProgress, weeklySets } from '../utils/training.js';

/* ---------- Peso corporal ---------- */

export const RANGOS = [['mes', 'Mes'], ['3m', '3 meses'], ['6m', '6 meses'], ['todo', 'Todo']];

export function EditRecordModal({ rec, title, unit, onSave, onClose }) {
  const [val, setVal] = useState(rec.valor);
  const [fecha, setFecha] = useState(ymd(rec.date));
  return (
    <Modal title={title} onClose={onClose}>
      <Card>
        <LabeledNum label={'Valor (' + unit + ')'} value={val} onChange={setVal} suffix={unit} />
        <Label style={{ marginTop: 12 }}>Fecha</Label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="font-body inp" />
        <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 6 }}>Si tu teclado no muestra calendario, escribe la fecha como AAAA-MM-DD.</div>
        <button disabled={val === null || !fecha} onClick={() => { onSave(val, fecha); onClose(); }} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 16 }}>Guardar cambios</button>
      </Card>
    </Modal>
  );
}

export function PesoChartPanel({ big, st, setSt }) {
  const { state, commit, askConfirm } = useGym();
  const [editing, setEditing] = useState(null);
  const hist = useMemo(() => (state.peso.historial || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date)), [state.peso.historial]);
  const months = useMemo(() => groupByMonth(hist), [hist]);
  const mIdx = st.monthIdx === null ? months.length - 1 : Math.max(0, Math.min(st.monthIdx, months.length - 1));

  let entries = [];
  let etiqueta = '';
  if (st.range === 'mes') { entries = months[mIdx] ? months[mIdx].entries : []; etiqueta = months[mIdx] ? monthLabel(months[mIdx].key) : 'Sin registros'; }
  else if (st.range === 'todo') { entries = hist; etiqueta = 'Todo el historial'; }
  else { const dias = st.range === '3m' ? 92 : 183; const corte = Date.now() - dias * 86400000; entries = hist.filter((h) => new Date(h.date).getTime() >= corte); etiqueta = st.range === '3m' ? 'Últimos 3 meses' : 'Últimos 6 meses'; }

  const points = entries.map((h) => ({ label: fmtDateShort(h.date), y: h.kg, id: h.id }));
  const selIdx = st.selId ? entries.findIndex((h) => h.id === st.selId) : -1;
  const sel = selIdx >= 0 ? entries[selIdx] : null;
  const kgs = entries.map((h) => h.kg);
  const resumen = entries.length ? { media: mean(kgs), primero: entries[0], ultimo: entries[entries.length - 1], dif: entries[entries.length - 1].kg - entries[0].kg } : null;

  const goMonth = (d) => {
    if (st.range !== 'mes') return;
    const n = Math.max(0, Math.min(months.length - 1, mIdx + d));
    setSt({ ...st, monthIdx: n, selId: null });
  };
  const swipe = useSwipe(() => goMonth(-1), () => goMonth(1)); // deslizar a la izquierda = mes anterior, a la derecha = mes siguiente

  const saveEdit = (val, fecha) => {
    commit((prev) => ({ ...prev, peso: { ...prev.peso, historial: prev.peso.historial.map((r) => (r.id === editing.id ? { ...r, kg: val, date: new Date(fecha + 'T12:00:00').toISOString() } : r)) } }), {});
  };
  const askDelete = () => askConfirm({
    title: '¿Borrar este registro?', text: fmtDateLong(sel.date) + ': ' + fmt(sel.kg, 2) + ' kg',
    confirmLabel: 'Borrar',
    onConfirm: () => { commit((prev) => ({ ...prev, peso: { ...prev.peso, historial: prev.peso.historial.filter((r) => r.id !== sel.id) } })); setSt({ ...st, selId: null }); },
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {RANGOS.map((r) => <Chip key={r[0]} active={st.range === r[0]} onClick={() => setSt({ ...st, range: r[0], selId: null })} style={{ padding: '6px 12px', fontSize: 12 }}>{r[1]}</Chip>)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
        {st.range === 'mes' && <MiniBtn disabled={mIdx <= 0} onClick={() => goMonth(-1)}>‹</MiniBtn>}
        <span className="font-body" style={{ color: '#E7EAF8', fontSize: 12.5, fontWeight: 700, textTransform: 'capitalize', minWidth: 130, textAlign: 'center' }}>{etiqueta}</span>
        {st.range === 'mes' && <MiniBtn disabled={mIdx >= months.length - 1} onClick={() => goMonth(1)}>›</MiniBtn>}
      </div>

      <div {...swipe}>
        {points.length >= 2 ? (
          <LineChartSVG points={points} color="#22D3EE" height={big ? 320 : 200} selectedIndex={selIdx >= 0 ? selIdx : null} onPointClick={(i) => setSt({ ...st, selId: entries[i].id })} />
        ) : (
          <div className="font-body" style={{ color: T.dim, fontSize: 12, textAlign: 'center', padding: '24px 10px' }}>Necesitas al menos 2 registros en este periodo para ver la curva.</div>
        )}
      </div>
      {st.range === 'mes' && months.length > 1 && <div className="font-body" style={{ color: T.dim, fontSize: 10.5, textAlign: 'center', marginBottom: 6 }}>Desliza el dedo sobre el gráfico (izquierda = mes anterior, derecha = mes siguiente)</div>}

      {sel && (
        <div className="card" style={{ marginTop: 8, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>{fmt(sel.kg, 2) + ' kg'}</div>
            <div className="font-body" style={{ color: T.muted, fontSize: 11.5, textTransform: 'capitalize' }}>{fmtDateLong(sel.date)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setEditing({ id: sel.id, valor: sel.kg, date: sel.date })} className="font-body btn btn-ghost" style={{ padding: '7px 10px', fontSize: 12 }}>✏️ Editar</button>
            <button onClick={askDelete} className="font-body btn btn-danger" style={{ padding: '7px 10px', fontSize: 12 }}>🗑️ Borrar</button>
          </div>
        </div>
      )}
      {!sel && points.length >= 2 && <div className="font-body" style={{ color: T.dim, fontSize: 11, textAlign: 'center', marginTop: 6 }}>Toca un punto para ver su fecha, editarlo o borrarlo</div>}

      {resumen && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(140,170,255,0.14)' }}>
          <SupRow label="Peso medio del periodo" value={fmt(resumen.media) + ' kg'} />
          <SupRow label={'Primer registro (' + fmtDateShort(resumen.primero.date) + ')'} value={fmt(resumen.primero.kg, 2) + ' kg'} />
          <SupRow label={'Último registro (' + fmtDateShort(resumen.ultimo.date) + ')'} value={fmt(resumen.ultimo.kg, 2) + ' kg'} />
          <SupRow label="Diferencia" value={(resumen.dif > 0 ? '+' : '') + fmt(resumen.dif) + ' kg'} highlight />
        </div>
      )}
      {editing && <EditRecordModal rec={editing} title="Editar peso" unit="kg" onSave={saveEdit} onClose={() => setEditing(null)} />}
    </div>
  );
}

// Editor del objetivo de peso dentro de la tarjeta (el mismo dato que en Ajustes y en la calculadora)
export function ObjetivoPesoEditor({ actual, onClose }) {
  const { state, setObjetivoPeso } = useGym();
  const [txt, setTxt] = useState(formatDecimal(state.peso.objetivoKg));
  const [error, setError] = useState(null);
  const guardar = (valor) => {
    const r = validarObjetivoPeso(valor);
    if (!r.ok) { setError(r.error); return; }
    setObjetivoPeso(r.kg);
    onClose();
  };
  const v = validarObjetivoPeso(txt);
  let pista = null;
  if (v.ok && v.kg && actual) pista = v.kg < actual ? 'Bajar ' + fmt(Math.round((actual - v.kg) * 10) / 10) + ' kg' : v.kg > actual ? 'Subir ' + fmt(Math.round((v.kg - actual) * 10) / 10) + ' kg' : 'Es tu peso actual';
  return (
    <div data-testid="objetivo-peso-editor" style={{ background: 'rgba(7,11,22,0.7)', border: '1px solid rgba(34,211,238,0.35)', borderRadius: 14, padding: 12, marginBottom: 12 }}>
      <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>🎯 ¿A qué peso quieres llegar?</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input type="text" inputMode="decimal" autoFocus value={txt} placeholder="ej. 78,5" aria-label="Objetivo de peso en kg"
            onChange={(e) => { setTxt(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') guardar(txt); }}
            className="font-body inp" style={{ fontSize: 15, paddingRight: 36 }} />
          <span className="font-body" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: T.dim, fontSize: 12 }}>kg</span>
        </div>
        <button onClick={() => guardar(txt)} className="font-body btn btn-primary" style={{ padding: '10px 14px' }}>Guardar</button>
      </div>
      <div className="font-body" style={{ fontSize: 11.5, marginTop: 6, color: error ? '#FCA5A5' : T.dim, lineHeight: 1.4 }}>
        {error || pista || ('Entre ' + OBJETIVO_PESO_MIN + ' y ' + OBJETIVO_PESO_MAX + ' kg. Se usa también en Ajustes y en la calculadora.')}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {state.peso.objetivoKg ? <button onClick={() => guardar(null)} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5, color: '#FCA5A5' }}>Quitar objetivo</button> : null}
        <button onClick={onClose} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>Cancelar</button>
      </div>
    </div>
  );
}

export function PesoCard() {
  const { state, logPeso } = useGym();
  const [editObj, setEditObj] = useState(false);
  const [draft, setDraft] = useState('');
  const [st, setSt] = useState({ range: 'mes', monthIdx: null, selId: null });
  const [big, setBig] = useState(false);
  const peso = state.peso;
  const hist = peso.historial || [];
  const sorted = hist.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const actual = sorted.length ? sorted[sorted.length - 1].kg : null;
  const hace30 = (() => {
    if (sorted.length < 2) return null;
    const now = new Date(sorted[sorted.length - 1].date);
    const target = new Date(now.getTime() - 30 * 86400000);
    let closest = sorted[0];
    sorted.forEach((h) => { if (new Date(h.date) <= target) closest = h; });
    return closest === sorted[sorted.length - 1] ? null : closest.kg;
  })();
  const bmi = calcBMI(actual, state.formulario.alturaCm);
  const bmiCat = bmiCategory(bmi);

  return (
    <Card style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
        <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>⚖️ Peso corporal</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setEditObj(!editObj)} title="Cambiar el objetivo de peso" className="font-body"
            style={{ background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.4)', borderRadius: 999, padding: '5px 10px', color: '#7DE9FA', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
            {peso.objetivoKg ? '🎯 ' + fmt(peso.objetivoKg, 2) + ' kg ✎' : '🎯 Poner objetivo'}
          </button>
          <button onClick={() => setBig(true)} className="font-body btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>⤢ Ampliar</button>
        </div>
      </div>

      {editObj && <ObjetivoPesoEditor actual={actual} onClose={() => setEditObj(false)} />}

      <div style={{ display: 'flex', gap: 22, marginBottom: 8 }}>
        <div>
          <div className="font-body" style={{ color: T.dim, fontSize: 11 }}>Actual</div>
          <div className="font-display" style={{ color: T.text, fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>{actual ? fmt(actual, 2) + ' kg' : '—'}</div>
        </div>
        {hace30 !== null && (
          <div>
            <div className="font-body" style={{ color: T.dim, fontSize: 11 }}>Últimos 30 días</div>
            <div className="font-body" style={{ color: actual < hace30 ? '#A3E635' : actual > hace30 ? '#FBBF24' : T.muted, fontWeight: 800, fontSize: 16, marginTop: 6 }}>
              {(actual - hace30 > 0 ? '+' : '') + fmt(Math.round((actual - hace30) * 10) / 10) + ' kg'}
            </div>
          </div>
        )}
      </div>

      <PesoChartPanel big={false} st={st} setSt={setSt} />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <NumField forceEditable w={86} value={draft === '' ? null : draft} onChange={(v) => setDraft(v === null ? '' : v)} placeholder="kg" />
        <button onClick={() => { if (draft !== '' && !isNaN(draft)) { logPeso(parseFloat(draft)); setDraft(''); setSt({ range: st.range, monthIdx: null, selId: null }); } }} className="font-body btn btn-primary" style={{ flex: 1 }}>
          Registrar peso de hoy
        </button>
      </div>

      {bmi !== null && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(140,170,255,0.14)' }}>
          <div className="font-body" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ color: T.muted }}>IMC (kg/m²)</span>
            <span style={{ color: T.text, fontWeight: 800 }}>{bmi.toFixed(1)} · <span style={{ color: bmiCat.color }}>{bmiCat.label}</span></span>
          </div>
          <div className="font-body" style={{ color: T.dim, fontSize: 10.5, marginTop: 5, lineHeight: 1.5 }}>
            El IMC no distingue músculo de grasa — con tu nivel de entrenamiento es normal marcar "sobrepeso" sin que sea grasa de más.
          </div>
        </div>
      )}
      {big && (
        <Modal title="⚖️ Peso corporal" onClose={() => setBig(false)}>
          <Card><PesoChartPanel big st={st} setSt={setSt} /></Card>
        </Modal>
      )}
    </Card>
  );
}

/* ---------- Series efectivas por semana y músculo (solo el recuento) ---------- */

export function SeriesSemanalesCard() {
  const { state } = useGym();
  const totals = useMemo(() => weeklySets(state), [state.days, state.exercises]);
  const rows = CAT_IDS.map((k) => ({ key: k, ...CATS[k], sets: totals[k] || 0 }));
  const maxV = Math.max(10, ...rows.map((r) => r.sets)) * 1.08;
  const total = rows.reduce((acc, r) => acc + r.sets, 0);

  return (
    <Card style={{ marginBottom: 18 }}>
      <div className="font-body" style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
        Cada serie cuenta 1 y el calentamiento no cuenta. En rest-pause y dropset, cada tanda o descenso extra suma 0,5. Cada ejercicio cuenta solo para el músculo que le asignas.
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="font-body" style={{ color: T.dim, fontSize: 11 }}>Total semanal</div>
        <div className="font-display" style={{ color: T.text, fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{fmt(total)} series</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => (
          <div key={r.key}>
            <div className="font-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, marginBottom: 4 }}>
              <span style={{ color: T.text, fontWeight: 600 }}>{r.emoji} {r.label}</span>
              <span style={{ color: r.sets > 0 ? r.color : T.dim, fontWeight: 800 }}>{fmt(r.sets)}</span>
            </div>
            <Bar pct={(r.sets / maxV) * 100} color={r.color} height={10} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- Cuánto me falta para mis objetivos por músculo ---------- */

export function ObjetivosMusculoCard() {
  const { state } = useGym();
  const prog = useMemo(() => muscleProgress(state), [state.days, state.exercises]);
  const ignorados = CAT_IDS.reduce((a, k) => a + prog[k].ignorados, 0);
  return (
    <Card style={{ marginBottom: 18 }}>
      <div className="font-body" style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
        Para cada músculo: media de (tu mejor marca ÷ objetivo) de sus ejercicios, con tope del 100 %, y cuántos kg te faltan de media.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CAT_IDS.map((k) => {
          const p = prog[k];
          return (
            <div key={k}>
              <div className="font-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12.5, marginBottom: 4, gap: 8 }}>
                <span style={{ color: T.text, fontWeight: 600 }}>{catInfo(CATS, k).emoji} {catInfo(CATS, k).label}</span>
                {p.pct === null
                  ? <span style={{ color: T.dim, fontWeight: 600 }}>sin objetivos</span>
                  : <span style={{ color: catInfo(CATS, k).color, fontWeight: 800 }}>{Math.round(p.pct)} % <span style={{ color: T.muted, fontWeight: 600 }}>· faltan {p.falta > 0 ? fmt(p.falta) + ' kg' : '0 kg'}</span></span>}
              </div>
              {p.pct !== null && <Bar pct={p.pct} color={catInfo(CATS, k).color} height={10} />}
            </div>
          );
        })}
      </div>
      <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
        Los ejercicios sin objetivo numérico (como «Máquina entera» o «Maxearla») no se tienen en cuenta{ignorados ? ' (' + ignorados + ' ahora mismo)' : ''}.
      </div>
    </Card>
  );
}

/* ---------- Pestaña ---------- */

export function ProgresoTab() {
  const { state } = useGym();
  const allIds = useMemo(() => activeExerciseIds(state), [state.days, state.exercises]);
  const [selected, setSelected] = useState(allIds[0]);
  useEffect(() => { if ((!selected || allIds.indexOf(selected) === -1) && allIds.length) setSelected(allIds[0]); }, [allIds, selected]);

  const ex = allIds.indexOf(selected) !== -1 ? state.exercises[selected] : null;
  const chartData = useMemo(() => {
    if (!ex) return [];
    return (ex.history || []).map((h) => ({ label: fmtDateShort(h.date), y: h.sets && h.sets[0] ? h.sets[0].weight : null })).filter((p) => typeof p.y === 'number');
  }, [ex]);

  return (
    <div>
      <SectionTitle emoji="⚖️">Tu peso</SectionTitle>
      <PesoCard />

      <SectionTitle emoji="📊">Series efectivas por semana</SectionTitle>
      <SeriesSemanalesCard />

      <SectionTitle emoji="🎯">Cuánto me falta para mis objetivos</SectionTitle>
      <ObjetivosMusculoCard />

      <SectionTitle emoji="📈">Progreso por ejercicio</SectionTitle>
      {allIds.length === 0 ? (
        <Card style={{ marginBottom: 18 }}><div className="font-body" style={{ color: T.dim, fontSize: 13, textAlign: 'center', padding: '16px 10px' }}>No hay ejercicios en tu rutina.</div></Card>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <div className="gt-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
            {allIds.map((id) => (
              <Chip key={id} active={id === selected} onClick={() => setSelected(id)} accent={catInfo(CATS, state.exercises[id].cat).color}>{state.exercises[id].name}</Chip>
            ))}
          </div>
          <Card style={{ padding: '14px 6px 10px' }}>
            {ex && chartData.length >= 2 ? <LineChartSVG points={chartData} color={catInfo(CATS, ex.cat).color} height={200} /> : (
              <div className="font-body" style={{ color: T.dim, fontSize: 13, textAlign: 'center', padding: '30px 10px' }}>
                Aún no hay suficientes registros de <b style={{ color: T.muted }}>{ex ? ex.name : ''}</b>. Guarda tu registro de hoy en varios entrenamientos para ver la curva.
              </div>
            )}
          </Card>
        </div>
      )}

    </div>
  );
}
