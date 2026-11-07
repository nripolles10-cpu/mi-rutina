import React, { useState } from 'react';
import { Card, EditLockBar, Label, SectionTitle, TextField, useGym } from '../components/ui.jsx';
import { CardioPresetsModal } from '../components/Herramientas.jsx';
import { T } from '../data/theme.js';
import { Native } from '../native/index.js';
import { alternarHoy, DIAS_CORTOS, DIAS_LARGOS, diasDe, hechoHoy, semanaDe, tocaHoy, toggleDia } from '../utils/cardio.js';

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
      {toca ? (
        <button onClick={marcar} className={'font-body btn ' + (hecho ? 'btn-ghost' : 'btn-primary')} style={{ width: '100%' }} aria-pressed={hecho}>
          {hecho ? '✓ Cumplido hoy · deshacer' : '✅ He hecho el cardio de hoy'}
        </button>
      ) : (
        <div className="font-body" style={{ color: T.dim, fontSize: 11.5, textAlign: 'center' }}>Hoy no te toca. {diasDe(c).length ? 'Te toca: ' + diasDe(c).map((d) => DIAS_LARGOS[d - 1]).join(', ') + '.' : ''}</div>
      )}
    </div>
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
        <Card key={c.id} style={{ marginBottom: 10 }}>
          {editMode ? (
            <>
              <Label>Nombre</Label>
              <TextField value={c.name} onChange={(v) => updateCardio(c.id, { name: v }, 'cardio:' + c.id + ':name')} placeholder="ej. Cinta" />
            </>
          ) : (
            <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>🏃 {c.name}</div>
          )}
          <Label style={{ marginTop: editMode ? 10 : 0 }}>Frecuencia</Label>
          <TextField value={c.frecuencia} onChange={(v) => updateCardio(c.id, { frecuencia: v }, 'cardio:' + c.id + ':frec')} placeholder="ej. 3 días / semana" />
          <Label style={{ marginTop: 10 }}>Detalle</Label>
          <TextField multiline value={c.detalle} onChange={(v) => updateCardio(c.id, { detalle: v }, 'cardio:' + c.id + ':det')} placeholder="ej. 20 min · inclinación 12 · velocidad 4,5" rows={2} />
          <div style={{ marginTop: 12 }}>
            <DiasCardio c={c} onChange={(dias) => updateCardio(c.id, { dias }, 'cardio:' + c.id + ':dias')} />
          </div>
          <Cumplir c={c} showToast={showToast} onChange={(p) => updateCardio(c.id, p)} />
          {editMode && (
            <button onClick={() => askConfirm({ title: '¿Quitar este cardio?', text: 'Se quitará "' + c.name + '".', confirmLabel: 'Quitar', onConfirm: () => removeCardio(c.id) })}
              className="font-body btn btn-danger" style={{ width: '100%', marginTop: 12, fontSize: 12.5 }}>🗑️ Quitar este cardio</button>
          )}
        </Card>
      ))}
      {editMode && (
        <button onClick={addCardio} className="font-body btn btn-ghost" style={{ width: '100%', padding: '13px', borderRadius: 14 }}>➕ Añadir cardio</button>
      )}
    </div>
  );
}
