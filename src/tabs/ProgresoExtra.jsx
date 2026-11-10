import React, { useMemo, useState } from 'react';
import { LineChartSVG } from '../components/LineChart.jsx';
import { Card, Chip, Label, MiniBtn, NumInput, SectionTitle, SupRow, useGym } from '../components/ui.jsx';
import { T } from '../data/theme.js';
import { ZONAS_DEFECTO, UNIDADES_MEDIDA, validarNombreZona } from '../utils/medidasZonas.js';
import { fmt, fmtDateLong, fmtDateShort, fromYmd, monthLabel, ymd } from '../utils/format.js';
import { fechasHechasCardio } from '../utils/cardio.js';
import { LEYENDA_DIA, calendarioMes, comboDelDia, logros, rachaDias, rachaSemanas, sesionesDe } from '../utils/entreno.js';
import { EditRecordModal, RANGOS } from './ProgresoTab.jsx';

/* =========================================================================
   PROGRESO (Fase 3): calendario de entrenamientos, cuerpo (pasos, sueño, energía, medidas, fotos) y logros
   ========================================================================= */

// Apartados de Progreso, por debajo del peso, la racha y el resumen (Logros el último)
export const SECCIONES_PROGRESO = [['analisis', '📈 Análisis'], ['cuerpo', '📏 Cuerpo'], ['logros', '🏅 Logros']];
const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/* ---------- Racha y calendario ---------- */

export function RachaCard({ sesiones }) {
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

export function CalendarioCard({ sesiones, cardioFechas = {}, entrenoFechas = {}, movilidadFechas = {} }) {
  const hoy = ymd(new Date());
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const [sel, setSel] = useState(null);
  const celdas = useMemo(() => calendarioMes(mes, sesiones, cardioFechas, { entrenoFechas, movilidadFechas }), [mes, sesiones, cardioFechas, entrenoFechas, movilidadFechas]);
  const cambiaMes = (d) => { const f = fromYmd(mes + '-01'); f.setMonth(f.getMonth() + d); setMes(ymd(f).slice(0, 7)); setSel(null); };
  const delMes = celdas.filter((c) => c.delMes);
  const cuenta = (k) => delMes.filter((c) => c[k]).length;
  const completos = delMes.filter((c) => c.entreno && c.cardio && c.movilidad).length;
  const celSel = sel ? celdas.find((c) => c.fecha === sel) : null;
  const comboSel = celSel ? comboDelDia(celSel) : null;
  const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
        <MiniBtn title="Mes anterior" onClick={() => cambiaMes(-1)}>‹</MiniBtn>
        <span className="font-body" style={{ color: '#E7EAF8', fontSize: 13, fontWeight: 800, textTransform: 'capitalize', minWidth: 140, textAlign: 'center' }}>{monthLabel(mes)}</span>
        <MiniBtn title="Mes siguiente" disabled={mes >= hoy.slice(0, 7)} onClick={() => cambiaMes(1)}>›</MiniBtn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {DIAS_CORTOS.map((d) => <div key={d} className="font-body" style={{ textAlign: 'center', color: T.dim, fontSize: 10.5, fontWeight: 800 }}>{d}</div>)}
        {celdas.map((c) => {
          const combo = comboDelDia(c);
          return (
            <button key={c.fecha} data-testid={'cal-' + c.fecha} data-combo={combo ? combo.k : ''} title={combo ? combo.label : ''}
              onClick={() => setSel(combo && sel !== c.fecha ? c.fecha : null)} className="font-body" style={{
                position: 'relative', aspectRatio: '1 / 1', borderRadius: 9, cursor: combo ? 'pointer' : 'default', fontSize: 12, fontWeight: 800, padding: 0,
                color: !c.delMes ? 'rgba(255,255,255,0.25)' : combo ? combo.fg : '#FFFFFF',
                background: combo ? combo.bg : 'rgba(255,255,255,0.03)',
                opacity: c.delMes ? 1 : 0.45,
                border: c.fecha === hoy ? '1.5px solid #FFFFFF' : sel === c.fecha ? '1.5px solid ' + T.cyan : '1px solid rgba(140,170,255,0.12)',
              }}>
              {c.dia}
              {combo && combo.fuerte && <span aria-hidden="true" style={{ position: 'absolute', right: 2, top: 0, fontSize: 9, fontWeight: 900 }}>✓</span>}
            </button>
          );
        })}
      </div>
      <div data-testid="cal-leyenda" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px', marginTop: 10 }}>
        {LEYENDA_DIA.map((x) => (
          <div key={x.label} className="font-body" style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.muted, fontSize: 11 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: x.bg, flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }} />{x.label}
          </div>
        ))}
      </div>
      <div className="font-body" data-testid="cal-resumen" style={{ color: T.dim, fontSize: 11, marginTop: 8, textAlign: 'center', lineHeight: 1.5 }}>
        Este mes: {plural(cuenta('entreno'), 'día', 'días')} de entreno · {cuenta('cardio')} de cardio · {cuenta('movilidad')} de movilidad{completos ? ' · ' + plural(completos, 'día completo', 'días completos') + ' ✓' : ''}. Toca un día para verlo.
      </div>
      {celSel && comboSel && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(140,170,255,0.14)' }}>
          <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13.5, textTransform: 'capitalize', marginBottom: 2 }}>{fmtDateLong(celSel.fecha + 'T12:00:00')}</div>
          <div className="font-body" style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>{comboSel.label}</div>
          {celSel.sesion && celSel.sesion.ejercicios.map((e) => (
            <SupRow key={e.id} label={e.nombre} value={fmt(e.volumen, 0) + ' kg'} />
          ))}
          {celSel.sesion && <SupRow label={'Total · ' + fmt(celSel.sesion.series, 1) + ' series efectivas'} value={fmt(celSel.sesion.volumen, 0) + ' kg'} highlight />}
        </div>
      )}
    </Card>
  );
}

const aFechas = (lista) => { const o = {}; (lista || []).forEach((f) => { o[f] = true; }); return o; };

export function CalendarioSec() {
  const { state } = useGym();
  const sesiones = useMemo(() => sesionesDe(state), [state.exercises]);
  const cardioFechas = useMemo(() => fechasHechasCardio(state.cardio), [state.cardio]);
  const entrenoFechas = useMemo(() => aFechas(Object.keys(state.entrenosHechos || {})), [state.entrenosHechos]);
  const movilidadFechas = useMemo(() => aFechas(state.extras && state.extras.movilidad && state.extras.movilidad.hechos), [state.extras]);
  return (
    <div>
      <SectionTitle emoji="📅">Calendario</SectionTitle>
      <CalendarioCard sesiones={sesiones} cardioFechas={cardioFechas} entrenoFechas={entrenoFechas} movilidadFechas={movilidadFechas} />
    </div>
  );
}

/* ---------- Cuerpo: medidas corporales ---------- */

function GestorZonas({ zonas }) {
  const { addZonaMedida, renombrarZonaMedida, quitarZonaMedida, askConfirm, showToast } = useGym();
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('cm');
  const crear = () => {
    const v = validarNombreZona(nombre, zonas);
    if (!v.ok) { showToast(v.error, 'warn'); return; }
    addZonaMedida(v.nombre, unidad);
    setNombre('');
  };
  return (
    <div style={{ marginBottom: 12, padding: 10, borderRadius: 12, border: '1px solid rgba(140,170,255,0.18)' }}>
      <Label>Nueva zona</Label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input type="text" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="ej. Antebrazo" aria-label="Nombre de la zona nueva" className="font-body inp" style={{ fontSize: 13, flex: 1 }} />
        <select aria-label="Unidad de la zona nueva" value={unidad} onChange={(e) => setUnidad(e.target.value)} className="font-body inp" style={{ fontSize: 12.5, width: 70 }}>
          {UNIDADES_MEDIDA.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <button onClick={crear} className="font-body btn btn-primary" style={{ width: '100%', marginBottom: 10, fontSize: 12.5 }}>＋ Añadir zona</button>
      {zonas.map((z) => (
        <div key={z.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <input type="text" maxLength={40} defaultValue={z.label} aria-label={'Nombre de ' + z.label}
            onBlur={(e) => { const n = e.target.value.trim(); if (!n || n === z.label) { e.target.value = z.label; return; } const others = zonas.filter((x) => x.id !== z.id); const v = validarNombreZona(n, others); if (!v.ok) { showToast(v.error, 'warn'); e.target.value = z.label; return; } renombrarZonaMedida(z.id, v.nombre, z.unidad); }}
            className="font-body inp" style={{ fontSize: 12.5, flex: 1 }} />
          <select aria-label={'Unidad de ' + z.label} value={z.unidad} onChange={(e) => renombrarZonaMedida(z.id, z.label, e.target.value)} className="font-body inp" style={{ fontSize: 12, width: 66 }}>
            {UNIDADES_MEDIDA.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <MiniBtn title={'Quitar ' + z.label} onClick={() => askConfirm({ title: '¿Quitar "' + z.label + '"?', text: 'Se quita la zona y todas sus medidas. Lo puedes deshacer con ↩ Deshacer durante unos segundos.', confirmLabel: 'Quitar', onConfirm: () => quitarZonaMedida(z.id) })}>🗑</MiniBtn>
        </div>
      ))}
    </div>
  );
}

export function MedidasCard() {
  const { state, addMedida, editMedida, delMedida, askConfirm } = useGym();
  const zonas = (state.medidas && state.medidas.zonas) || ZONAS_DEFECTO;
  const [gestor, setGestor] = useState(false);
  const [tipo, setTipo] = useState('cintura');
  const [valor, setValor] = useState(null);
  const [rango, setRango] = useState('todo');
  const [selId, setSelId] = useState(null);
  const [editando, setEditando] = useState(null);
  const zonaSel = zonas.find((z) => z.id === tipo) || zonas[0] || { id: 'cintura', label: 'Cintura', unidad: 'cm' };
  const info = [zonaSel.label, zonaSel.unidad];
  const todas = ((state.medidas && state.medidas.historial) || []).filter((m) => m.tipo === tipo).sort((a, b) => new Date(a.date) - new Date(b.date));
  const corte = rango === 'todo' ? 0 : rango === 'mes' ? Date.now() - 31 * 86400000 : Date.now() - (rango === '3m' ? 92 : 183) * 86400000;
  const lista = todas.filter((m) => new Date(m.date).getTime() >= corte);
  const sel = lista.find((m) => m.id === selId) || null;
  const dif = lista.length >= 2 ? lista[lista.length - 1].valor - lista[0].valor : null;
  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="gt-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 10 }}>
        {zonas.map((z) => <Chip key={z.id} active={tipo === z.id} onClick={() => { setTipo(z.id); setSelId(null); }} style={{ padding: '6px 12px', fontSize: 12 }}>{z.label}</Chip>)}
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
      <button onClick={() => setGestor(!gestor)} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 10, fontSize: 12 }}>{gestor ? '▴ Cerrar zonas' : '⚙️ Añadir, renombrar o quitar zonas'}</button>
      {gestor && <div style={{ marginTop: 10 }}><GestorZonas zonas={zonas} /></div>}
    </Card>
  );
}

// Comparador antes / después: las dos fotos superpuestas, con una barra para deslizar
export function CuerpoSec() {
  return (
    <div>
      <SectionTitle emoji="📏">Medidas corporales</SectionTitle>
      <MedidasCard />
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
