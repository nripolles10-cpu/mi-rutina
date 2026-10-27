import React, { useEffect, useMemo, useState } from 'react';
import { Modal, useGym } from './ui.jsx';
import { CATS, SET_TYPES, catInfo } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { Native } from '../native/index.js';
import { fmt, fmtMS, formatDecimal, parseDecimal } from '../utils/format.js';
import { ensureStruct, setsVolume } from '../utils/training.js';
import { bloquesDelDia } from '../tabs/RutinaTab.jsx';
import { SugerenciaProgresion } from './HistorialEjercicio.jsx';

/* =========================================================================
   MODO ENTRENO EN VIVO
   Pantalla simplificada: el ejercicio y la serie actuales en grande, botones grandes de peso y repeticiones.
   Al marcar la serie arranca el descanso. Al terminar las series de un ejercicio se guarda su registro de hoy.
   Los cambios de peso y repeticiones son los mismos que harías en la tarjeta del ejercicio.
   ========================================================================= */

const sumar = (v, d, min) => {
  const n = Math.round(((typeof v === 'number' ? v : 0) + d) * 100) / 100;
  return Math.max(min === undefined ? 0 : min, n);
};

function Grande({ etiqueta, valor, unidad, pasos, onChange, testid }) {
  const [txt, setTxt] = useState(null); // mientras escribes a mano
  return (
    <div style={{ textAlign: 'center', marginBottom: 14 }}>
      <div className="font-body" style={{ color: T.muted, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{etiqueta}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {pasos.slice().reverse().map((p) => (
          <button key={'-' + p} onClick={() => onChange(sumar(valor, -p))} className="font-body btn btn-ghost" aria-label={'Restar ' + fmt(p, 2)}
            style={{ minWidth: 42, height: 50, fontSize: p === pasos[0] ? 20 : 12, padding: 0 }}>−{p === pasos[0] ? '' : fmt(p, 2)}</button>
        ))}
        <input data-testid={testid} inputMode="decimal" value={txt !== null ? txt : formatDecimal(valor)} placeholder="–"
          onFocus={(e) => { setTxt(formatDecimal(valor)); e.target.select(); }}
          onChange={(e) => { setTxt(e.target.value); const v = parseDecimal(e.target.value); if (v !== undefined) onChange(v); }}
          onBlur={() => setTxt(null)}
          className="font-display" style={{ width: 86, minWidth: 0, textAlign: 'center', fontSize: 38, fontWeight: 700, color: '#FFFFFF', background: 'transparent', border: 'none', borderBottom: '2px solid rgba(140,170,255,0.3)', padding: 0 }} />
        {pasos.map((p) => (
          <button key={'+' + p} onClick={() => onChange(sumar(valor, p))} className="font-body btn btn-ghost" aria-label={'Sumar ' + fmt(p, 2)}
            style={{ minWidth: 42, height: 50, fontSize: p === pasos[0] ? 20 : 12, padding: 0 }}>+{p === pasos[0] ? '' : fmt(p, 2)}</button>
        ))}
      </div>
      {unidad && <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>{unidad}</div>}
    </div>
  );
}

export function EntrenoVivoModal({ dayId, onClose }) {
  const { state, updateExercise, saveEntry, startTimer, addTimer, stopTimer, timer, nowMs, showToast } = useGym();
  const day = (state.days || []).find((d) => d.id === dayId);
  // Ejercicios del día en orden (de cada pareja de alternos, el que toca esta semana)
  const lista = useMemo(() => (day ? bloquesDelDia(day, state.exercises).map((b) => (b.par ? b.par.activo : b.id)).filter((id) => state.exercises[id]) : []), [day, state.exercises]);
  const [idx, setIdx] = useState(0);
  const [serie, setSerie] = useState(0);
  const [hechas, setHechas] = useState({}); // { exId: [true, false…] }
  const [guardados, setGuardados] = useState({}); // ejercicios ya guardados en esta sesión
  const descanso = (state.preferencias && state.preferencias.descanso) || 90;

  // Pantalla encendida mientras dura el entreno (al salir se vuelve a tu preferencia)
  useEffect(() => {
    Native.keepAwake(true);
    return () => { Native.keepAwake(!!(state.preferencias && state.preferencias.pantallaEncendida)); };
  }, []);

  if (!day || !lista.length) {
    return (
      <Modal title="▶ Entreno" onClose={onClose}>
        <div className="font-body" style={{ color: T.muted, textAlign: 'center', padding: 20 }}>Este día no tiene ejercicios.</div>
      </Modal>
    );
  }

  const terminado = Object.keys(guardados).length >= lista.length;
  const exId = lista[Math.min(idx, lista.length - 1)];
  const ex = state.exercises[exId];
  const sets = ex.currentSets || [];
  const nSerie = Math.min(serie, sets.length - 1);
  const s = sets[nSerie];
  const color = catInfo(CATS, ex.cat).color;
  const tipo = SET_TYPES[s.tipo] || SET_TYPES.top;
  const marcadas = hechas[exId] || [];
  const ultimo = (ex.history || []).filter((h) => !h.seed).slice(-1)[0];
  const antes = ultimo && ultimo.sets && ultimo.sets[nSerie] ? ultimo.sets[nSerie] : null;

  const patchSet = (patch) => {
    const nuevos = sets.map((x, i) => (i === nSerie ? ensureStruct({ ...x, ...patch }) : x));
    updateExercise(exId, { currentSets: nuevos }, 'vivo:' + exId + ':' + nSerie + ':' + Object.keys(patch).join());
  };

  const irA = (i) => { setIdx(Math.max(0, Math.min(lista.length - 1, i))); setSerie(0); };

  const marcarSerie = () => {
    const m = sets.map((_, i) => !!marcadas[i]);
    m[nSerie] = true;
    setHechas({ ...hechas, [exId]: m });
    const quedan = m.findIndex((x) => !x);
    if (quedan === -1) {
      // Todas las series hechas: se guarda el registro de hoy de este ejercicio (como el botón de la tarjeta)
      const nuevos = { ...guardados, [exId]: true };
      if (!guardados[exId]) saveEntry(exId);
      setGuardados(nuevos);
      let sig = lista.findIndex((id, i) => i > idx && !nuevos[id]);
      if (sig === -1) sig = lista.findIndex((id) => !nuevos[id]);
      if (sig === -1) { if (timer) stopTimer(); return; } // entreno terminado
      startTimer(descanso);
      setIdx(sig); setSerie(0);
    } else {
      startTimer(descanso);
      setSerie(quedan);
    }
  };

  const guardarYa = () => {
    if (guardados[exId]) { showToast('Este ejercicio ya está guardado hoy'); return; }
    saveEntry(exId);
    setGuardados({ ...guardados, [exId]: true });
  };

  const resta = timer ? Math.max(0, timer.end - nowMs) : 0;

  if (terminado) {
    const vol = lista.reduce((a, id) => a + setsVolume(state.exercises[id].currentSets), 0);
    return (
      <Modal title="🏁 Entreno terminado" onClose={onClose}>
        <div className="card" style={{ textAlign: 'center', padding: 22 }}>
          <div style={{ fontSize: 46 }}>💪</div>
          <div className="font-display" style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 700, marginTop: 6 }}>{day.label}</div>
          <div className="font-body" style={{ color: T.muted, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            {lista.length} ejercicios guardados · {fmt(vol, 0)} kg de volumen
          </div>
          <div className="font-body" style={{ color: T.dim, fontSize: 11.5, marginTop: 8 }}>Lo verás en Progreso → Calendario.</div>
          <button onClick={onClose} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 18, padding: 14 }}>Cerrar</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={'▶ ' + day.label} onClose={onClose}>
      {/* progreso del día */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {lista.map((id, i) => (
          <span key={id} onClick={() => irA(i)} title={state.exercises[id].name} style={{ flex: 1, height: 6, borderRadius: 4, cursor: 'pointer', background: guardados[id] ? '#A3E635' : i === idx ? T.cyan : 'rgba(255,255,255,0.18)' }} />
        ))}
      </div>

      {timer && (
        <div className="card" data-testid="vivo-descanso" style={{ marginBottom: 12, textAlign: 'center', padding: 12, borderColor: 'rgba(var(--ac-rgb),0.5)' }}>
          <div className="font-body" style={{ color: T.muted, fontSize: 12 }}>Descanso</div>
          <div className="font-display" style={{ fontSize: 44, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>{fmtMS(resta)}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6 }}>
            <button onClick={() => addTimer(15)} className="font-body btn btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }}>+15 s</button>
            <button onClick={stopTimer} className="font-body btn btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }}>Saltar descanso</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 16, borderLeft: '4px solid ' + color }}>
        <div className="font-body" style={{ color, fontWeight: 800, fontSize: 12 }}>{catInfo(CATS, ex.cat).label} · ejercicio {idx + 1} de {lista.length}</div>
        <div className="font-display" data-testid="vivo-ejercicio" style={{ color: '#FFFFFF', fontSize: 30, fontWeight: 700, lineHeight: 1.1, marginTop: 2 }}>{ex.name}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {sets.map((x, i) => (
            <button key={i} onClick={() => setSerie(i)} className="font-body" style={{
              minWidth: 40, height: 34, borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13,
              border: '1.5px solid ' + (i === nSerie ? T.cyan : 'rgba(140,170,255,0.3)'),
              background: marcadas[i] ? 'rgba(163,230,53,0.22)' : i === nSerie ? 'rgba(var(--ac-rgb),0.15)' : 'transparent', color: '#FFFFFF',
            }}>{marcadas[i] ? '✓' : i + 1}</button>
          ))}
        </div>
        <div className="font-body" style={{ marginTop: 12, marginBottom: 12, color: tipo.soft, fontWeight: 800, fontSize: 15 }}>
          {tipo.emoji} Serie {nSerie + 1} de {sets.length} · {tipo.label}
          {antes && <span style={{ color: T.dim, fontWeight: 600, fontSize: 12 }}> · la última vez: {antes.reps === null ? '–' : antes.reps}×{antes.weight === null ? '–' : fmt(antes.weight, 2)} kg</span>}
        </div>

        {s.tipo === 'drop' ? (
          (s.drops || []).map((d, j) => (
            <div key={j} style={{ borderTop: j ? '1px solid rgba(140,170,255,0.14)' : 'none', paddingTop: j ? 10 : 0 }}>
              <div className="font-body" style={{ color: T.muted, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>Descenso {j + 1}</div>
              <Grande etiqueta="Peso (kg)" valor={d.weight} pasos={[2.5, 1.25]} onChange={(v) => patchSet({ drops: s.drops.map((x, k) => (k === j ? { ...x, weight: v } : x)) })} />
              <Grande etiqueta="Repeticiones" valor={d.reps} pasos={[1]} onChange={(v) => patchSet({ drops: s.drops.map((x, k) => (k === j ? { ...x, reps: Math.round(v) } : x)) })} />
            </div>
          ))
        ) : (
          <>
            <Grande testid="vivo-peso" etiqueta="Peso (kg)" valor={s.weight} pasos={[2.5, 1.25]} onChange={(v) => patchSet({ weight: v })} />
            {s.tipo === 'rp'
              ? (s.tandas || []).map((r, j) => <Grande key={j} etiqueta={'Tanda ' + (j + 1) + ' (reps)'} valor={r} pasos={[1]} onChange={(v) => patchSet({ tandas: s.tandas.map((x, k) => (k === j ? Math.round(v) : x)) })} />)
              : <Grande testid="vivo-reps" etiqueta="Repeticiones" valor={s.reps} pasos={[1]} onChange={(v) => patchSet({ reps: Math.round(v) })} />}
          </>
        )}

        <button onClick={marcarSerie} data-testid="vivo-hecha" className="font-body btn" style={{ width: '100%', padding: 16, fontSize: 16, marginTop: 4, background: color, color: '#060913', boxShadow: '0 6px 20px ' + color + '55' }}>
          {marcadas.filter(Boolean).length + (marcadas[nSerie] ? 0 : 1) >= sets.length && !guardados[exId] ? '✓ Última serie · guardar y descansar' : '✓ Serie hecha · descanso ' + fmtMS(descanso * 1000)}
        </button>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button disabled={idx === 0} onClick={() => irA(idx - 1)} className="font-body btn btn-ghost" style={{ flex: 1, minWidth: 0, fontSize: 12.5, padding: '10px 6px' }}>‹ Anterior</button>
          <button onClick={guardarYa} disabled={!!guardados[exId]} className="font-body btn btn-ghost" style={{ flex: 1, minWidth: 0, fontSize: 12.5, padding: '10px 6px' }}>{guardados[exId] ? 'Guardado ✓' : '💾 Guardar'}</button>
          <button disabled={idx >= lista.length - 1} onClick={() => irA(idx + 1)} className="font-body btn btn-ghost" style={{ flex: 1, minWidth: 0, fontSize: 12.5, padding: '10px 6px' }}>Siguiente ›</button>
        </div>
        <SugerenciaProgresion id={exId} compacta />
      </div>
      <div className="font-body" style={{ color: T.dim, fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
        La pantalla se mantiene encendida mientras estás aquí. El descanso avisa aunque bloquees el móvil (en la app de Android).
      </div>
    </Modal>
  );
}
