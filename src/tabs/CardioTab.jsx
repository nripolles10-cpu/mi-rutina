import React, { useState } from 'react';
import { Card, EditLockBar, Label, SectionTitle, TextField, useGym } from '../components/ui.jsx';
import { CardioPresetsModal } from '../components/Herramientas.jsx';
import { T } from '../data/theme.js';
import { Native } from '../native/index.js';
import { alternarHoy, DIAS_CORTOS, DIAS_LARGOS, diasDe, hechoHoy, modoDe, semanaDe, tocaHoy, toggleDia, vecesDe } from '../utils/cardio.js';

const botonModo = (on) => ({
  flex: 1, height: 36, borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 12.5,
  border: '1.5px solid ' + (on ? T.cyan : 'rgba(140,170,255,0.25)'), background: on ? 'rgba(var(--ac-rgb),0.22)' : 'rgba(10,15,30,0.45)', color: on ? T.text : T.muted,
});

// Elegir cómo se lleva el cardio: días concretos de la semana o cuántos días a la semana
function ModoCardio({ c, onChange }) {
  const modo = modoDe(c);
  const veces = vecesDe(c);
  return (
    <div>
      <Label>¿Cómo lo quieres llevar?</Label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button type="button" className="font-body" aria-pressed={modo === 'dias'} onClick={() => onChange({ modo: 'dias' })} style={botonModo(modo === 'dias')}>📅 Días concretos</button>
        <button type="button" className="font-body" aria-pressed={modo === 'veces'} onClick={() => onChange({ modo: 'veces', veces: veces || 3 })} style={botonModo(modo === 'veces')}>🔢 Cuántos días a la semana</button>
      </div>
      {modo === 'dias' ? (
        <DiasCardio c={c} onChange={(dias) => onChange({ dias })} />
      ) : (
        <div>
          <Label>¿Cuántos días a la semana?</Label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} type="button" onClick={() => onChange({ modo: 'veces', veces: n })} aria-pressed={n === veces} aria-label={n + (n === 1 ? ' día' : ' días') + ' a la semana'} className="font-body"
                style={{ flex: 1, height: 38, borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 13,
                  border: '1.5px solid ' + (n === veces ? T.cyan : 'rgba(140,170,255,0.25)'), background: n === veces ? 'rgba(var(--ac-rgb),0.22)' : 'rgba(10,15,30,0.45)', color: n === veces ? T.text : T.muted }}>{n}</button>
            ))}
          </div>
          <div className="font-body" style={{ color: T.dim, fontSize: 11 }}>{veces ? veces + (veces === 1 ? ' día' : ' días') + ' a la semana, el día que te venga bien.' : 'Elige cuántos días a la semana.'}</div>
        </div>
      )}
    </div>
  );
}

function DiasCardio({ c, onChange }) {
  const dias = diasDe(c);
  return (
    <div>
      <Label>¿Qué días lo haces?</Label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {DIAS_CORTOS.map((letra, i) => {
          const dia = i + 1;
          const on = dias.indexOf(dia) !== -1;
          return (
            <button key={dia} type="button" onClick={() => onChange(toggleDia(c, dia))} aria-pressed={on} aria-label={DIAS_LARGOS[i]} className="font-body"
              style={{ flex: 1, height: 38, borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 13,
                border: '1.5px solid ' + (on ? T.cyan : 'rgba(140,170,255,0.25)'), background: on ? 'rgba(var(--ac-rgb),0.22)' : 'rgba(10,15,30,0.45)', color: on ? T.text : T.muted }}>{letra}</button>
          );
        })}
      </div>
      <div className="font-body" style={{ color: T.dim, fontSize: 11 }}>{dias.length ? dias.length + ' días a la semana' : 'Elige los días; así llevas la cuenta.'}</div>
    </div>
  );
}

function Cumplir({ c, onChange, showToast }) {
  const hoy = new Date();
  const toca = tocaHoy(c, hoy);
  const hecho = hechoHoy(c, hoy);
  const sem = semanaDe(c, hoy);
  const pct = sem.previstos ? Math.min(100, (sem.hechas / sem.previstos) * 100) : 0;
  const marcar = () => {
    onChange({ hechos: alternarHoy(c, hoy) });
    if (!hecho) { Native.vibrate(40); showToast(sem.hechas + 1 >= sem.previstos ? '🏆 ¡Semana de cardio cumplida!' : '✓ Cardio cumplido hoy 💪'); }
  };
  if (!sem.previstos) return null;
  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: sem.cumplida ? 'rgba(163,230,53,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (sem.cumplida ? 'rgba(163,230,53,0.5)' : 'rgba(140,170,255,0.18)') }}>
      <div className="font-body" style={{ display: 'flex', justifyContent: 'space-between', color: T.text, fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
        <span>Esta semana</span>
        <span style={{ color: sem.cumplida ? '#A3E635' : T.cyan }}>{sem.hechas} de {sem.previstos} {sem.cumplida ? '✓' : ''}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: pct + '%', height: '100%', background: sem.cumplida ? '#A3E635' : T.cyan, transition: 'width .3s' }} />
      </div>
      <button onClick={marcar} className={'font-body btn ' + (hecho ? 'btn-ghost' : 'btn-primary')} style={{ width: '100%' }} aria-pressed={hecho}>
        {hecho ? '✓ Cumplido hoy · deshacer' : '✅ He hecho el cardio de hoy'}
      </button>
      {!toca && !hecho && (
        <div className="font-body" style={{ color: T.dim, fontSize: 11.5, textAlign: 'center', marginTop: 6 }}>Hoy no te tocaba. Si lo has hecho igualmente, márcalo.</div>
      )}
    </div>
  );
}

// Una tarjeta de cardio: por defecto solo nombre, descripción y cumplimiento de la semana.
// Al pulsar "Editar" aparecen los días, la frecuencia y el resto de ajustes.
function CardioItem({ c, editMode, updateCardio, askConfirm, removeCardio, showToast }) {
  const [editando, setEditando] = useState(false);
  return (
    <Card style={{ marginBottom: 10 }}>
      <div className="fila-cardio" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>🏃 {c.name}</div>
        <button onClick={() => setEditando(!editando)} className="font-body btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} aria-expanded={editando}>
          {editando ? '✓ Listo' : '✏️ Editar'}
        </button>
      </div>
      {!editando && (
        <>
          <div className="font-body" style={{ color: T.muted, fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>{c.detalle || 'Sin descripción. Toca Editar para añadirla.'}</div>
          <Cumplir c={c} showToast={showToast} onChange={(p) => updateCardio(c.id, p)} />
        </>
      )}
      {editando && (
        <>
          {editMode && (
            <>
              <Label>Nombre</Label>
              <TextField value={c.name} onChange={(v) => updateCardio(c.id, { name: v }, 'cardio:' + c.id + ':name')} placeholder="ej. Cinta" />
            </>
          )}
          <Label style={{ marginTop: editMode ? 10 : 0 }}>Frecuencia</Label>
          <TextField value={c.frecuencia} onChange={(v) => updateCardio(c.id, { frecuencia: v }, 'cardio:' + c.id + ':frec')} placeholder="ej. 3 días / semana" />
          <Label style={{ marginTop: 10 }}>Descripción</Label>
          <TextField multiline value={c.detalle} onChange={(v) => updateCardio(c.id, { detalle: v }, 'cardio:' + c.id + ':det')} placeholder="ej. 20 min · inclinación 12 · velocidad 4,5" rows={2} />
          <div style={{ marginTop: 12 }}>
            <ModoCardio c={c} onChange={(p) => updateCardio(c.id, p, 'cardio:' + c.id + ':modo')} />
          </div>
          {editMode && (
            <button onClick={() => askConfirm({ title: '¿Quitar este cardio?', text: 'Se quitará "' + c.name + '".', confirmLabel: 'Quitar', onConfirm: () => removeCardio(c.id) })}
              className="font-body btn btn-danger" style={{ width: '100%', marginTop: 12, fontSize: 12.5 }}>🗑️ Quitar este cardio</button>
          )}
        </>
      )}
    </Card>
  );
}

export function CardioTab() {
  const { state, updateCardio, addCardio, removeCardio, askConfirm, showToast } = useGym();
  const editMode = state.meta.editMode;
  const [tipos, setTipos] = useState(false);
  return (
    <div>
      <EditLockBar />
      <SectionTitle emoji="🏃">Cardio</SectionTitle>
      <button onClick={() => setTipos(true)} className="font-body btn btn-primary" style={{ width: '100%', marginBottom: 12, padding: 12 }}>🏃 Elegir tipo de cardio</button>
      {tipos && <CardioPresetsModal onClose={() => setTipos(false)} />}
      {state.cardio.length === 0 && (
        <Card style={{ marginBottom: 10 }}><p className="font-body" style={{ color: T.muted, fontSize: 13, textAlign: 'center', margin: 0 }}>No tienes cardio apuntado.{editMode ? '' : ' Desbloquea la edición para añadirlo.'}</p></Card>
      )}
      {state.cardio.map((c) => (
        <CardioItem key={c.id} c={c} editMode={editMode} updateCardio={updateCardio} askConfirm={askConfirm} removeCardio={removeCardio} showToast={showToast} />
      ))}
      {editMode && (
        <button onClick={addCardio} className="font-body btn btn-ghost" style={{ width: '100%', padding: '13px', borderRadius: 14 }}>➕ Añadir cardio</button>
      )}
    </div>
  );
}
