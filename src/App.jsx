import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GlobalStyle } from './components/GlobalStyle.jsx';
import { TimerModal } from './components/TimerModal.jsx';
import { ConfirmDialog, GymContext, Toast } from './components/ui.jsx';
import { ACCENT, BG_IMAGE, T } from './data/theme.js';
import defaultData from './data/defaultData.json';
import { Native, NOTIF_ID_DESCANSO } from './native/index.js';
import { handleBack, useBackHandler } from './native/back.js';
import { migrateState, normalizeExercise, takePendingPhotos } from './state/migrate.js';
import { BACKUP_KEY, readInitialState } from './state/storage.js';
import { AjustesScreen } from './tabs/Ajustes.jsx';
import { CardioTab } from './tabs/CardioTab.jsx';
import { ComidaTab } from './tabs/ComidaTab.jsx';
import { DianaFisicaTab } from './tabs/DianaTab.jsx';
import { ExtrasTab } from './tabs/ExtrasTab.jsx';
import { ProgresoTab } from './tabs/ProgresoTab.jsx';
import { RutinaTab } from './tabs/RutinaTab.jsx';
import { stateFromDefaults } from './utils/defaults.js';
import { clone, fmt, fmtMS, uid } from './utils/format.js';
import { applyImport } from './utils/share.js';
import { activeExerciseIds, bestSerie1, computeScore, normalizeSet } from './utils/training.js';

const NOTIF_DESCANSO = { id: NOTIF_ID_DESCANSO, title: '⏱️ Descanso terminado', body: 'Empieza la siguiente serie' };

export function App() {
  const [state, setState] = useState(null);
  const [toast, setToast] = useState(null);
  const [screen, setScreen] = useState('main');
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [fotos, setFotosState] = useState(() => Native.loadFotos());
  const [hasBackup, setHasBackup] = useState(() => { try { return !!localStorage.getItem(BACKUP_KEY); } catch (e) { return false; } });
  const [timer, setTimer] = useState(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const timerRef = useRef(null);
  const backupRef = useRef(null);
  const saveTimer = useRef(null);
  const stateRef = useRef(null);
  const warnedRef = useRef(false);
  const fotosRef = useRef(fotos);
  const noSaveRef = useRef(false); // true si al arrancar no se pudo rescatar lo guardado: no se escribe encima
  const toastTimer = useRef(null);
  useEffect(() => { stateRef.current = state; }, [state]);

  const showToast = useCallback((msg, kind, ms) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, kind });
    toastTimer.current = setTimeout(() => { toastTimer.current = null; setToast(null); }, ms || 2800);
  }, []);
  const askConfirm = useCallback((opts) => setConfirmDlg(opts), []);

  /* ---------- guardado ---------- */
  const writeOut = useCallback((data) => {
    if (noSaveRef.current) return;
    const ok = Native.saveState(data);
    if (!ok && !warnedRef.current) { warnedRef.current = true; showToast('No se pudo guardar: el almacenamiento está lleno o bloqueado', 'warn'); }
  }, [showToast]);

  const setFotosMap = (m) => { fotosRef.current = m; setFotosState(m); };

  useEffect(() => {
    Native.onSaveError((msg) => showToast(msg, 'warn', 7000));
    const res = readInitialState();
    const initial = res.state;
    noSaveRef.current = !!res.sinGuardar;
    stateRef.current = initial;
    setState(initial);
    writeOut(initial);
    const avisos = Native.problemasArranque();
    if (res.aviso) avisos.unshift(res.aviso);
    if (avisos.length) showToast(avisos.join(' '), 'warn', 9000);
    // Fotos que traían los datos de la app antigua: se guardan aparte, una a una
    const pend = takePendingPhotos();
    if (pend) {
      (async () => {
        let m = fotosRef.current;
        for (const id of Object.keys(pend)) { const r = await Native.savePhoto(id, pend[id], m); if (r.ok) m = r.mapa; }
        setFotosMap(m);
      })();
    }
    Native.ocultarSplash();
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveTimer.current = null; if (stateRef.current) writeOut(stateRef.current); }, 250);
  }, [writeOut]);

  // Al salir de la app o minimizarla se guarda al instante, sin esperar al temporizador
  const flush = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    if (stateRef.current) writeOut(stateRef.current);
    return Native.flush();
  }, [writeOut]);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    const quitarEstado = Native.onAppStateChange((activa) => { if (!activa) flush(); });
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', flush); quitarEstado(); };
  }, [flush]);

  const persistNow = useCallback((next) => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    stateRef.current = next;
    writeOut(next);
  }, [writeOut]);

  // Aplica un cambio al estado. El siguiente estado se calcula FUERA del actualizador de React a partir de stateRef
  // (que siempre tiene el último estado, porque todas las vías que cambian el estado lo actualizan a la vez).
  // El segundo parámetro (opts) se mantiene por compatibilidad y ya no se usa: se quitó deshacer/rehacer.
  const commit = useCallback((fn, opts) => {
    const prev = stateRef.current;
    if (!prev) return false;
    const next = fn(prev);
    if (!next || next === prev) return false;
    stateRef.current = next;
    setState(next);
    scheduleSave();
    return true;
  }, [scheduleSave]);

  /* ---------- botón Atrás de Android y Escape en el PC ---------- */
  useBackHandler(screen === 'settings', () => setScreen('main'));
  useEffect(() => {
    const quitar = Native.onBackButton(() => { if (!handleBack()) Native.exitApp(); });
    const onKey = (e) => { if (e.key === 'Escape') handleBack(); };
    window.addEventListener('keydown', onKey);
    return () => { quitar(); window.removeEventListener('keydown', onKey); };
  }, []);

  /* ---------- pantalla encendida (Ajustes) ---------- */
  const pantallaEncendida = !!(state && state.preferencias && state.preferencias.pantallaEncendida);
  useEffect(() => {
    if (!state) return undefined;
    Native.keepAwake(pantallaEncendida);
    const quitar = Native.onAppStateChange((activa) => { if (activa) Native.keepAwake(pantallaEncendida); });
    return quitar;
  }, [pantallaEncendida, !!state]);

  /* ---------- fotos (almacén aparte, fuera del estado principal) ---------- */
  // Las fotos solo se muestran si se han podido guardar (si no, al reabrir la app habrían desaparecido)
  const setFoto = useCallback(async (id, dataUrl) => {
    const r = await Native.savePhoto(id, dataUrl, fotosRef.current);
    if (!r.ok) { showToast('No se pudo guardar la foto: almacenamiento lleno o bloqueado', 'warn'); return false; }
    setFotosMap(r.mapa);
    return true;
  }, [showToast]);
  const delFoto = useCallback(async (id) => {
    const r = await Native.deletePhoto(id, fotosRef.current);
    if (!r.ok) { showToast('No se pudo quitar la foto: almacenamiento bloqueado', 'warn'); return; }
    setFotosMap(r.mapa);
  }, [showToast]);

  /* ---------- acciones de la rutina ---------- */
  const updateExercise = useCallback((id, patch, key) => {
    commit((prev) => (prev.exercises[id] ? { ...prev, exercises: { ...prev.exercises, [id]: { ...prev.exercises[id], ...patch } } } : prev), { key });
  }, [commit]);
  const updateCardio = useCallback((id, patch, key) => {
    commit((prev) => ({ ...prev, cardio: prev.cardio.map((c) => (c.id === id ? { ...c, ...patch } : c)) }), { key });
  }, [commit]);
  const addCardio = useCallback(() => {
    commit((prev) => ({ ...prev, cardio: prev.cardio.concat([{ id: 'cardio_' + uid(), name: 'Nuevo cardio', frecuencia: '', detalle: '' }]) }));
  }, [commit]);
  const removeCardio = useCallback((id) => {
    commit((prev) => ({ ...prev, cardio: prev.cardio.filter((c) => c.id !== id) }));
    showToast('Cardio quitado');
  }, [commit, showToast]);

  const addExercise = useCallback((dayId, name, cat) => {
    commit((prev) => {
      const newId = 'custom_' + uid();
      const newEx = normalizeExercise({ name, cat, comentario: '', currentSets: [normalizeSet({}, 0), normalizeSet({}, 1)], history: [] });
      return { ...prev, exercises: { ...prev.exercises, [newId]: newEx }, days: prev.days.map((d) => (d.id === dayId ? { ...d, ids: d.ids.concat([newId]) } : d)) };
    });
  }, [commit]);
  const removeFromDay = useCallback((dayId, exId) => {
    commit((prev) => ({ ...prev, days: prev.days.map((d) => (d.id === dayId ? { ...d, ids: d.ids.filter((i) => i !== exId) } : d)) }));
    showToast('Ejercicio quitado del día');
  }, [commit, showToast]);
  const moveExercise = useCallback((dayId, exId, dir) => {
    commit((prev) => ({
      ...prev,
      days: prev.days.map((d) => {
        if (d.id !== dayId) return d;
        const ids = d.ids.slice();
        const i = ids.indexOf(exId), j = i + dir;
        if (i === -1 || j < 0 || j >= ids.length) return d;
        const tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
        return { ...d, ids };
      }),
    }));
  }, [commit]);
  const addSerie = useCallback((exId) => {
    commit((prev) => {
      const ex = prev.exercises[exId]; if (!ex || ex.currentSets.length >= 8) return prev;
      return { ...prev, exercises: { ...prev.exercises, [exId]: { ...ex, currentSets: ex.currentSets.concat([normalizeSet({ tipo: 'backoff' }, 1)]) } } };
    });
  }, [commit]);
  const removeSerieAt = useCallback((exId, idx) => {
    commit((prev) => {
      const ex = prev.exercises[exId]; if (!ex || ex.currentSets.length <= 1) return prev;
      return { ...prev, exercises: { ...prev.exercises, [exId]: { ...ex, currentSets: ex.currentSets.filter((_, i) => i !== idx) } } };
    });
  }, [commit]);

  const setActiveDay = useCallback((dayId) => { commit((prev) => ({ ...prev, meta: { ...prev.meta, activeDay: dayId } })); }, [commit]);
  const setActiveTab = useCallback((tab) => { commit((prev) => ({ ...prev, meta: { ...prev.meta, activeTab: tab } })); }, [commit]);
  const toggleEditMode = useCallback(() => { commit((prev) => ({ ...prev, meta: { ...prev.meta, editMode: !prev.meta.editMode } })); }, [commit]);
  const setPreferencia = useCallback((patch) => {
    commit((prev) => ({ ...prev, preferencias: { ...(prev.preferencias || {}), ...patch } }));
  }, [commit]);

  const updateDay = useCallback((dayId, patch, key) => {
    commit((prev) => ({ ...prev, days: prev.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)) }), { key });
  }, [commit]);
  const addDay = useCallback((label, equipo) => {
    const id = 'day_' + uid();
    commit((prev) => ({ ...prev, days: prev.days.concat([{ id, label, equipo: equipo || '', nota: '', ids: [] }]), meta: { ...prev.meta, activeDay: id } }));
    showToast('Día creado ✓');
  }, [commit, showToast]);
  const removeDay = useCallback((dayId) => {
    commit((prev) => {
      const i = prev.days.findIndex((d) => d.id === dayId);
      const days = prev.days.filter((d) => d.id !== dayId);
      let activeDay = prev.meta.activeDay;
      if (activeDay === dayId) activeDay = days.length ? days[Math.min(i, days.length - 1)].id : null;
      return { ...prev, days, meta: { ...prev.meta, activeDay } };
    });
    showToast('Día eliminado');
  }, [commit, showToast]);
  const moveDay = useCallback((dayId, dir) => {
    commit((prev) => {
      const days = prev.days.slice();
      const i = days.findIndex((d) => d.id === dayId), j = i + dir;
      if (i === -1 || j < 0 || j >= days.length) return prev;
      const tmp = days[i]; days[i] = days[j]; days[j] = tmp;
      return { ...prev, days };
    });
  }, [commit]);

  /* ---------- registro del día, peso, ajustes ---------- */
  const saveEntry = useCallback((id) => {
    const prev = stateRef.current; const ex = prev.exercises[id];
    if (!ex) return;
    const newEntry = { date: new Date().toISOString(), sets: clone(ex.currentSets) };
    const prevHistory = ex.history || [];
    const prevBest = prevHistory.reduce((m, h) => Math.max(m, computeScore(h.sets && h.sets[0])), 0);
    const newScore = computeScore(newEntry.sets[0]);
    const last = prevHistory.length ? prevHistory[prevHistory.length - 1] : null;
    const prevLatestScore = last ? computeScore(last.sets && last.sets[0]) : null;
    const isPR = newScore > 0 && newScore > prevBest;
    const isDown = prevLatestScore !== null && newScore > 0 && newScore < prevLatestScore;
    const next = { ...prev, exercises: { ...prev.exercises, [id]: { ...ex, history: prevHistory.concat([newEntry]) } } };
    setState(next); persistNow(next);
    if (isPR) showToast('🏆 ¡Nuevo récord en ' + ex.name + '!', 'pr');
    else if (isDown) showToast('Anotado — ha bajado un poco en ' + ex.name, 'warn');
    else showToast('Progreso guardado ✓');
  }, [persistNow, showToast]);

  const logPeso = useCallback((kg) => {
    const prevState = stateRef.current;
    const p = prevState.peso;
    let reached = false;
    if (p.objetivoKg && p.direccion && !p.objetivoAlcanzado) reached = p.direccion === 'bajar' ? kg <= p.objetivoKg : kg >= p.objetivoKg;
    commit((prev) => ({ ...prev, peso: { ...prev.peso, historial: prev.peso.historial.concat([{ id: uid(), date: new Date().toISOString(), kg }]), objetivoAlcanzado: prev.peso.objetivoAlcanzado || reached } }));
    showToast(reached ? '🏆 ¡Objetivo de peso alcanzado! ' + fmt(kg, 2) + ' kg' : 'Peso registrado ✓', reached ? 'pr' : undefined);
  }, [commit, showToast]);

  const guardarFormulario = useCallback((draft) => {
    commit((prev) => {
      const pesoHistorial = prev.peso.historial.length ? prev.peso.historial : [{ id: uid(), date: new Date().toISOString(), kg: draft.pesoInicialKg }];
      let direccion = null;
      if (draft.objetivoPesoKg) direccion = draft.pesoInicialKg > draft.objetivoPesoKg ? 'bajar' : draft.pesoInicialKg < draft.objetivoPesoKg ? 'subir' : null;
      const objetivoCambio = prev.peso.objetivoKg !== draft.objetivoPesoKg;
      return { ...prev, formulario: { ...prev.formulario, ...draft },
        peso: { ...prev.peso, historial: pesoHistorial, objetivoKg: draft.objetivoPesoKg, direccion, objetivoAlcanzado: objetivoCambio ? false : prev.peso.objetivoAlcanzado } };
    });
    showToast('Datos guardados ✓');
  }, [commit, showToast]);

  /* ---------- importar / restaurar / reiniciar (antes guardan una copia del estado anterior) ---------- */
  const backupPrev = (prev) => {
    backupRef.current = prev;
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify(prev)); } catch (e) { /* sin espacio: queda solo en memoria */ }
    setHasBackup(true);
  };
  const replaceState = (next) => { stateRef.current = next; setState(next); persistNow(next); };

  const importObj = useCallback(async (obj, mode) => {
    const prev = stateRef.current;
    backupPrev(prev);
    replaceState(applyImport(prev, obj, mode));
    if (mode === 'todo' && obj.fotos) {
      let m = fotosRef.current;
      for (const id of Object.keys(obj.fotos)) { const r = await Native.savePhoto(id, obj.fotos[id], m); if (r.ok) m = r.mapa; }
      setFotosMap(m);
    }
    showToast('Importación completada ✓');
  }, [persistNow, showToast]);
  const restoreBackup = useCallback(() => {
    let snap = backupRef.current;
    if (!snap) { try { snap = JSON.parse(localStorage.getItem(BACKUP_KEY)); } catch (e) { snap = null; } }
    if (!snap) { showToast('No hay copia anterior disponible', 'warn'); return; }
    replaceState(migrateState(snap));
    showToast('Estado anterior restaurado ✓');
  }, [persistNow, showToast]);
  const resetAll = useCallback(() => {
    backupPrev(stateRef.current);
    replaceState(stateFromDefaults(defaultData));
    showToast('Datos restablecidos');
  }, [persistNow, showToast]);

  /* ---------- objetivos ---------- */
  const suggestObjetivo = useCallback((id) => {
    const ex = stateRef.current.exercises[id]; if (!ex) return;
    const record = bestSerie1(ex);
    if (record === null) { showToast('Necesitas un peso registrado en la serie 1 antes de sugerir un objetivo.', 'warn'); return; }
    const objetivoKg = Math.round(record * 1.125 * 2) / 2; // +12,5%, redondeado a 0,5 kg
    updateExercise(id, { objetivo: { text: fmt(objetivoKg, 2) + ' kg (sugerido, +12,5%)', value: objetivoKg, sugerido: true } });
    showToast('✅ Objetivo sugerido');
  }, [updateExercise, showToast]);
  const rellenarObjetivosFaltantes = useCallback(() => {
    let count = 0;
    commit((prev) => {
      const nextEx = { ...prev.exercises };
      activeExerciseIds(prev).forEach((id) => {
        const ex = nextEx[id];
        if (ex && !ex.objetivo) {
          const record = bestSerie1(ex);
          if (record !== null) { const o = Math.round(record * 1.125 * 2) / 2; nextEx[id] = { ...ex, objetivo: { text: fmt(o, 2) + ' kg (sugerido, +12,5%)', value: o, sugerido: true } }; count += 1; }
        }
      });
      return { ...prev, exercises: nextEx };
    });
    showToast(count > 0 ? '✅ ' + count + ' objetivo(s) rellenado(s)' : 'No hay ejercicios sin objetivo con marca registrada');
  }, [commit, showToast]);

  /* ---------- temporizador de descanso ----------
     Cuenta con la hora real (Date.now). En el móvil además programa una notificación para el final,
     que suena aunque la pantalla esté bloqueada o la app cerrada. */
  const programarAviso = useCallback(async (end) => {
    const r = await Native.scheduleNotification({ ...NOTIF_DESCANSO, at: end });
    let exacto = null;
    if (r.ok) { const st = await Native.notificationStatus(); exacto = st.exacto; }
    const t = timerRef.current;
    if (t && t.end === end) {
      const nt = { ...t, notif: { ok: !!r.ok, motivo: r.motivo || null, exacto } };
      timerRef.current = nt; setTimer(nt);
      if (r.motivo === 'permiso') showToast('Sin permiso de notificaciones: el aviso solo sonará con la app abierta. Actívalo en Ajustes del móvil → Apps → Mi Rutina → Notificaciones.', 'warn', 8000);
    }
  }, [showToast]);
  const startTimer = useCallback((sec) => {
    Native.unlockAudio(); // se llama dentro del toque: así el pitido final puede sonar
    const end = Date.now() + sec * 1000;
    const t = { end, total: sec, notif: null };
    timerRef.current = t; setTimer(t); setNowMs(Date.now());
    programarAviso(end);
  }, [programarAviso]);
  const addTimer = useCallback((sec) => {
    const t = timerRef.current; if (!t) return;
    const end = Math.max(Date.now() + 1000, t.end + sec * 1000);
    const nt = { ...t, end, total: Math.max(5, t.total + sec) };
    timerRef.current = nt; setTimer(nt);
    programarAviso(end);
  }, [programarAviso]);
  const stopTimer = useCallback(() => { Native.cancelNotification(NOTIF_DESCANSO.id); timerRef.current = null; setTimer(null); }, []);
  useEffect(() => {
    if (!timer) return undefined;
    let done = false;
    const check = () => {
      const now = Date.now();
      setNowMs(now);
      const t = timerRef.current;
      if (!done && t && now >= t.end) {
        done = true;
        const conNotificacion = !!(t.notif && t.notif.ok);
        timerRef.current = null; setTimer(null); setTimerOpen(false);
        Native.vibrate(800);
        if (!conNotificacion) Native.beep(); // si hay notificación, ya suena ella (no se duplica el sonido)
        showToast('⏱️ ¡Descanso terminado! Empieza la siguiente serie', 'pr');
      }
    };
    const iv = setInterval(check, 250);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, [timer, showToast]);

  if (!state) {
    return <div style={{ background: T.bg, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="font-display" style={{ color: T.text, fontSize: 24, fontWeight: 700, letterSpacing: '0.06em' }}>CARGANDO TU RUTINA…</div></div>;
  }

  const ctx = {
    state, commit, fotos, setFoto, delFoto, showToast, askConfirm,
    updateExercise, updateCardio, addCardio, removeCardio,
    setActiveDay, setActiveTab, toggleEditMode, updateDay, addDay, removeDay, moveDay,
    addExercise, removeFromDay, moveExercise, addSerie, removeSerieAt,
    saveEntry, logPeso, guardarFormulario, resetAll, importObj, restoreBackup, hasBackup,
    suggestObjetivo, rellenarObjetivosFaltantes, setPreferencia,
  };

  const TABS = [
    { id: 'rutina', label: 'Rutina', emoji: '🏋️' },
    { id: 'cardio', label: 'Cardio', emoji: '🏃' },
    { id: 'progreso', label: 'Progreso', emoji: '📊' },
    { id: 'fisico', label: 'Diana', emoji: '🎯' },
    { id: 'comida', label: 'Comida', emoji: '🍽️' },
    { id: 'extras', label: 'Extras', emoji: '✨' },
  ];
  const tab = state.meta.activeTab;

  return (
    <GymContext.Provider value={ctx}>
      <GlobalStyle />
      <div style={{ height: '100%', maxWidth: 460, margin: '0 auto', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="font-body">
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(to bottom, rgba(6,9,19,0.50), rgba(6,9,19,0.90) 55%, #060913 94%), url(' + BG_IMAGE + ')', backgroundSize: 'cover', backgroundPosition: 'center 35%' }} />
        <div className="bg-grid" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

        <Toast toast={toast} />
        <ConfirmDialog dlg={confirmDlg} onClose={() => setConfirmDlg(null)} />
        {timerOpen && <TimerModal timer={timer} nowMs={nowMs} startTimer={startTimer} addTimer={addTimer} stopTimer={stopTimer} onClose={() => setTimerOpen(false)} />}

        {screen === 'settings' ? (
          <div className="gt-scroll" style={{ position: 'relative', zIndex: 1, overflowY: 'auto', flex: 1, paddingBottom: 'calc(var(--safe-bottom) + var(--kb-pad, 0px))' }}>
            <div style={{ padding: 'calc(14px + var(--safe-top)) 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setScreen('main')} className="font-body btn btn-ghost" style={{ padding: '8px 12px', borderStyle: 'solid' }}>✕ Cerrar</button>
            </div>
            <AjustesScreen onClose={() => setScreen('main')} />
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', zIndex: 1, padding: 'calc(14px + var(--safe-top)) 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 8 }}>
              <div className="font-display" style={{ fontSize: 'clamp(19px, 6.4vw, 26px)', fontWeight: 700, letterSpacing: '0.07em', color: '#FFFFFF', textShadow: '0 0 14px rgba(34,211,238,0.55)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>MI RUTINA 💪</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setTimerOpen(true)} title="Descanso entre series" className="font-body hbtn" style={timer ? { width: 'auto', padding: '0 8px', fontSize: 12, borderColor: ACCENT, color: '#FFFFFF' } : undefined}>⏱️{timer ? ' ' + fmtMS(timer.end - nowMs) : ''}</button>
                <button onClick={() => setScreen('settings')} title="Ajustes" className="font-body hbtn">⚙️</button>
              </div>
            </div>

            <div className="gt-scroll" style={{ position: 'relative', zIndex: 1, padding: '4px 16px calc(84px + var(--kb-pad, 0px))', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {tab === 'rutina' && <RutinaTab />}
              {tab === 'cardio' && <CardioTab />}
              {tab === 'progreso' && <ProgresoTab />}
              {tab === 'fisico' && <DianaFisicaTab />}
              {tab === 'comida' && <ComidaTab />}
              {tab === 'extras' && <ExtrasTab />}
            </div>

            <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, background: 'rgba(6,9,19,0.9)', WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(140,170,255,0.2)', display: 'flex', padding: '8px 6px calc(8px + var(--safe-bottom))' }}>
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 2px', cursor: 'pointer', position: 'relative' }}>
                    {active && <span style={{ position: 'absolute', top: -9, width: 28, height: 3, borderRadius: 3, background: T.grad, boxShadow: '0 0 12px rgba(34,211,238,0.9)' }} />}
                    <span style={{ fontSize: 20, opacity: active ? 1 : 0.5, filter: active ? 'drop-shadow(0 0 8px rgba(34,211,238,0.7))' : 'none', transform: active ? 'scale(1.12)' : 'none', transition: 'all .15s' }}>{t.emoji}</span>
                    <span className="font-body" style={{ fontSize: 10.5, fontWeight: 700, color: active ? '#FFFFFF' : '#6F7A96' }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </GymContext.Provider>
  );
}
