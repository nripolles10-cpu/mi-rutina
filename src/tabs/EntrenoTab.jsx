import React from 'react';
import { EditLockBar, Segmentos, useGym } from '../components/ui.jsx';
import { T } from '../data/theme.js';
import { CardioTab } from './CardioTab.jsx';
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
      {sec === 'movilidad' && (
        <div>
          <div className="font-body" style={{ color: T.muted, fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>Tu rutina de movilidad, para antes de entrenar o los días de descanso.</div>
          <MovilidadCard />
        </div>
      )}
    </div>
  );
}
