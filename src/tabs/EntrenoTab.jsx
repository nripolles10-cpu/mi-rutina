import React, { useState } from 'react';
import { Card, EditLockBar, Segmentos, useGym } from '../components/ui.jsx';
import { T } from '../data/theme.js';
import { CardioTab, Cumplir, ModoCardio } from './CardioTab.jsx';
import { previstosDe } from '../utils/cardio.js';
import { MovilidadCard } from './ExtrasTab.jsx';
import { DiasLista, RutinaTab } from './RutinaTab.jsx';

/* =========================================================================
   ENTRENO: Rutina (lista de días → dentro de un día), Cardio y Movilidad
   ========================================================================= */

export const SECCIONES_ENTRENO = [['rutina', 'Rutina'], ['cardio', 'Cardio'], ['movilidad', 'Movilidad']];

export function EntrenoTab() {
  const { state, commit, dentroDia: dentro, setDentroDia: setDentro } = useGym();
  const sec = SECCIONES_ENTRENO.some((x) => x[0] === state.meta.entrenoSec) ? state.meta.entrenoSec : 'rutina';
  const elegir = (k) => { commit((prev) => ({ ...prev, meta: { ...prev.meta, entrenoSec: k } })); setDentro(false); };
  return (
    <div className="rutina-scope">
      <EditLockBar showFill={sec === 'rutina'} />
      <Segmentos opciones={SECCIONES_ENTRENO} valor={sec} onChange={elegir} testid="entreno-secciones" />
      {sec === 'rutina' && (dentro ? <RutinaTab onVolver={() => setDentro(false)} /> : <DiasLista onAbrir={() => setDentro(true)} />)}
      {sec === 'cardio' && <CardioTab />}
      {sec === 'movilidad' && <MovilidadSec />}
    </div>
  );
}

/* Movilidad: el vídeo y, como el cardio, cuántos días o qué días, el tick de hoy y lo cumplido en la semana */
function MovilidadSec() {
  const { state, commit, showToast } = useGym();
  const mov = state.extras.movilidad;
  const [editando, setEditando] = useState(false);
  const upd = (patch) => commit((prev) => ({ ...prev, extras: { ...prev.extras, movilidad: { ...prev.extras.movilidad, ...patch } } }));
  const sinPlan = previstosDe(mov) === 0;
  return (
    <div>
      <div className="font-body" style={{ color: T.muted, fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>Tu rutina de movilidad, para antes de entrenar o los días de descanso.</div>
      <MovilidadCard />
      <Card testid="movilidad-seguimiento" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>🧘 Tu movilidad</div>
          <button onClick={() => setEditando(!editando)} data-testid="movilidad-editar" aria-expanded={editando} className="font-body btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
            {editando ? '✓ Listo' : '✏️ Editar'}
          </button>
        </div>
        {!editando && (sinPlan
          ? <div className="font-body" style={{ color: T.muted, fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>Elige cuántos días a la semana o qué días quieres hacerla: toca Editar.</div>
          : <Cumplir c={mov} que="movilidad" showToast={showToast} onChange={upd} />)}
        {editando && <div style={{ marginTop: 10 }}><ModoCardio c={mov} onChange={upd} /></div>}
      </Card>
    </div>
  );
}
