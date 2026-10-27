import React, { useMemo, useState } from 'react';
import { LineChartSVG } from '../components/LineChart.jsx';
import { Card, Chip, Label, MiniBtn, Modal, NumInput, SectionTitle, SupRow, useGym } from '../components/ui.jsx';
import { T } from '../data/theme.js';
import { Native } from '../native/index.js';
import { MEDIDAS_TIPOS } from '../state/migrate.js';
import { addDays, fmt, fmtDateLong, fmtDateShort, fromYmd, monthLabel, ymd } from '../utils/format.js';
import { calendarioMes, logros, porSemana, rachaDias, rachaSemanas, resumenSemana, semanaDe, sesionesDe } from '../utils/entreno.js';
import { EditRecordModal, RANGOS } from './ProgresoTab.jsx';

/* =========================================================================
   PROGRESO (Fase 3): calendario de entrenamientos, cuerpo (pasos, sueño, energía, medidas, fotos) y logros
   ========================================================================= */

export const SECCIONES_PROGRESO = [['progreso', '📊 Progreso'], ['calendario', '📅 Calendario'], ['cuerpo', '📏 Cuerpo'], ['logros', '🏅 Logros']];
const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/* ---------- Calendario, rachas, volumen y resumen semanal ---------- */

function RachaCard({ sesiones }) {
  const { state } = useGym();
  const obj = (state.preferencias && state.preferencias.objetivoDiasSemana) || 3;
  const r = rachaSemanas(sesiones, obj, new Date());
  const dias = rachaDias(sesiones, new Date());
  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
        {[['🔥', r.actual, 'semanas seguidas'], ['📆', r.estaSemana + '/' + r.objetivo, 'días esta semana'], ['⚡', dias, 'días seguidos']].map((x, i) => (
          <div key={i}>
            <div style={{ fontSize: 20 }}>{x[0]}</div>
            <div className="font-display" style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{x[1]}</div>
            <div className="font-body" style={{ color: T.muted, fontSize: 11 }}>{x[2]}</div>
          </div>
        ))}
      </div>
      <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 10, lineHeight: 1.5, textAlign: 'center' }}>
        La racha cuenta las semanas seguidas en las que entrenas al menos {obj} día{obj === 1 ? '' : 's'} (lo cambias en Ajustes → Entreno). Mejor racha: {r.mejor} semana{r.mejor === 1 ? '' : 's'}.
      </div>
    </Card>
  );
}

export function CalendarioCard({ sesiones }) {
  const hoy = ymd(new Date());
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const [sel, setSel] = useState(null);
  const celdas = useMemo(() => calendarioMes(mes, sesiones), [mes, sesiones]);
  const cambiaMes = (d) => { const f = fromYmd(mes + '-01'); f.setMonth(f.getMonth() + d); setMes(ymd(f).slice(0, 7)); setSel(null); };
  const sesSel = sel ? sesiones.find((s) => s.fecha === sel) : null;
  const delMes = sesiones.filter((s) => s.fecha.slice(0, 7) === mes);
  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
        <MiniBtn title="Mes anterior" onClick={() => cambiaMes(-1)}>‹</MiniBtn>
        <span className="font-body" style={{ color: '#E7EAF8', fontSize: 13, fontWeight: 800, textTransform: 'capitalize', minWidth: 140, textAlign: 'center' }}>{monthLabel(mes)}</span>
        <MiniBtn title="Mes siguiente" disabled={mes >= hoy.slice(0, 7)} onClick={() => cambiaMes(1)}>›</MiniBtn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {DIAS_CORTOS.map((d) => <div key={d} className="font-body" style={{ textAlign: 'center', color: T.dim, fontSize: 10.5, fontWeight: 800 }}>{d}</div>)}
        {celdas.map((c) => (
          <button key={c.fecha} data-testid={'cal-' + c.fecha} onClick={() => setSel(c.sesion ? c.fecha : null)} className="font-body" style={{
            aspectRatio: '1 / 1', borderRadius: 9, cursor: c.sesion ? 'pointer' : 'default', fontSize: 12, fontWeight: 700, padding: 0,
            color: c.delMes ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
            background: c.sesion ? 'rgba(var(--ac-rgb),' + (0.2 + c.intensidad * 0.6).toFixed(2) + ')' : 'rgba(255,255,255,0.03)',
            border: c.fecha === hoy ? '1.5px solid #FFFFFF' : sel === c.fecha ? '1.5px solid ' + T.cyan : '1px solid rgba(140,170,255,0.12)',
          }}>{c.dia}</button>
        ))}
      </div>
      <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 8, textAlign: 'center' }}>
        {delMes.length} día{delMes.length === 1 ? '' : 's'} entrenados · {fmt(delMes.reduce((a, s) => a + s.volumen, 0), 0)} kg en el mes. Cuanto más intenso el color, más volumen. Toca un día para verlo.
      </div>
      {sesSel && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(140,170,255,0.14)' }}>
          <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13.5, textTransform: 'capitalize', marginBottom: 6 }}>{fmtDateLong(sesSel.fecha + 'T12:00:00')}</div>
          {sesSel.ejercicios.map((e) => (
            <SupRow key={e.id} label={e.nombre} value={fmt(e.volumen, 0) + ' kg'} />
          ))}
          <SupRow label={'Total · ' + fmt(sesSel.series, 1) + ' series efectivas'} value={fmt(sesSel.volumen, 0) + ' kg'} highlight />
        </div>
      )}
    </Card>
  );
}

function VolumenSemanasCard({ sesiones }) {
  const semanas = porSemana(sesiones);
  const lunesHoy = semanaDe(new Date());
  const filas = [];
  for (let i = 7; i >= 0; i--) { const k = ymd(addDays(fromYmd(lunesHoy), -7 * i)); filas.push({ k, ...(semanas[k] || { sesiones: 0, volumen: 0, series: 0 }) }); }
  const max = Math.max(1, ...filas.map((f) => f.volumen));
  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
        {filas.map((f) => (
          <div key={f.k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div className="font-body" style={{ color: T.muted, fontSize: 9.5, marginBottom: 3 }}>{f.volumen ? fmt(f.volumen / 1000, 1) + 't' : ''}</div>
            <div style={{ width: '100%', height: Math.max(3, (f.volumen / max) * 80) + 'px', borderRadius: 6, background: f.k === lunesHoy ? T.grad : 'rgba(var(--ac-rgb),0.45)' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {filas.map((f) => <div key={f.k} className="font-body" style={{ flex: 1, textAlign: 'center', color: T.dim, fontSize: 9.5 }}>{fmtDateShort(f.k + 'T12:00:00').replace('.', '')}</div>)}
      </div>
      <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 8, textAlign: 'center' }}>Volumen (kg levantados) de las últimas 8 semanas, de lunes a domingo. t = toneladas.</div>
    </Card>
  );
}

function compara(a, b, d) {
  if (a === null || a === undefined) return '—';
  const base = fmt(a, d);
  if (b === null || b === undefined || b === 0) return base;
  const dif = a - b;
  if (Math.abs(dif) < 1e-9) return base + ' (=)';
  return base + ' (' + (dif > 0 ? '+' : '') + fmt(dif, d) + ')';
}

export function ResumenSemanalCard() {
  const { state } = useGym();
  const lunes = semanaDe(new Date());
  const esta = resumenSemana(state, lunes);
  const ant = resumenSemana(state, ymd(addDays(fromYmd(lunes), -7)));
  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="font-body" style={{ color: T.dim, fontSize: 11, marginBottom: 6 }}>Desde el lunes {fmtDateShort(lunes + 'T12:00:00')} · entre paréntesis, la diferencia con la semana pasada</div>
      <SupRow label="🏋️ Días entrenados" value={compara(esta.sesiones, ant.sesiones, 0)} highlight />
      <SupRow label="📦 Volumen (kg)" value={compara(Math.round(esta.volumen), Math.round(ant.volumen), 0)} />
      <SupRow label="📊 Series efectivas" value={compara(esta.series, ant.series, 1)} />
      <SupRow label="🏆 Récords" value={compara(esta.records, ant.records, 0)} />
      <SupRow label="⚖️ Peso medio (kg)" value={compara(esta.pesoMedio, ant.pesoMedio, 1)} />
      <SupRow label="👟 Pasos de media" value={compara(esta.pasosMedios === null ? null : Math.round(esta.pasosMedios), ant.pasosMedios === null ? null : Math.round(ant.pasosMedios), 0)} />
      <SupRow label="😴 Sueño medio (1–5)" value={compara(esta.suenoMedio, ant.suenoMedio, 1)} />
      <SupRow label="⚡ Energía media (1–5)" value={compara(esta.energiaMedia, ant.energiaMedia, 1)} />
    </Card>
  );
}

export function CalendarioSec() {
  const { state } = useGym();
  const sesiones = useMemo(() => sesionesDe(state), [state.exercises]);
  return (
    <div>
      <SectionTitle emoji="🔥">Racha</SectionTitle>
      <RachaCard sesiones={sesiones} />
      <SectionTitle emoji="📅">Calendario de entrenamientos</SectionTitle>
      <CalendarioCard sesiones={sesiones} />
      <SectionTitle emoji="🗓️">Resumen de la semana</SectionTitle>
      <ResumenSemanalCard />
      <SectionTitle emoji="📦">Volumen por semana</SectionTitle>
      <VolumenSemanasCard sesiones={sesiones} />
      <div className="font-body" style={{ color: T.dim, fontSize: 11, textAlign: 'center', marginBottom: 18, lineHeight: 1.5 }}>
        Un día cuenta como entrenado cuando guardas el registro de algún ejercicio (botón "Guardar registro de hoy" o el modo en vivo).
      </div>
    </div>
  );
}

/* ---------- Cuerpo: pasos, sueño y energía del día; medidas; fotos de progreso ---------- */

function Escala({ valor, onChange, etiqueta, emojis }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Label>{etiqueta}</Label>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(valor === n ? null : n)} aria-label={etiqueta + ' ' + n} className="font-body" style={{
            flex: 1, height: 44, borderRadius: 12, cursor: 'pointer', fontSize: 18,
            border: '1.5px solid ' + (valor === n ? T.cyan : 'rgba(140,170,255,0.25)'), background: valor === n ? 'rgba(var(--ac-rgb),0.18)' : 'rgba(10,15,30,0.45)',
          }}>{emojis[n - 1]}<div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>{n}</div></button>
        ))}
      </div>
    </div>
  );
}

export function HoyCard() {
  const { state, setRegistroDia } = useGym();
  const hoy = ymd(new Date());
  const [fecha, setFecha] = useState(hoy);
  const r = (state.registro || {})[fecha] || {};
  const objetivo = (state.formulario && state.formulario.objetivoPasosDiarios) || 10000;
  const pct = r.pasos ? Math.min(100, (r.pasos / objetivo) * 100) : 0;
  const ultimos = [];
  for (let i = 6; i >= 0; i--) { const k = ymd(addDays(fromYmd(hoy), -i)); ultimos.push({ k, ...((state.registro || {})[k] || {}) }); }
  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
        <MiniBtn title="Día anterior" onClick={() => setFecha(ymd(addDays(fromYmd(fecha), -1)))}>‹</MiniBtn>
        <span className="font-body" style={{ color: '#E7EAF8', fontSize: 13, fontWeight: 800, textTransform: 'capitalize', minWidth: 160, textAlign: 'center' }}>{fecha === hoy ? 'Hoy · ' : ''}{fmtDateLong(fecha + 'T12:00:00')}</span>
        <MiniBtn title="Día siguiente" disabled={fecha >= hoy} onClick={() => setFecha(ymd(addDays(fromYmd(fecha), 1)))}>›</MiniBtn>
      </div>
      <Label>👟 Pasos (apúntalos tú: la app no cuenta pasos)</Label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
        <div style={{ width: 130 }}><NumInput value={r.pasos === undefined ? null : r.pasos} onChange={(v) => setRegistroDia(fecha, { pasos: v === null ? null : Math.max(0, Math.round(v)) })} placeholder="pasos" className="font-body inp" /></div>
        <div className="font-body" style={{ color: T.muted, fontSize: 12 }}>Objetivo: {fmt(objetivo, 0)}<br /><span style={{ color: pct >= 100 ? '#A3E635' : T.dim }}>{r.pasos ? Math.round(pct) + ' %' + (pct >= 100 ? ' ✓' : '') : '—'}</span></div>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ width: pct + '%', height: '100%', background: pct >= 100 ? '#A3E635' : T.grad }} />
      </div>
      <Escala etiqueta="😴 Sueño (1 = fatal, 5 = genial)" valor={r.sueno || null} emojis={['😫', '😪', '😐', '🙂', '😴']} onChange={(v) => setRegistroDia(fecha, { sueno: v })} />
      <Escala etiqueta="⚡ Energía (1 = sin fuerzas, 5 = a tope)" valor={r.energia || null} emojis={['🪫', '😮‍💨', '😐', '💪', '⚡']} onChange={(v) => setRegistroDia(fecha, { energia: v })} />
      <div className="font-body" style={{ color: T.dim, fontSize: 11, marginBottom: 6 }}>Últimos 7 días</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(7, 1fr)', gap: 4, alignItems: 'center' }}>
        <span />
        {ultimos.map((u) => <span key={u.k} className="font-body" style={{ textAlign: 'center', color: T.dim, fontSize: 10 }}>{DIAS_CORTOS[(fromYmd(u.k).getDay() + 6) % 7]}</span>)}
        {[['👟', 'pasos', (v) => (v ? fmt(v / 1000, 1) + 'k' : '·')], ['😴', 'sueno', (v) => v || '·'], ['⚡', 'energia', (v) => v || '·']].map((f) => (
          <React.Fragment key={f[1]}>
            <span style={{ fontSize: 13 }}>{f[0]}</span>
            {ultimos.map((u) => <span key={u.k} className="font-body" style={{ textAlign: 'center', color: T.text, fontSize: 11.5, fontWeight: 700 }}>{f[2](u[f[1]])}</span>)}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}

export const MEDIDAS_INFO = {
  cintura: ['Cintura', 'cm'], cadera: ['Cadera', 'cm'], pecho: ['Pecho', 'cm'], brazo: ['Brazo', 'cm'],
  muslo: ['Muslo', 'cm'], gemelo: ['Gemelo', 'cm'], cuello: ['Cuello', 'cm'], grasa: ['% de grasa', '%'],
};

export function MedidasCard() {
  const { state, addMedida, editMedida, delMedida, askConfirm } = useGym();
  const [tipo, setTipo] = useState('cintura');
  const [valor, setValor] = useState(null);
  const [rango, setRango] = useState('todo');
  const [selId, setSelId] = useState(null);
  const [editando, setEditando] = useState(null);
  const info = MEDIDAS_INFO[tipo];
  const todas = ((state.medidas && state.medidas.historial) || []).filter((m) => m.tipo === tipo).sort((a, b) => new Date(a.date) - new Date(b.date));
  const corte = rango === 'todo' ? 0 : rango === 'mes' ? Date.now() - 31 * 86400000 : Date.now() - (rango === '3m' ? 92 : 183) * 86400000;
  const lista = todas.filter((m) => new Date(m.date).getTime() >= corte);
  const sel = lista.find((m) => m.id === selId) || null;
  const dif = lista.length >= 2 ? lista[lista.length - 1].valor - lista[0].valor : null;
  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="gt-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 10 }}>
        {MEDIDAS_TIPOS.map((k) => <Chip key={k} active={tipo === k} onClick={() => { setTipo(k); setSelId(null); }} style={{ padding: '6px 12px', fontSize: 12 }}>{MEDIDAS_INFO[k][0]}</Chip>)}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 110 }}><NumInput value={valor} onChange={setValor} placeholder={info[1]} className="font-body inp" /></div>
        <button disabled={valor === null || !(valor > 0)} onClick={() => { addMedida(tipo, valor); setValor(null); }} className="font-body btn btn-primary" style={{ flex: 1 }}>Apuntar {info[0].toLowerCase()} de hoy</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {RANGOS.map((r) => <Chip key={r[0]} active={rango === r[0]} onClick={() => { setRango(r[0]); setSelId(null); }} style={{ padding: '5px 10px', fontSize: 11.5 }}>{r[1]}</Chip>)}
      </div>
      {lista.length >= 2
        ? <LineChartSVG points={lista.map((m) => ({ label: fmtDateShort(m.date), y: m.valor }))} height={180} selectedIndex={sel ? lista.indexOf(sel) : null} onPointClick={(i) => setSelId(lista[i].id)} />
        : <div className="font-body" style={{ color: T.dim, fontSize: 12, textAlign: 'center', padding: '18px 10px' }}>{lista.length === 1 ? 'Una medida apuntada (' + fmt(lista[0].valor) + ' ' + info[1] + '). Con dos o más verás la gráfica.' : 'Aún no hay medidas de ' + info[0].toLowerCase() + ' en este periodo.'}</div>}
      {lista.length >= 2 && !sel && <div className="font-body" style={{ color: T.dim, fontSize: 11, textAlign: 'center', marginTop: 4 }}>Toca un punto para editarlo o borrarlo</div>}
      {lista.length === 1 && !sel && <button onClick={() => setSelId(lista[0].id)} className="font-body btn btn-ghost" style={{ width: '100%', fontSize: 12 }}>✏️ Editar o borrar</button>}
      {sel && (
        <div className="card" style={{ marginTop: 8, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>{fmt(sel.valor) + ' ' + info[1]}</div>
            <div className="font-body" style={{ color: T.muted, fontSize: 11.5, textTransform: 'capitalize' }}>{fmtDateLong(sel.date)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setEditando({ id: sel.id, valor: sel.valor, date: sel.date })} className="font-body btn btn-ghost" style={{ padding: '7px 10px', fontSize: 12 }}>✏️ Editar</button>
            <button onClick={() => askConfirm({ title: '¿Borrar esta medida?', text: info[0] + ': ' + fmt(sel.valor) + ' ' + info[1], confirmLabel: 'Borrar', onConfirm: () => { delMedida(sel.id); setSelId(null); } })} className="font-body btn btn-danger" style={{ padding: '7px 10px', fontSize: 12 }}>🗑️</button>
          </div>
        </div>
      )}
      {dif !== null && <SupRow label={'Cambio en el periodo (' + info[0].toLowerCase() + ')'} value={(dif > 0 ? '+' : '') + fmt(dif) + ' ' + info[1]} highlight />}
      {editando && <EditRecordModal rec={editando} title={'Editar ' + info[0].toLowerCase()} unit={info[1]} onSave={(v, f) => editMedida(editando.id, v, f)} onClose={() => setEditando(null)} />}
    </Card>
  );
}

// Comparador antes / después: las dos fotos superpuestas, con una barra para deslizar
function Comparador({ antes, despues, srcDe }) {
  const [pos, setPos] = useState(50);
  return (
    <div>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 4', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
        <img src={srcDe(despues)} alt="Después" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, clipPath: 'inset(0 ' + (100 - pos) + '% 0 0)' }}>
          <img src={srcDe(antes)} alt="Antes" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: pos + '%', width: 2, background: '#FFFFFF', boxShadow: '0 0 8px rgba(0,0,0,0.8)' }} />
        <span className="font-body" style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8 }}>Antes · {fmtDateShort(antes.date)}</span>
        <span className="font-body" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8 }}>Después · {fmtDateShort(despues.date)}</span>
      </div>
      <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Deslizar entre antes y después" style={{ width: '100%', marginTop: 10, accentColor: T.cyan }} />
    </div>
  );
}

export function FotosProgresoCard() {
  const { state, fotos, addFotoProgreso, delFotoProgreso, askConfirm, showToast } = useGym();
  const [ocupado, setOcupado] = useState(false);
  const [nota, setNota] = useState('');
  const [antesId, setAntesId] = useState(null);
  const [despuesId, setDespuesId] = useState(null);
  const [ver, setVer] = useState(null);
  const lista = (state.fotosProgreso || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date)).filter((f) => fotos && fotos['prog_' + f.id]);
  const srcDe = (f) => Native.photoSrc(fotos['prog_' + f.id]);
  const antes = lista.find((f) => f.id === antesId) || lista[0];
  const despues = lista.find((f) => f.id === despuesId) || lista[lista.length - 1];
  const nueva = async (origen) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      // Las fotos de progreso se guardan algo más grandes que las de los ejercicios (900 px) para poder compararlas
      const url = await Native.pickPhoto(origen, 900, 0.72);
      if (url && await addFotoProgreso(url, nota.trim())) setNota('');
    } catch (e) { showToast('No se pudo abrir la ' + (origen === 'camara' ? 'cámara' : 'galería') + '.', 'warn'); } finally { setOcupado(false); }
  };
  return (
    <Card style={{ marginBottom: 14 }}>
      <input type="text" maxLength={60} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota opcional (ej. en ayunas, 82 kg)" className="font-body inp" style={{ fontSize: 13, marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button disabled={ocupado} onClick={() => nueva('camara')} className="font-body btn btn-primary" style={{ flex: 1, fontSize: 12.5 }}>📷 Hacer foto</button>
        <button disabled={ocupado} onClick={() => nueva('galeria')} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>🖼️ De la galería</button>
      </div>
      {lista.length >= 2 && antes && despues && (
        <div style={{ marginBottom: 12 }}>
          <Comparador antes={antes} despues={despues} srcDe={srcDe} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <label className="font-body" style={{ flex: 1, color: T.muted, fontSize: 11 }}>Antes
              <select value={antes.id} onChange={(e) => setAntesId(e.target.value)} className="font-body inp" style={{ fontSize: 12, padding: '6px 8px' }}>
                {lista.map((f) => <option key={f.id} value={f.id}>{fmtDateShort(f.date)}{f.nota ? ' · ' + f.nota : ''}</option>)}
              </select>
            </label>
            <label className="font-body" style={{ flex: 1, color: T.muted, fontSize: 11 }}>Después
              <select value={despues.id} onChange={(e) => setDespuesId(e.target.value)} className="font-body inp" style={{ fontSize: 12, padding: '6px 8px' }}>
                {lista.map((f) => <option key={f.id} value={f.id}>{fmtDateShort(f.date)}{f.nota ? ' · ' + f.nota : ''}</option>)}
              </select>
            </label>
          </div>
        </div>
      )}
      {lista.length === 0 && <div className="font-body" style={{ color: T.dim, fontSize: 12, textAlign: 'center', padding: '10px 6px' }}>Haz una foto cada 2–4 semanas, con la misma luz y la misma postura, para comparar.</div>}
      {lista.length === 1 && <div className="font-body" style={{ color: T.dim, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>Con dos fotos o más aparece el comparador antes / después.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {lista.slice().reverse().map((f) => (
          <button key={f.id} onClick={() => setVer(f)} style={{ padding: 0, border: '1px solid rgba(140,170,255,0.25)', borderRadius: 10, overflow: 'hidden', aspectRatio: '3 / 4', background: '#000', cursor: 'pointer', position: 'relative' }}>
            <img src={srcDe(f)} alt={'Foto del ' + fmtDateShort(f.date)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span className="font-body" style={{ position: 'absolute', bottom: 2, left: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9.5, borderRadius: 6 }}>{fmtDateShort(f.date)}</span>
          </button>
        ))}
      </div>
      {ver && (
        <Modal title={'📸 ' + fmtDateShort(ver.date)} onClose={() => setVer(null)}>
          <img src={srcDe(ver)} alt="" style={{ width: '100%', borderRadius: 14 }} />
          {ver.nota && <div className="font-body" style={{ color: T.muted, fontSize: 13, marginTop: 8 }}>{ver.nota}</div>}
          <button onClick={() => askConfirm({ title: '¿Borrar esta foto?', text: 'Se borrará la foto del ' + fmtDateLong(ver.date) + '.', confirmLabel: 'Borrar', onConfirm: () => { delFotoProgreso(ver.id); setVer(null); } })} className="font-body btn btn-danger" style={{ width: '100%', marginTop: 12 }}>🗑️ Borrar foto</button>
        </Modal>
      )}
    </Card>
  );
}

export function CuerpoSec() {
  return (
    <div>
      <SectionTitle emoji="📝">Tu día</SectionTitle>
      <HoyCard />
      <SectionTitle emoji="📏">Medidas corporales</SectionTitle>
      <MedidasCard />
      <SectionTitle emoji="📸">Fotos de progreso</SectionTitle>
      <FotosProgresoCard />
    </div>
  );
}

/* ---------- Logros ---------- */

export function LogrosSec() {
  const { state } = useGym();
  const L = useMemo(() => logros(state, new Date()), [state]);
  const hechos = L.filter((l) => l.conseguido).length;
  return (
    <div>
      <SectionTitle emoji="🏅">Logros ({hechos}/{L.length})</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
        {L.map((l) => (
          <div key={l.id} data-testid={'logro-' + l.id} className="card" style={{ padding: 12, opacity: l.conseguido ? 1 : 0.62, borderColor: l.conseguido ? 'rgba(251,191,36,0.55)' : undefined }}>
            <div style={{ fontSize: 24, filter: l.conseguido ? 'none' : 'grayscale(1)' }}>{l.emoji}</div>
            <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13, marginTop: 4 }}>{l.titulo}{l.conseguido ? ' ✓' : ''}</div>
            <div className="font-body" style={{ color: T.muted, fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{l.desc}</div>
            {!l.conseguido && (
              <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: Math.round(l.progreso * 100) + '%', height: '100%', background: T.grad }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
