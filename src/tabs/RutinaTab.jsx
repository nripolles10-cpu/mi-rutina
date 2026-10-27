import React, { useState, useEffect } from 'react';
import { Card, Chip, EditLockBar, Label, MiniBtn, NumField, TextField, chipStyle, useGym } from '../components/ui.jsx';
import { CATS, CAT_IDS, SET_TYPES, catInfo } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { Native } from '../native/index.js';
import { fmt, fmtDateShort, parseNum } from '../utils/format.js';
import { bestSerie1, computeScore, ensureStruct } from '../utils/training.js';
import { EntrenoVivoModal } from '../components/EntrenoVivo.jsx';
import { HistorialEjercicioModal, SugerenciaProgresion } from '../components/HistorialEjercicio.jsx';
import { semanaDescarga } from '../utils/entreno.js';

/* =========================================================================
   SECCIÓN 7 · PESTAÑAS
   Rutina · Cardio · Progreso · Diana física · Comida · Extras · Ajustes
   ========================================================================= */

/* =========================================================================
   EJERCICIOS ALTERNOS (una semana uno, otra semana el otro)
   Dos ejercicios del mismo día se unen en UN solo bloque con dos pestañas. Cada uno conserva lo suyo
   (series, pesos, objetivo, técnica, comentarios, historial). Tú eliges cuál toca tocando la pestaña:
   nunca cambia solo.
   Dónde se guarda: dentro de cada día, en day.alternos = [{ a, b, activo }]. Los ejercicios no cambian
   y no se toca ninguna clave de localStorage. Los días antiguos, sin ese campo, funcionan igual.
   ========================================================================= */

// Pares válidos de un día: los dos ejercicios existen, están en el día y ninguno está en dos pares.
export function paresValidos(day, exercises) {
  const ids = (day && day.ids) || [];
  const usados = {};
  const out = [];
  ((day && day.alternos) || []).forEach((p) => {
    if (!p || p.a === p.b || usados[p.a] || usados[p.b]) return;
    if (ids.indexOf(p.a) === -1 || ids.indexOf(p.b) === -1 || !exercises[p.a] || !exercises[p.b]) return;
    usados[p.a] = true; usados[p.b] = true;
    out.push({ a: p.a, b: p.b, activo: p.activo === p.b ? p.b : p.a });
  });
  return out;
}

// Devuelve el par al que pertenece un ejercicio (o null)
export function parDe(pares, id) {
  for (let i = 0; i < pares.length; i++) { if (pares[i].a === id || pares[i].b === id) return pares[i]; }
  return null;
}

// Bloques visibles de un día: un ejercicio suelto, o un par (que se pinta una sola vez, en el sitio del principal)
export function bloquesDelDia(day, exercises) {
  const pares = paresValidos(day, exercises);
  const secundarios = {};
  pares.forEach((p) => { secundarios[p.b] = true; });
  const out = [];
  ((day && day.ids) || []).forEach((id) => {
    if (secundarios[id]) return;
    out.push({ id: id, par: parDe(pares, id) });
  });
  return out;
}

// Vuelve a la lista de ids del día: el alterno va justo detrás de su principal
export function idsDesdeBloques(bloques) {
  const ids = [];
  bloques.forEach((b) => { ids.push(b.id); if (b.par) ids.push(b.par.b); });
  return ids;
}

/* Opción de edición dentro de cada ejercicio: unirlo con otro, crear uno nuevo para alternar, o separarlos */
export function AlternoPicker({ day, id }) {
  const { state, updateDay, addExercise, showToast } = useGym();
  const [modo, setModo] = useState(null); // null | 'nuevo' | 'existente'
  const [nombre, setNombre] = useState('');
  const [cat, setCat] = useState(state.exercises[id] ? state.exercises[id].cat : 'pecho');
  const [pend, setPend] = useState(null); // ejercicio nuevo que se acaba de crear y falta unir

  const pares = paresValidos(day, state.exercises);
  const par = parDe(pares, id);
  const otroId = par ? (par.a === id ? par.b : par.a) : null;
  const otro = otroId ? state.exercises[otroId] : null;
  const unidos = {};
  pares.forEach((p) => { unidos[p.a] = true; unidos[p.b] = true; });
  const libres = day.ids.filter((i) => i !== id && state.exercises[i] && !unidos[i]);

  // Une `otro` con este ejercicio: queda justo detrás y este es el que se ve al principio
  const unir = (otroEj) => {
    const sin = day.ids.filter((i) => i !== otroEj);
    const pos = sin.indexOf(id);
    const ids = sin.slice(0, pos + 1).concat([otroEj]).concat(sin.slice(pos + 1));
    updateDay(day.id, { ids: ids, alternos: pares.concat([{ a: id, b: otroEj, activo: id }]) });
    showToast('Ejercicio alterno añadido ✓');
  };

  // Al crear un ejercicio nuevo, en cuanto aparece en el día se une a este
  useEffect(() => {
    if (!pend) return;
    const nuevo = day.ids.find((i) => pend.idsAntes.indexOf(i) === -1);
    if (!nuevo) return;
    unir(nuevo);
    setPend(null); setModo(null); setNombre('');
  }, [day.ids, pend]);

  const separar = () => {
    updateDay(day.id, { alternos: pares.filter((p) => !(p.a === par.a && p.b === par.b)) });
    showToast('Ejercicios separados');
  };

  if (par) {
    return (
      <div>
        <div className="font-body" style={{ color: T.muted, fontSize: 12, lineHeight: 1.5 }}>
          Alterna con <b style={{ color: T.text }}>{otro ? otro.name : '…'}</b>. Toca las dos pestañas de arriba del bloque para elegir cuál haces esta semana. Cada uno guarda sus propias series, pesos, objetivo y comentarios.
        </div>
        <button onClick={separar} className="font-body btn btn-ghost" style={{ marginTop: 8, padding: '8px 12px', fontSize: 12 }}>✂️ Separar (dejarlos como dos ejercicios)</button>
      </div>
    );
  }

  if (modo === 'nuevo') {
    return (
      <div className="card" style={{ padding: 12 }}>
        <Label>Nombre del ejercicio alterno</Label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="ej. Abducción de cadera" className="font-body inp" style={{ marginBottom: 10, fontSize: 13 }} />
        <Label>Músculo</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {CAT_IDS.map((k) => <Chip key={k} active={cat === k} onClick={() => setCat(k)} accent={catInfo(CATS, k).color} style={{ padding: '6px 12px', fontSize: 12 }}>{catInfo(CATS, k).label}</Chip>)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setModo(null)} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>Cancelar</button>
          <button disabled={!nombre.trim() || !!pend} onClick={() => { setPend({ idsAntes: day.ids.slice() }); addExercise(day.id, nombre.trim(), cat); }} className="font-body btn btn-primary" style={{ flex: 2 }}>Añadir alterno</button>
        </div>
      </div>
    );
  }

  if (modo === 'existente') {
    return (
      <div className="card" style={{ padding: 12 }}>
        <div className="font-body" style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>Elige con cuál alterna:</div>
        {libres.map((i) => (
          <button key={i} onClick={() => unir(i)} className="font-body btn btn-ghost" style={{ width: '100%', textAlign: 'left', marginBottom: 6, padding: '9px 12px', fontSize: 13, borderStyle: 'solid', borderColor: catInfo(CATS, state.exercises[i].cat).color + '88' }}>
            {state.exercises[i].name} <span style={{ color: catInfo(CATS, state.exercises[i].cat).color, fontWeight: 700, fontSize: 11.5 }}>· {catInfo(CATS, state.exercises[i].cat).label}</span>
          </button>
        ))}
        <button onClick={() => setModo(null)} className="font-body btn btn-ghost" style={{ width: '100%', padding: '8px', fontSize: 12.5 }}>Cancelar</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button onClick={() => setModo('nuevo')} className="font-body btn btn-ghost" style={{ padding: '9px 12px', fontSize: 12.5 }}>➕ Crear un ejercicio alterno</button>
      {libres.length > 0 && <button onClick={() => setModo('existente')} className="font-body btn btn-ghost" style={{ padding: '9px 12px', fontSize: 12.5 }}>🔗 Usar uno que ya tengo en este día</button>}
    </div>
  );
}

/* Bloque de dos ejercicios alternos: pestañas arriba y debajo el ejercicio elegido, con todo lo suyo */
export function AlternoCard({ day, par }) {
  const { state, updateDay } = useGym();
  const ex = state.exercises;
  const activoId = par.activo === par.b ? par.b : par.a;
  const cambiar = (id) => {
    if (id === activoId) return;
    updateDay(day.id, { alternos: paresValidos(day, ex).map((p) => (p.a === par.a && p.b === par.b ? { ...p, activo: id } : p)) });
  };
  return (
    <div className="card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 12px 10px' }}>
        <div className="font-body" style={{ color: T.muted, fontSize: 11.5, marginBottom: 8 }}>🔁 Alternas cada semana · toca para elegir cuál toca esta semana</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[par.a, par.b].map((id) => {
            const e = ex[id];
            const c = catInfo(CATS, e.cat).color;
            const on = id === activoId;
            return (
              <button key={id} onClick={() => cambiar(id)} className="font-body" style={{
                flex: 1, minWidth: 0, textAlign: 'left', padding: '9px 10px', borderRadius: 12, cursor: 'pointer',
                border: '1.5px solid ' + (on ? c : 'rgba(140,170,255,0.25)'), background: on ? c + '2E' : 'rgba(10,15,30,0.45)',
                boxShadow: on ? '0 0 14px ' + c + '40' : 'none',
              }}>
                <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, lineHeight: 1.25 }}>{e.name}</div>
                <div style={{ color: on ? c : T.muted, fontSize: 11, marginTop: 2, fontWeight: on ? 700 : 500 }}>{catInfo(CATS, e.cat).label}{on ? ' · esta semana' : ''}</div>
              </button>
            );
          })}
        </div>
      </div>
      <ExerciseCard key={activoId} id={activoId} dayId={day.id} embedded />
    </div>
  );
}

/* =========================================================================
   SERIES: selector de tipo (emoticono + color) y huecos según el tipo
   ========================================================================= */

export function SetTypeSelect({ value, onChange }) {
  const t = SET_TYPES[value] || SET_TYPES.top;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="font-body set-select"
      style={{ borderColor: t.color + 'AA', color: '#FFFFFF', background: t.color + '26' }}>
      {Object.keys(SET_TYPES).map((k) => (
        <option key={k} value={k} style={{ background: '#0B1020', color: '#F5F7FF' }}>{SET_TYPES[k].emoji} {SET_TYPES[k].label}</option>
      ))}
    </select>
  );
}

export function SetRow({ s, idx, onPatch, onRemove, canRemove, editMode }) {
  const t = SET_TYPES[s.tipo] || SET_TYPES.top;
  const tandas = s.tandas || [];
  const drops = s.drops || [];
  const setDrop = (i, patch) => onPatch({ drops: drops.map((d, k) => (k === i ? { ...d, ...patch } : d)) });
  const small = { color: T.muted, fontSize: 12 };

  return (
    <div style={{ borderLeft: '3px solid ' + t.color, background: t.color + '12', borderRadius: 12, padding: '10px 10px 10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="font-body" style={{ ...small, flexShrink: 0, width: 50 }}>Serie {idx + 1}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SetTypeSelect value={s.tipo} onChange={(v) => onPatch({ tipo: v })} />
        </div>
        {editMode && canRemove && <MiniBtn title="Quitar esta serie" onClick={onRemove}>✕</MiniBtn>}
      </div>

      {s.tipo === 'rp' && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="font-body" style={small}>Peso fijo</span>
            <NumField forceEditable value={s.weight} onChange={(v) => onPatch({ weight: v })} placeholder="kg" w={60} />
            <span className="font-body" style={small}>kg</span>
            <span style={{ flex: 1 }} />
            <span className="font-body" style={small}>Tandas</span>
            <MiniBtn title="Menos tandas" disabled={tandas.length <= 2} onClick={() => onPatch({ tandas: tandas.slice(0, -1) })}>−</MiniBtn>
            <span className="font-display" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 20, minWidth: 18, textAlign: 'center' }}>{tandas.length}</span>
            <MiniBtn title="Más tandas" disabled={tandas.length >= 8} onClick={() => onPatch({ tandas: tandas.concat([null]) })}>+</MiniBtn>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {tandas.map((r, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span className="font-body" style={{ color: T.dim, fontSize: 10.5 }}>Tanda {i + 1}</span>
                <NumField forceEditable value={r} onChange={(v) => onPatch({ tandas: tandas.map((x, k) => (k === i ? v : x)) })} placeholder="reps" w={54} />
              </div>
            ))}
          </div>
        </div>
      )}

      {s.tipo === 'drop' && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {drops.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="font-body" style={{ ...small, width: 82, flexShrink: 0 }}>{i === 0 ? 'Serie base' : 'Descenso ' + i}</span>
              <NumField forceEditable value={d.reps} onChange={(v) => setDrop(i, { reps: v })} placeholder="reps" w={52} />
              <span className="font-body" style={small}>×</span>
              <NumField forceEditable value={d.weight} onChange={(v) => setDrop(i, { weight: v })} placeholder="kg" w={58} />
              <span className="font-body" style={small}>kg</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={drops.length <= 2} onClick={() => onPatch({ drops: drops.slice(0, -1) })} className="font-body btn btn-ghost" style={{ flex: 1, padding: '8px', fontSize: 12 }}>➖ Quitar descenso</button>
            <button disabled={drops.length >= 8} onClick={() => onPatch({ drops: drops.concat([{ weight: null, reps: null }]) })} className="font-body btn btn-ghost" style={{ flex: 1, padding: '8px', fontSize: 12 }}>➕ Añadir descenso</button>
          </div>
        </div>
      )}

      {s.tipo !== 'rp' && s.tipo !== 'drop' && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <NumField forceEditable value={s.reps} onChange={(v) => onPatch({ reps: v })} placeholder="reps" w={54} />
          <span className="font-body" style={small}>×</span>
          <NumField forceEditable value={s.weight} onChange={(v) => onPatch({ weight: v })} placeholder="kg" w={60} />
          <span className="font-body" style={small}>kg</span>
        </div>
      )}

      <input type="text" placeholder="(nota de esta serie)" value={s.nota || ''} onChange={(e) => onPatch({ nota: e.target.value || null })}
        className="font-body inp" style={{ marginTop: 10, fontSize: 12.5, padding: '8px 10px' }} />
    </div>
  );
}

/* =========================================================================
   TARJETA DE EJERCICIO
   `embedded` = la tarjeta va dentro de un bloque de ejercicios alternos (sin marco propio)
   ========================================================================= */

export function ExerciseCard({ id, dayId, embedded }) {
  const { state, updateExercise, updateDay, saveEntry, suggestObjetivo, removeFromDay, addSerie, removeSerieAt, askConfirm, fotos, setFoto, delFoto, showToast, duplicarEjercicio } = useGym();
  const [open, setOpen] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);
  const [fotoOcupada, setFotoOcupada] = useState(false);
  const ex = state.exercises[id];
  if (!ex) return null;

  const editMode = state.meta.editMode;
  const day = dayId ? (state.days || []).find((d) => d.id === dayId) : null;
  // Posición del bloque (un ejercicio suelto o un par de alternos) para subir y bajar
  const bloques = day ? bloquesDelDia(day, state.exercises) : [];
  const posBloque = bloques.findIndex((b) => b.id === id || (b.par && (b.par.a === id || b.par.b === id)));
  const isFirst = posBloque <= 0;
  const isLast = posBloque === -1 || posBloque === bloques.length - 1;
  const par = day ? parDe(paresValidos(day, state.exercises), id) : null;

  const moverBloque = (dir) => {
    const j = posBloque + dir;
    if (!day || posBloque === -1 || j < 0 || j >= bloques.length) return;
    const nuevos = bloques.slice();
    const tmp = nuevos[posBloque]; nuevos[posBloque] = nuevos[j]; nuevos[j] = tmp;
    updateDay(day.id, { ids: idsDesdeBloques(nuevos) });
  };

  const record = bestSerie1(ex); // el trofeo muestra la MEJOR marca de la serie 1 (no la última)
  const hist = ex.history || [];
  const last = hist.length ? hist[hist.length - 1] : null;
  const prevLast = hist.length > 1 ? hist[hist.length - 2] : null;
  let trend = null;
  if (last && prevLast) {
    const a = computeScore(last.sets && last.sets[0]);
    const b = computeScore(prevLast.sets && prevLast.sets[0]);
    if (a > 0 && b > 0) trend = a > b ? 'up' : a < b ? 'down' : 'same';
  }
  const foto = fotos && fotos[id] ? Native.photoSrc(fotos[id]) : null;
  const mc = catInfo(CATS, ex.cat).color; // cada músculo tiene su color; todos los ejercicios del mismo músculo comparten color
  const chipSt = chipStyle(mc);

  const setSet = (idx, patch) => {
    const cur = ex.currentSets[idx];
    const sets = ex.currentSets.map((s, i) => (i === idx ? ensureStruct({ ...s, ...patch }) : s));
    let key = null;
    if ('reps' in patch || 'weight' in patch || 'nota' in patch) key = 'set:' + id + ':' + idx + ':' + Object.keys(patch).join();
    else if (patch.tandas && cur.tandas && patch.tandas.length === cur.tandas.length) key = 'set:' + id + ':' + idx + ':tandas';
    else if (patch.drops && cur.drops && patch.drops.length === cur.drops.length) key = 'set:' + id + ':' + idx + ':drops';
    updateExercise(id, { currentSets: sets }, key);
  };

  // origen: 'camara' o 'galeria'
  const onPickPhoto = async (origen) => {
    if (fotoOcupada) return;
    setFotoOcupada(true);
    try {
      const url = await Native.pickPhoto(origen);
      if (url) await setFoto(id, url);
    } catch (e) {
      showToast('No se pudo abrir la ' + (origen === 'camara' ? 'cámara' : 'galería') + '. Revisa los permisos de la app.', 'warn');
    } finally { setFotoOcupada(false); }
  };

  const askRemove = () => {
    const otroEj = par ? state.exercises[par.a === id ? par.b : par.a] : null;
    askConfirm({
      title: '¿Quitar ejercicio?',
      text: 'Se quitará "' + ex.name + '" de este día. Desaparecerá también de Progreso, de las series semanales y de tus objetivos.'
        + (otroEj ? ' Su alterno "' + otroEj.name + '" se queda como ejercicio normal.' : ''),
      confirmLabel: 'Quitar',
      onConfirm: () => {
        if (par) {
          updateDay(day.id, { ids: day.ids.filter((i) => i !== id), alternos: paresValidos(day, state.exercises).filter((p) => !(p.a === par.a && p.b === par.b)) });
          showToast('Ejercicio quitado (puedes deshacerlo)');
        } else removeFromDay(dayId, id);
      },
    });
  };

  return (
    <div className={embedded ? '' : 'card'} style={embedded ? { borderTop: '1px solid rgba(140,170,255,0.14)' } : { marginBottom: 12, padding: 0, overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ textAlign: 'left', padding: '14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        {editMode && dayId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <MiniBtn title="Subir" disabled={isFirst} onClick={() => moverBloque(-1)}>▲</MiniBtn>
            <MiniBtn title="Bajar" disabled={isLast} onClick={() => moverBloque(1)}>▼</MiniBtn>
          </div>
        )}
        <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: mc, minHeight: 34, flexShrink: 0, boxShadow: '0 0 12px ' + mc + '99' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {ex.name}
            {trend === 'up' && <span title="Mejorando">📈</span>}
            {trend === 'down' && <span title="Ha bajado">📉</span>}
            {ex.comentario ? <span title="Tiene comentarios" style={{ fontSize: 12 }}>📝</span> : null}
          </div>
          <div className="font-body" style={{ color: T.muted, fontSize: 11.5, marginTop: 2 }}><b style={{ color: mc }}>{catInfo(CATS, ex.cat).label}</b></div>
          <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
            {record !== null && <span className="font-body" style={{ ...chipSt, fontWeight: 700 }}>🏆 {fmt(record)} kg</span>}
            {ex.objetivo && <span className="font-body" style={chipSt}>🎯 {ex.objetivo.text}</span>}
            {!ex.objetivo && <span className="font-body" style={chipSt}>Sin objetivo — ponlo tú o pide una sugerencia</span>}
            {ex.marcaAntigua && <span className="font-body" style={chipSt}>↩️ recuperar {ex.marcaAntigua.text}</span>}
          </div>
        </div>
        {foto && <img src={foto} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '2px solid ' + mc }} />}
        <span style={{ color: T.muted, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', fontSize: 13 }}>▼</span>
      </div>

      {open && (
        <div style={{ padding: '0 14px 16px 14px', borderTop: '1px solid rgba(140,170,255,0.14)' }}>
          {editMode && (
            <div style={{ marginTop: 12 }}>
              <Label>Nombre del ejercicio</Label>
              <TextField value={ex.name} onChange={(v) => updateExercise(id, { name: v }, 'ex:' + id + ':name')} placeholder="Nombre del ejercicio" />
              {day && (
                <div style={{ marginTop: 10 }}>
                  <Label>🔁 Alternar con otro ejercicio (una semana uno y otra semana el otro)</Label>
                  <AlternoPicker day={day} id={id} />
                </div>
              )}
              <Label style={{ marginTop: 10 }}>Músculo (el ejercicio cuenta solo para este)</Label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CAT_IDS.map((k) => (
                  <Chip key={k} active={ex.cat === k} onClick={() => updateExercise(id, { cat: k })} accent={catInfo(CATS, k).color} style={{ padding: '6px 12px', fontSize: 12 }}>{catInfo(CATS, k).label}</Chip>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ex.currentSets.map((s, idx) => (
              <SetRow key={idx} s={s} idx={idx} editMode={editMode} canRemove={ex.currentSets.length > 1}
                onPatch={(patch) => setSet(idx, patch)} onRemove={() => removeSerieAt(id, idx)} />
            ))}
          </div>

          {editMode && (
            <button disabled={ex.currentSets.length >= 8} onClick={() => addSerie(id)} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 10, padding: '9px', fontSize: 12.5 }}>
              ➕ Añadir serie
            </button>
          )}

          <div className="font-body" style={{ marginTop: 12, fontSize: 11, color: T.dim }}>{last && !last.seed ? 'Último registro: ' + fmtDateShort(last.date) : 'Sin registros guardados aún'}</div>
          <SugerenciaProgresion id={id} compacta />

          <button onClick={() => saveEntry(id)} className="font-body btn" style={{ marginTop: 10, width: '100%', background: mc, color: '#060913', boxShadow: '0 6px 20px ' + mc + '55' }}>
            💾 Guardar registro de hoy
          </button>
          <button onClick={() => setVerHistorial(true)} className="font-body btn btn-ghost" style={{ marginTop: 8, width: '100%', fontSize: 12.5 }}>📈 Historial, récords y 1RM</button>
          {verHistorial && <HistorialEjercicioModal id={id} onClose={() => setVerHistorial(false)} />}

          <div style={{ marginTop: 16 }}>
            <Label>🎯 Objetivo</Label>
            <TextField value={ex.objetivo ? ex.objetivo.text : ''} placeholder="Pon tu próximo objetivo (ej. 120 kg)"
              onChange={(v) => updateExercise(id, { objetivo: v ? { ...(ex.objetivo || {}), text: v, value: parseNum(v), sugerido: false } : null }, 'ex:' + id + ':obj')} />
            {editMode && (
              <button onClick={() => suggestObjetivo(id)} className="font-body btn btn-ghost" style={{ marginTop: 6, padding: '7px 10px', fontSize: 11.5 }}>
                🧮 Sugerir objetivo (+12,5% de tu marca actual)
              </button>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <Label>↩️ Marca antigua a recuperar</Label>
            <TextField value={ex.marcaAntigua ? ex.marcaAntigua.text : ''} placeholder="ej. 230 kg"
              onChange={(v) => updateExercise(id, { marcaAntigua: v ? { ...(ex.marcaAntigua || {}), text: v, value: parseNum(v) } : null }, 'ex:' + id + ':marca')} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Label>📝 Comentarios / técnica</Label>
            <TextField forceEditable multiline value={ex.comentario || ''} onChange={(v) => updateExercise(id, { comentario: v }, 'ex:' + id + ':com')}
              placeholder="Escribe lo que quieras: técnica, ajustes de la máquina, sensaciones, recordatorios…" />
          </div>

          {editMode && (
            <div style={{ marginTop: 12 }}>
              <Label>📷 Foto del ejercicio</Label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button disabled={fotoOcupada} onClick={() => onPickPhoto('camara')} className="font-body btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>📷 Cámara</button>
                <button disabled={fotoOcupada} onClick={() => onPickPhoto('galeria')} className="font-body btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>🖼️ Galería</button>
                {foto && <button disabled={fotoOcupada} onClick={() => delFoto(id)} className="font-body btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>Quitar foto</button>}
              </div>
            </div>
          )}
          {editMode && dayId && (
            <button onClick={() => duplicarEjercicio(dayId, id)} className="font-body btn btn-ghost" style={{ marginTop: 16, width: '100%', fontSize: 12.5 }}>
              ⧉ Duplicar este ejercicio (sin su historial)
            </button>
          )}
          {editMode && dayId && (
            <button onClick={askRemove} className="font-body btn btn-danger" style={{ marginTop: 8, width: '100%', fontSize: 12.5 }}>
              🗑️ Quitar este ejercicio del día
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   TAB: RUTINA (carrusel de días)
   ========================================================================= */

export function AddExerciseForm({ dayId }) {
  const { addExercise } = useGym();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [cat, setCat] = useState('pecho');

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="font-body btn btn-ghost" style={{ width: '100%', padding: '13px', borderRadius: 14 }}>
        ➕ Añadir ejercicio a este día
      </button>
    );
  }
  return (
    <Card style={{ marginTop: 4 }}>
      <Label>Nombre</Label>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. Press militar" className="font-body inp" style={{ marginBottom: 12, fontSize: 13 }} />
      <Label>Músculo (el ejercicio cuenta solo para este)</Label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {CAT_IDS.map((k) => <Chip key={k} active={cat === k} onClick={() => setCat(k)} accent={catInfo(CATS, k).color}>{catInfo(CATS, k).label}</Chip>)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setOpen(false)} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>Cancelar</button>
        <button onClick={() => { if (name.trim()) { addExercise(dayId, name.trim(), cat); setName(''); setOpen(false); } }} className="font-body btn btn-primary" style={{ flex: 2 }}>Añadir ejercicio</button>
      </div>
    </Card>
  );
}

export function AddDayForm() {
  const { addDay } = useGym();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [equipo, setEquipo] = useState('');

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="font-body btn btn-ghost" style={{ width: '100%', padding: '13px', borderRadius: 14, marginTop: 10 }}>
        📅 Crear un día nuevo de rutina
      </button>
    );
  }
  return (
    <Card style={{ marginTop: 10 }}>
      <Label>Nombre del día</Label>
      <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ej. Brazo y hombro" className="font-body inp" style={{ marginBottom: 12, fontSize: 13 }} />
      <Label>🎒 Lo que llevo ese día (opcional)</Label>
      <input type="text" value={equipo} onChange={(e) => setEquipo(e.target.value)} placeholder="ej. Muñequeras, straps y cinturón" className="font-body inp" style={{ marginBottom: 14, fontSize: 13 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setOpen(false)} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>Cancelar</button>
        <button onClick={() => { if (label.trim()) { addDay(label.trim(), equipo.trim()); setLabel(''); setEquipo(''); setOpen(false); } }} className="font-body btn btn-primary" style={{ flex: 2 }}>Crear día</button>
      </div>
    </Card>
  );
}

// Aviso de semana de descarga (Ajustes → Entreno)
export function AvisoDescarga() {
  const { state } = useGym();
  const d = semanaDescarga(state.preferencias && state.preferencias.descarga, new Date());
  if (!d.activa || !d.es) return null;
  return (
    <div data-testid="aviso-descarga" className="font-body" style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 14, background: 'rgba(56,189,248,0.10)', border: '1px solid rgba(56,189,248,0.4)', color: '#BAE6FD', fontSize: 12.5, lineHeight: 1.5 }}>
      🧘 <b>Semana de descarga</b> (semana {d.semanaDelCiclo} de {d.cadaSemanas}). Baja el peso un 40–50 % o haz la mitad de las series, sin llegar al fallo. Sirve para recuperarte y volver más fuerte.
    </div>
  );
}

export function RutinaTab() {
  const { state, setActiveDay, updateDay, moveDay, removeDay, askConfirm, duplicarDia } = useGym();
  const [vivo, setVivo] = useState(null);
  const days = state.days || [];
  const editMode = state.meta.editMode;
  const dayIndex = Math.max(0, days.findIndex((d) => d.id === state.meta.activeDay));
  const day = days[dayIndex] || days[0];

  const goTo = (delta) => {
    if (!days.length) return;
    setActiveDay(days[(dayIndex + delta + days.length) % days.length].id);
  };

  if (!day) {
    return (
      <div className="rutina-scope">
        <EditLockBar showFill />
        <Card><p className="font-body" style={{ color: T.muted, fontSize: 13, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>No tienes ningún día de rutina. {editMode ? 'Crea el primero aquí abajo.' : 'Desbloquea la edición para crear uno.'}</p></Card>
        {editMode && <AddDayForm />}
      </div>
    );
  }

  return (
    <div className="rutina-scope">
      <EditLockBar showFill />

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, userSelect: 'none', gap: 8 }}>
          <button onClick={() => goTo(-1)} className="font-body arrow-btn">‹</button>
          {editMode ? (
            <input value={day.label} onChange={(e) => updateDay(day.id, { label: e.target.value }, 'day:' + day.id + ':label')} className="font-display inp"
              style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.03em', textAlign: 'center', flex: 1, minWidth: 0, padding: '5px 8px' }} />
          ) : (
            <div className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.04em', textAlign: 'center', flex: 1, color: '#FFFFFF' }}>{day.label}</div>
          )}
          <button onClick={() => goTo(1)} className="font-body arrow-btn">›</button>
        </div>

        {editMode && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '8px 0 2px', flexWrap: 'wrap' }}>
            <button disabled={dayIndex === 0} onClick={() => moveDay(day.id, -1)} className="font-body btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11.5 }}>◀ Mover antes</button>
            <button disabled={dayIndex === days.length - 1} onClick={() => moveDay(day.id, 1)} className="font-body btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11.5 }}>Mover después ▶</button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '8px 0 16px', flexWrap: 'wrap' }}>
          {days.map((d, i) => (
            <span key={d.id} onClick={() => setActiveDay(d.id)} style={{
              width: i === dayIndex ? 22 : 7, height: 7, borderRadius: 999, cursor: 'pointer', transition: 'all .2s',
              background: i === dayIndex ? T.cyan : 'rgba(255,255,255,0.3)', boxShadow: i === dayIndex ? '0 0 10px rgba(var(--ac-rgb),0.7)' : 'none',
            }} />
          ))}
        </div>
      </div>

      <AvisoDescarga />
      {vivo && <EntrenoVivoModal dayId={vivo} onClose={() => setVivo(null)} />}
      {!editMode && day.ids.length > 0 && (
        <button onClick={() => setVivo(day.id)} className="font-body btn btn-primary" style={{ width: '100%', marginBottom: 14, padding: 13, fontSize: 14 }}>▶ Empezar entreno en vivo</button>
      )}

      {editMode ? (
        <Card style={{ marginBottom: 14 }}>
          <Label>🎒 Lo que llevo este día al gimnasio</Label>
          <TextField value={day.equipo} onChange={(v) => updateDay(day.id, { equipo: v }, 'day:' + day.id + ':equipo')} placeholder="ej. Muñequeras, straps, cinturón, banda…" />
          <Label style={{ marginTop: 12 }}>📝 Nota del día</Label>
          <TextField multiline value={day.nota} onChange={(v) => updateDay(day.id, { nota: v }, 'day:' + day.id + ':nota')} placeholder="Texto libre: enfoque del día, recordatorios, lo que quieras…" />
        </Card>
      ) : (
        <>
          {day.equipo && (
            <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 12.5, marginBottom: 12, textAlign: 'center', whiteSpace: 'pre-wrap' }}>🎒 Llevar: {day.equipo}</div>
          )}
          {day.nota && (
            <div className="font-body" style={{ color: T.text, fontSize: 12.5, marginBottom: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)' }}>📝 {day.nota}</div>
          )}
        </>
      )}

      <div>
        {bloquesDelDia(day, state.exercises).map((b) => (
          b.par
            ? <AlternoCard key={b.id} day={day} par={b.par} />
            : <ExerciseCard key={b.id} id={b.id} dayId={day.id} />
        ))}
        {editMode && <AddExerciseForm dayId={day.id} />}
        {editMode && <AddDayForm />}
        {editMode && (
          <button onClick={() => duplicarDia(day.id)} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 10, fontSize: 12.5 }}>⧉ Duplicar este día</button>
        )}
        {editMode && (
          <button onClick={() => askConfirm({ title: '¿Eliminar este día?', text: 'Se eliminará "' + day.label + '" con todos sus ejercicios. No se puede deshacer, pero tienes tus copias de seguridad.', confirmLabel: 'Eliminar día', onConfirm: () => removeDay(day.id) })}
            className="font-body btn btn-danger" style={{ width: '100%', marginTop: 10, fontSize: 12.5 }}>
            🗑️ Eliminar este día
          </button>
        )}
      </div>
    </div>
  );
}
