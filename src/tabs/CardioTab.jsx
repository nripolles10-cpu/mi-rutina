import React, { useState } from 'react';
import { CardioIAModal } from '../components/IA.jsx';
import { Card, EditLockBar, Label, SectionTitle, TextField, useGym } from '../components/ui.jsx';
import { T } from '../data/theme.js';

export function CardioTab() {
  const { state, updateCardio, addCardio, removeCardio, askConfirm } = useGym();
  const editMode = state.meta.editMode;
  const [ia, setIa] = useState(false);
  return (
    <div>
      <EditLockBar />
      <SectionTitle emoji="🏃">Cardio</SectionTitle>
      <button onClick={() => setIa(true)} className="font-body btn btn-primary" style={{ width: '100%', marginBottom: 12, padding: 12 }}>✨ Cardio a mi medida (IA)</button>
      {ia && <CardioIAModal onClose={() => setIa(false)} />}
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
