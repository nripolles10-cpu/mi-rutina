import React, { useEffect, useRef, useState } from 'react';
import { Card, CheckRow, Chip, Label, MacroLine, Modal, NumInput, Stepper, useGym } from './ui.jsx';
import { CATS, MOMENTOS, OBJETIVOS, catInfo } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { Native, compressImage } from '../native/index.js';
import { fmt, fromYmd, uid, ymd } from '../utils/format.js';
import { kcalOfMacros } from '../utils/health.js';
import { describeSet } from '../utils/training.js';
import { empezarGrabacion, microDisponible } from '../utils/grabadora.js';
import {
  CARDIO_INTENSIDAD, CARDIO_MATERIAL, CARDIO_OBJETIVO, alCambiarConfig, aplicarEntreno, cardioParaGuardar, consejosDiana, debilesDe,
  dondeComprar, entenderComida, entenderEntreno, escalarPor100, firmaCompra, generarRecetas, guardarConfig, hayQueRehacerDiana,
  leerConfig, listarModelos, NUTRI_MODOS, nutricionista, planSemanal, preguntar, recomendarCardio, repasoSemanal,
} from '../utils/gemini.js';
import { DIAS_SEMANA } from '../data/catalog.js';
import { recTotals } from '../utils/comida.js';

/* =========================================================================
   IA (Gemini, gratis con tu clave). Todo se revisa antes de guardarse.
   ========================================================================= */

export function useGemini() {
  const [cfg, setCfg] = useState(leerConfig);
  useEffect(() => alCambiarConfig(setCfg), []);
  return { ...cfg, activo: !!(cfg.clave && cfg.usar) };
}

const caja = { background: 'rgba(7,11,22,0.7)', border: '1px solid rgba(140,170,255,0.18)', borderRadius: 14, padding: 12 };
const txtPeq = { color: T.muted, fontSize: 12, lineHeight: 1.5 };

function AvisoError({ msg }) {
  if (!msg) return null;
  return <div className="font-body" role="alert" style={{ color: '#FDA4AF', fontSize: 12.5, lineHeight: 1.5, marginTop: 10 }}>⚠️ {msg}</div>;
}

function Dudas({ lista }) {
  if (!lista || !lista.length) return null;
  return (
    <div className="font-body" style={{ ...caja, borderColor: 'rgba(251,191,36,0.4)', marginBottom: 12 }}>
      <div style={{ color: '#FDE68A', fontWeight: 700, fontSize: 12.5, marginBottom: 4 }}>🤔 Revisa esto</div>
      {lista.map((d, i) => <div key={i} style={{ color: T.muted, fontSize: 12, lineHeight: 1.5 }}>• {d}</div>)}
    </div>
  );
}

// Aviso cuando Gemini no está puesto
export function SinGemini({ que }) {
  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>✨ Activa Gemini (gratis)</div>
      <div className="font-body" style={txtPeq}>{que ? que + ' ' : ''}Necesitas tu clave gratuita de Google AI Studio. Ponla en ⚙️ Ajustes → ✨ Gemini (IA gratis). Es la misma clave que usas en Mi Vida.</div>
    </Card>
  );
}

/* ---------- Grabar audio o escribir (y foto opcional) ---------- */

export function Entrada({ placeholder, conFoto, conAudio = true, cargando, onEnviar, boton }) {
  const [texto, setTexto] = useState('');
  const [foto, setFoto] = useState(null);
  const [grab, setGrab] = useState(null);
  const [seg, setSeg] = useState(0);
  const [nivel, setNivel] = useState(0);
  const [err, setErr] = useState('');
  const grabRef = useRef(null);
  useEffect(() => () => { if (grabRef.current) grabRef.current.cancelar(); }, []);
  const hayMicro = conAudio && microDisponible();

  const empezar = async () => {
    setErr('');
    try {
      const g = await empezarGrabacion((m, s) => { setNivel(m); setSeg(s); });
      grabRef.current = g; setGrab(g); setSeg(0);
    } catch (e) { setErr('No se puede usar el micrófono. Dale permiso a la app en los ajustes del móvil.'); }
  };
  const parar = async () => {
    const g = grabRef.current; grabRef.current = null; setGrab(null);
    if (!g) return;
    if (g.segundos() < 1) { g.cancelar(); setErr('El audio es demasiado corto.'); return; }
    const audio = await g.parar();
    onEnviar({ audio, texto: texto.trim(), foto });
  };
  useEffect(() => { if (grab && seg >= grab.max) parar(); }, [seg]);

  const elegirFoto = async (origen) => {
    setErr('');
    try { const f = await Native.pickPhoto(origen, 1600, 0.85); if (f) setFoto(f); } catch (e) { setErr('No se pudo abrir la foto.'); }
  };

  if (grab) {
    return (
      <div style={{ ...caja, textAlign: 'center' }}>
        <div className="font-display" style={{ color: '#FB7185', fontSize: 30, fontWeight: 700 }}>● {Math.floor(seg / 60)}:{String(Math.floor(seg % 60)).padStart(2, '0')}</div>
        <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', margin: '10px 0 14px', overflow: 'hidden' }}>
          <div style={{ width: Math.min(100, nivel * 300) + '%', height: '100%', background: '#FB7185', transition: 'width .1s' }} />
        </div>
        <div className="font-body" style={{ ...txtPeq, marginBottom: 12 }}>Habla tranquilo, puedes decir muchas cosas seguidas.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { const g = grabRef.current; grabRef.current = null; setGrab(null); if (g) g.cancelar(); }} className="font-body btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
          <button onClick={parar} className="font-body btn btn-primary" style={{ flex: 2 }}>⏹ Terminar y entender</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {foto && (
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <img src={foto} alt="Foto elegida" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 12, background: '#000' }} />
          <button onClick={() => setFoto(null)} className="font-body btn btn-ghost" style={{ position: 'absolute', top: 6, right: 6, padding: '4px 10px', fontSize: 12, borderStyle: 'solid', background: 'rgba(0,0,0,0.6)' }}>✕ Quitar</button>
        </div>
      )}
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={placeholder} rows={3} className="font-body inp" style={{ resize: 'vertical', marginBottom: 10 }} />
      {conFoto && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button disabled={cargando} onClick={() => elegirFoto('camara')} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>📷 Hacer foto</button>
          <button disabled={cargando} onClick={() => elegirFoto('galeria')} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>🖼️ De la galería</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {hayMicro && <button disabled={cargando} onClick={empezar} className="font-body btn btn-ghost" style={{ flex: 1, borderStyle: 'solid' }}>🎙️ Hablar</button>}
        <button disabled={cargando || (!texto.trim() && !foto)} onClick={() => onEnviar({ texto: texto.trim(), foto })} className="font-body btn btn-primary" style={{ flex: hayMicro ? 1.4 : 1 }}>
          {cargando ? '✨ Pensando…' : (boton || '✨ Entender')}
        </button>
      </div>
      <AvisoError msg={err} />
    </div>
  );
}

/* ---------- Ajustes de Gemini ---------- */

export function GeminiAjustesCard() {
  const cfg = useGemini();
  const [ver, setVer] = useState(false);
  const [probando, setProbando] = useState(false);
  const [estado, setEstado] = useState('');
  const [modelos, setModelos] = useState([]);
  const { showToast } = useGym();
  const probar = async () => {
    setProbando(true); setEstado('');
    try {
      const l = await listarModelos(cfg.clave.trim());
      setModelos(l);
      if (!l.length) setEstado('La clave funciona, pero no hay modelos "flash" disponibles.');
      else { if (!cfg.modelo || l.indexOf(cfg.modelo) === -1) guardarConfig({ modelo: l[0] }); setEstado('✓ Conectado. Ya puedes usar la IA en Rutina, Comida, Progreso, Diana y Extras.'); showToast('✨ Gemini conectado'); }
    } catch (e) { setEstado('✗ ' + e.message); }
    setProbando(false);
  };
  return (
    <Card style={{ marginBottom: 18 }}>
      <div className="font-body" style={{ ...txtPeq, marginBottom: 10 }}>
        Con tu clave <b style={{ color: T.text }}>gratuita</b> de Google AI Studio la app puede: apuntar el entreno hablando, crear recetas para tus macros, leer etiquetas y platos con una foto, hacer tu repaso semanal y darte consejos para tus puntos débiles. Siempre revisas antes de guardar. La clave se queda en este móvil: no va en tus copias ni en lo que compartes.
      </div>
      <button onClick={() => Native.openUrl('https://aistudio.google.com/apikey')} className="font-body btn btn-ghost" style={{ width: '100%', fontSize: 12.5, marginBottom: 10 }}>🔑 Conseguir mi clave gratis (AI Studio)</button>
      <Label>Tu clave</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input type={ver ? 'text' : 'password'} autoComplete="off" spellCheck={false} placeholder="Pega tu clave (AIza…)" value={cfg.clave || ''} onChange={(e) => { guardarConfig({ clave: e.target.value.trim() }); setEstado(''); }} className="font-body inp" aria-label="Clave de Gemini" />
        <button onClick={() => setVer(!ver)} className="font-body btn btn-ghost" style={{ padding: '8px 10px', fontSize: 12 }}>{ver ? 'Ocultar' : 'Ver'}</button>
      </div>
      <button disabled={!cfg.clave || probando} onClick={probar} className="font-body btn btn-primary" style={{ width: '100%' }}>{probando ? 'Probando…' : '🔌 Probar la clave'}</button>
      {estado && <div className="font-body" style={{ ...txtPeq, marginTop: 8, color: estado[0] === '✓' ? '#A3E635' : estado[0] === '✗' ? '#FDA4AF' : T.muted }}>{estado}</div>}
      {(modelos.length > 0 || cfg.modelo) && (
        <div style={{ marginTop: 12 }}>
          <Label>Modelo (el primero suele ser el mejor)</Label>
          <select value={cfg.modelo || ''} onChange={(e) => guardarConfig({ modelo: e.target.value })} className="font-body inp">
            {(modelos.length ? modelos : [cfg.modelo]).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}
      {cfg.clave && (
        <div style={{ marginTop: 8 }}>
          <CheckRow on={cfg.usar} onClick={() => guardarConfig({ usar: !cfg.usar })}>Usar Gemini en la app</CheckRow>
        </div>
      )}
      <div className="font-body" style={{ color: T.dim, fontSize: 11, lineHeight: 1.5, marginTop: 8 }}>La capa gratuita tiene un límite de usos por minuto y por día; si lo pasas, espera un rato. No pagas nada mientras no actives la facturación en Google.</div>
    </Card>
  );
}

/* ---------- 1) Entreno hablando ---------- */

function SerieEditable({ s, i, onChange, onQuitar }) {
  const tipoTxt = { top: '🔥', backoff: '📐', warm: '🌡️', rp: '⚡', drop: '🔻' }[s.tipo] || '';
  if (s.tipo === 'rp' || s.tipo === 'drop') {
    return <div className="font-body" style={{ ...txtPeq, display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>{i + 1}. {describeSet(s)}</span><button onClick={onQuitar} className="font-body mini" aria-label="Quitar serie">✕</button></div>;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span className="font-body" style={{ color: T.muted, fontSize: 12, width: 34 }}>{i + 1}. {tipoTxt}</span>
      <NumInput value={s.weight} onChange={(v) => onChange({ ...s, weight: v })} placeholder="kg" className="font-body inp" style={{ width: 70, padding: '6px 8px' }} title="Peso" />
      <span className="font-body" style={{ color: T.dim, fontSize: 12 }}>kg ×</span>
      <NumInput value={s.reps} onChange={(v) => onChange({ ...s, reps: v })} placeholder="reps" className="font-body inp" style={{ width: 60, padding: '6px 8px' }} title="Repeticiones" />
      <span className="font-body" style={{ color: T.dim, fontSize: 12, flex: 1 }}>reps</span>
      <button onClick={onQuitar} className="font-body mini" aria-label="Quitar serie">✕</button>
    </div>
  );
}

export function VozEntrenoModal({ dayId, onClose }) {
  const { state, commit, showToast } = useGym();
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const [fuera, setFuera] = useState({});
  const g = useGemini();

  const enviar = async (e) => {
    setCargando(true); setErr('');
    try { setRes(await entenderEntreno(state, dayId, e)); setFuera({}); } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  const cambiarSerie = (exId, i, s) => setRes((r) => ({ ...r, ejercicios: r.ejercicios.map((e) => (e.id === exId ? { ...e, series: e.series.map((x, j) => (j === i ? s : x)) } : e)) }));
  const quitarSerie = (exId, i) => setRes((r) => ({ ...r, ejercicios: r.ejercicios.map((e) => (e.id === exId ? { ...e, series: e.series.filter((x, j) => j !== i) } : e)) }));
  const guardar = () => {
    const elegidos = { ...res, ejercicios: res.ejercicios.filter((e) => !fuera[e.id] && e.series.length) };
    if (!elegidos.ejercicios.length) { setErr('No hay nada marcado para guardar.'); return; }
    let records = 0;
    commit((prev) => { const r = aplicarEntreno(prev, elegidos); records = r.records; return r.state; });
    Native.vibrate(60);
    showToast(records ? '🏆 ¡' + records + (records === 1 ? ' récord nuevo' : ' récords nuevos') + '! Entreno guardado' : '✓ Entreno guardado (' + elegidos.ejercicios.length + ' ejercicios)', records ? 'pr' : undefined);
    onClose();
  };

  return (
    <Modal title="🎙️ Apuntar hablando" onClose={onClose}>
      {!g.activo ? <SinGemini que="Para apuntar el entreno hablando." /> : !res ? (
        <Card>
          <div className="font-body" style={{ ...txtPeq, marginBottom: 12 }}>
            Cuéntalo como te salga, por ejemplo: <i style={{ color: T.text }}>"Press banca 80 por 8, luego 70 por 10 y 70 por 9. Remo con barra 3 series de 10 con 60. En el jalón igual que la última vez."</i> Se guardan como el registro de hoy de cada ejercicio (y quedan como tus series actuales).
          </div>
          <Entrada placeholder="O escríbelo aquí…" cargando={cargando} onEnviar={enviar} />
          <AvisoError msg={err} />
        </Card>
      ) : (
        <div>
          {res.transcripcion && <div className="font-body" style={{ ...caja, ...txtPeq, marginBottom: 12 }}>🗣️ "{res.transcripcion}"</div>}
          <Dudas lista={res.dudas} />
          <div className="font-body" style={{ color: T.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📅 {res.fecha === ymd(new Date()) ? 'Hoy' : fromYmd(res.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          {res.ejercicios.map((e) => (
            <Card key={e.id} style={{ marginBottom: 10, opacity: fuera[e.id] ? 0.5 : 1 }}>
              <CheckRow on={!fuera[e.id]} onClick={() => setFuera((f) => ({ ...f, [e.id]: !f[e.id] }))}><b>{e.nombre}</b></CheckRow>
              {!fuera[e.id] && e.series.map((s, i) => <SerieEditable key={i} s={s} i={i} onChange={(x) => cambiarSerie(e.id, i, x)} onQuitar={() => quitarSerie(e.id, i)} />)}
              {e.nota && <div className="font-body" style={{ ...txtPeq, marginTop: 4 }}>📝 {e.nota}</div>}
            </Card>
          ))}
          <AvisoError msg={err} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={() => setRes(null)} className="font-body btn btn-ghost" style={{ flex: 1 }}>↺ Otra vez</button>
            <button onClick={guardar} className="font-body btn btn-primary" style={{ flex: 2 }}>💾 Guardar entreno</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- 2) Comida por foto, voz o texto ---------- */

export function ComidaIAModal({ fecha, momento, onClose }) {
  const { state, commit, showToast } = useGym();
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const [fuera, setFuera] = useState({});
  const [foto, setFotoUsada] = useState(null);
  const [conFoto, setConFoto] = useState(true);
  const g = useGemini();
  const { setFoto } = useGym();

  const enviar = async (e) => {
    setCargando(true); setErr('');
    try {
      setFotoUsada(e.foto || null);
      const r = await entenderComida(state, { ...e, fecha });
      if (momento) r.comidas = r.comidas.map((c) => ({ ...c, momento: e.texto && /desayun|comida|cena|merienda|snack|almuerzo/i.test(e.texto) ? c.momento : momento }));
      setRes(r); setFuera({});
    } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  const cambiar = (i, patch) => setRes((r) => ({ ...r, comidas: r.comidas.map((c, j) => {
    if (j !== i) return c;
    const n = { ...c, ...patch };
    if (patch.gramos !== undefined && n.por100 && n.gramos) Object.assign(n, escalarPor100(n.por100, n.gramos));
    else if (patch.p !== undefined || patch.c !== undefined || patch.g !== undefined) n.kcal = kcalOfMacros(n.p, n.c, n.g);
    return n;
  }) }));
  const guardar = async () => {
    const sel = res.comidas.filter((c, i) => !fuera[i] && c.nombre.trim());
    if (!sel.length) { setErr('No hay nada marcado para añadir.'); return; }
    let fotoId = null;
    if (foto && conFoto) {
      fotoId = 'com_' + uid();
      try { const peq = await compressImage(foto, 900, 0.72); if (!(await setFoto(fotoId, peq))) fotoId = null; } catch (x) { fotoId = null; }
    }
    const nuevas = sel.map((c) => ({ id: uid(), momento: c.momento, nombre: c.nombre.trim() + (c.gramos ? ' (' + fmt(c.gramos, 0) + ' g)' : c.cantidad ? ' (' + c.cantidad + ')' : ''), kcal: Math.round(c.kcal || 0), p: c.p || 0, c: c.c || 0, g: c.g || 0, ...(fotoId ? { fotoId } : {}) }));
    commit((prev) => ({ ...prev, comida: { ...prev.comida, diario: { ...prev.comida.diario, [fecha]: (prev.comida.diario[fecha] || []).concat(nuevas) } } }));
    showToast('✓ Añadido al diario');
    onClose();
  };

  return (
    <Modal title="📷 Apuntar comida con IA" onClose={onClose}>
      {!g.activo ? <SinGemini que="Para leer etiquetas y platos con una foto." /> : !res ? (
        <Card>
          <div className="font-body" style={{ ...txtPeq, marginBottom: 12 }}>
            Haz una foto a la <b style={{ color: T.text }}>etiqueta nutricional</b> (y di cuántos gramos has tomado), a tu <b style={{ color: T.text }}>plato</b>, o simplemente dilo: <i style={{ color: T.text }}>"He comido 200 g de pollo con 80 g de arroz y una manzana"</i>.
          </div>
          <Entrada conFoto placeholder="Opcional: cuánto has tomado o qué es (ej. 150 g, medio paquete…)" cargando={cargando} onEnviar={enviar} />
          <AvisoError msg={err} />
        </Card>
      ) : (
        <div>
          {res.transcripcion && <div className="font-body" style={{ ...caja, ...txtPeq, marginBottom: 12 }}>🗣️ "{res.transcripcion}"</div>}
          <Dudas lista={res.dudas} />
          {res.comidas.map((c, i) => (
            <Card key={i} style={{ marginBottom: 10, opacity: fuera[i] ? 0.5 : 1 }}>
              <CheckRow on={!fuera[i]} onClick={() => setFuera((f) => ({ ...f, [i]: !f[i] }))}><MacroLine t={c} /></CheckRow>
              {!fuera[i] && (
                <div>
                  <input value={c.nombre} onChange={(e) => cambiar(i, { nombre: e.target.value })} className="font-body inp" style={{ marginBottom: 8 }} aria-label="Nombre" />
                  <select value={c.momento} onChange={(e) => cambiar(i, { momento: e.target.value })} className="font-body inp" style={{ marginBottom: 8 }} aria-label="Momento">
                    {MOMENTOS.map((m) => <option key={m[0]} value={m[0]}>{m[1]}</option>)}
                  </select>
                  {c.por100 && (
                    <div style={{ marginBottom: 8 }}>
                      <div className="font-body" style={{ ...txtPeq, marginBottom: 4 }}>Etiqueta por 100 g: {Math.round(c.por100.kcal)} kcal · P {fmt(c.por100.p, 1)} · H {fmt(c.por100.c, 1)} · G {fmt(c.por100.g, 1)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="font-body" style={{ color: T.text, fontSize: 12.5 }}>¿Cuánto has tomado?</span>
                        <NumInput value={c.gramos} onChange={(v) => cambiar(i, { gramos: v })} placeholder="g" className="font-body inp" style={{ width: 80, padding: '6px 8px' }} title="Gramos" />
                        <span className="font-body" style={{ color: T.dim, fontSize: 12 }}>g</span>
                      </div>
                    </div>
                  )}
                  {!c.por100 && c.cantidad && <div className="font-body" style={{ ...txtPeq, marginBottom: 6 }}>Ración estimada: {c.cantidad}</div>}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['p', 'Prot.'], ['c', 'Hidr.'], ['g', 'Grasa']].map((m) => (
                      <label key={m[0]} className="font-body" style={{ flex: 1, color: T.dim, fontSize: 11 }}>{m[1]} (g)
                        <NumInput value={c[m[0]]} onChange={(v) => cambiar(i, { [m[0]]: v || 0 })} className="font-body inp" style={{ padding: '6px 8px', marginTop: 2 }} title={m[1]} />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
          {res.consejo && <div className="font-body" style={{ ...caja, ...txtPeq, marginBottom: 12 }}>💡 {res.consejo}</div>}
          {foto && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <img src={foto} alt="Tu foto" style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 10 }} />
              <CheckRow on={conFoto} onClick={() => setConFoto(!conFoto)}>Guardar la foto en el diario</CheckRow>
            </div>
          )}
          <AvisoError msg={err} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setRes(null)} className="font-body btn btn-ghost" style={{ flex: 1 }}>↺ Otra vez</button>
            <button onClick={guardar} className="font-body btn btn-primary" style={{ flex: 2 }}>➕ Añadir al diario</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- 3) Recetas para tus macros ---------- */

const TIPOS = [['cualquiera', 'Cualquiera'], ['desayuno', '🌅 Desayuno'], ['comida', '🍽️ Comida'], ['cena', '🌙 Cena'], ['snack', '🍎 Snack']];

export function RecetasIAModal({ onClose, onVer }) {
  const { state, commit, showToast } = useGym();
  const [tipo, setTipo] = useState('cualquiera');
  const [cuantas, setCuantas] = useState(2);
  const [cerrar, setCerrar] = useState(false);
  const [peticion, setPeticion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const [guardadas, setGuardadas] = useState({});
  const g = useGemini();

  const pedir = async () => {
    setCargando(true); setErr('');
    try { setRes(await generarRecetas(state, { peticion, tipo, cuantas, cerrarDia: cerrar })); setGuardadas({}); } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  const guardar = (r, i) => {
    const id = 'r_' + uid();
    const objetivos = r.objetivos.length ? r.objetivos : [state.nutricion.objetivo].filter((o) => OBJETIVOS[o]);
    const receta = { id, nombre: r.nombre, tipo: r.tipo, objetivos, p: r.p, c: r.c, g: r.g, ingredientes: r.ingredientes, pasos: r.pasos.length ? r.pasos : ['Prepara los ingredientes y cocina a tu gusto.'], propia: true };
    commit((prev) => ({ ...prev, comida: { ...prev.comida, recetas: prev.comida.recetas.concat([receta]) } }));
    setGuardadas((x) => ({ ...x, [i]: id }));
    showToast('✓ Guardada en tus recetas');
  };

  return (
    <Modal title="✨ Recetas para tus macros" onClose={onClose}>
      {!g.activo ? <SinGemini que="Para crear recetas a tu medida." /> : (
        <div>
          <Card style={{ marginBottom: 14 }}>
            <Label>¿Para cuándo?</Label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {TIPOS.map((t) => <Chip key={t[0]} active={tipo === t[0]} onClick={() => setTipo(t[0])}>{t[1]}</Chip>)}
            </div>
            <Label>¿Cuántas?</Label>
            <Stepper value={cuantas} onChange={setCuantas} min={1} max={3} step={1} />
            <div style={{ marginTop: 8 }}><CheckRow on={cerrar} onClick={() => setCerrar(!cerrar)}>🎯 Que cuadre con lo que me falta hoy</CheckRow></div>
            <Label style={{ marginTop: 8 }}>Lo que te apetece o lo que tienes en casa (opcional)</Label>
            <textarea value={peticion} onChange={(e) => setPeticion(e.target.value)} rows={2} placeholder="ej. algo con pollo y arroz, rápido, sin horno…" className="font-body inp" style={{ resize: 'vertical' }} />
            <button disabled={cargando} onClick={pedir} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 12 }}>{cargando ? '✨ Cocinando ideas…' : res ? '✨ Dame otras' : '✨ Crear recetas'}</button>
            <AvisoError msg={err} />
          </Card>
          {res && res.map((r, i) => (
            <Card key={i} style={{ marginBottom: 12 }}>
              <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>{r.nombre}</div>
              <div style={{ margin: '4px 0 6px' }}><MacroLine t={{ kcal: kcalOfMacros(r.p, r.c, r.g), p: r.p, c: r.c, g: r.g }} /> <span className="font-body" style={{ color: T.dim, fontSize: 11 }}>· por ración{r.calculados ? ' (calculado con la tabla de la app)' : ' (estimado por la IA)'}</span></div>
              {r.porQue && <div className="font-body" style={{ ...txtPeq, marginBottom: 8 }}>💡 {r.porQue}</div>}
              <div className="font-body" style={{ color: T.text, fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Ingredientes</div>
              {r.ingredientes.map((x, j) => <div key={j} className="font-body" style={txtPeq}>• {x.q !== null ? fmt(x.q, 2) + ' ' + x.u + ' ' : ''}{x.n}</div>)}
              {r.pasos.length > 0 && <div className="font-body" style={{ color: T.text, fontSize: 12.5, fontWeight: 700, margin: '8px 0 4px' }}>Pasos</div>}
              {r.pasos.map((p, j) => <div key={j} className="font-body" style={{ ...txtPeq, marginBottom: 2 }}>{j + 1}. {p}</div>)}
              {guardadas[i]
                ? <button onClick={() => onVer && onVer(guardadas[i])} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 10 }}>✓ Guardada · ver en mis recetas</button>
                : <button onClick={() => guardar(r, i)} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 10 }}>💾 Guardar en mis recetas</button>}
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ---------- 4) Repaso semanal ---------- */

function Lista({ titulo, color, items }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div className="font-body" style={{ color, fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{titulo}</div>
      {items.map((x, i) => <div key={i} className="font-body" style={{ ...txtPeq, color: T.text, marginBottom: 3 }}>• {x}</div>)}
    </div>
  );
}

const cuando = (iso) => { try { return new Date(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return ''; } };

export function RepasoSemanalCard() {
  const { state, commit } = useGym();
  const g = useGemini();
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const r = state.ia && state.ia.repaso;
  if (!g.activo) return <SinGemini que="Gemini puede hacerte un repaso de la semana con lo que has entrenado, comido y pesado." />;
  const hacer = async () => {
    setCargando(true); setErr('');
    try { const nuevo = await repasoSemanal(state); commit((prev) => ({ ...prev, ia: { ...(prev.ia || {}), repaso: nuevo } })); } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  return (
    <Card style={{ marginBottom: 14 }}>
      {r ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {r.puntuacion && <div className="font-display" style={{ width: 54, height: 54, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#04101C', background: r.puntuacion >= 7 ? '#A3E635' : r.puntuacion >= 5 ? '#FBBF24' : '#FB7185' }}>{r.puntuacion}</div>}
            <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 14.5, lineHeight: 1.35 }}>{r.titular}</div>
          </div>
          <Lista titulo="💪 Lo que va bien" color="#A3E635" items={r.bien} />
          <Lista titulo="🔧 Lo que puedes mejorar" color="#FBBF24" items={r.mejorar} />
          <Lista titulo="📋 Plan para la semana que viene" color={T.cyan} items={r.plan} />
          {r.ejercicios && r.ejercicios.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="font-body" style={{ color: '#C084FC', fontWeight: 800, fontSize: 13, marginBottom: 4 }}>🏋️ Próxima sesión</div>
              {r.ejercicios.map((e, i) => <div key={i} className="font-body" style={{ ...txtPeq, color: T.text, marginBottom: 3 }}><b>{e.nombre}:</b> {e.consejo}</div>)}
            </div>
          )}
          <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 10 }}>Hecho el {cuando(r.fecha)}</div>
        </div>
      ) : (
        <div className="font-body" style={txtPeq}>Gemini mira tus entrenos, récords, series por músculo, peso, comida, sueño y energía de la semana y te dice qué va bien, qué mejorar y qué hacer en la próxima sesión.</div>
      )}
      <button disabled={cargando} onClick={hacer} className={'font-body btn ' + (r ? 'btn-ghost' : 'btn-primary')} style={{ width: '100%', marginTop: 12 }}>{cargando ? '✨ Analizando tu semana…' : r ? '↺ Rehacer el repaso' : '✨ Hacer mi repaso semanal'}</button>
      <AvisoError msg={err} />
    </Card>
  );
}

/* ---------- 5) Diana: consejos SOLO para los puntos débiles (se reajustan solos) ---------- */

export function DianaConsejosCard() {
  const { state, commit, addExercise, showToast } = useGym();
  const g = useGemini();
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [anadidos, setAnadidos] = useState({});
  const intentado = useRef('');
  const d = state.ia && state.ia.dianaDebiles;
  const estados = (state.diana && state.diana.estados) || {};
  const debiles = debilesDe(state);
  const firma = debiles.join(',') + '#' + Object.keys(estados).sort().map((k) => k + ':' + estados[k]).join('|');
  const rehacer = g.activo && hayQueRehacerDiana(d, state);

  const hacer = async () => {
    setCargando(true); setErr('');
    try { const nuevo = await consejosDiana(state); commit((prev) => ({ ...prev, ia: { ...(prev.ia || {}), dianaDebiles: nuevo } }), { noUndo: true }); setAnadidos({}); } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  // Cambias la diana → a los 2 s se rehacen los consejos (una sola vez por cambio, aunque falle)
  useEffect(() => {
    if (!rehacer || cargando || intentado.current === firma) return undefined;
    const t = setTimeout(() => { intentado.current = firma; hacer(); }, 2000);
    return () => clearTimeout(t);
  }, [firma, rehacer, cargando]);

  if (!g.activo) return <SinGemini que="Gemini puede decirte qué hacer para mejorar los músculos que marques como punto débil." />;
  const nombreDia = (id) => { const x = (state.days || []).find((y) => y.id === id); return x ? x.label : ''; };
  const anadir = (musc, e, k) => {
    addExercise(e.dia, e.nombre, musc);
    setAnadidos((x) => ({ ...x, [k]: true }));
    showToast('➕ ' + e.nombre + ' añadido a ' + nombreDia(e.dia) + (e.pauta ? ' (' + e.pauta + ')' : ''));
  };
  const visibles = debiles.filter((k) => d && d.porMusculo && d.porMusculo[k]);
  return (
    <Card style={{ marginBottom: 14 }}>
      {!debiles.length && <div className="font-body" style={txtPeq}>Marca arriba algún músculo como <b style={{ color: '#F43F5E' }}>Punto débil</b> y aquí te saldrá qué hacer para mejorarlo. Si lo cambias a intermedio o fuerte, su consejo se quita solo.</div>}
      {debiles.length > 0 && d && d.general && visibles.length > 0 && <div className="font-body" style={{ color: T.text, fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{d.general}</div>}
      {visibles.map((k) => {
        const c = d.porMusculo[k];
        const info = catInfo(CATS, k);
        return (
          <div key={k} data-testid={'consejo-' + k} style={{ ...caja, borderLeft: '3px solid ' + info.color, marginTop: 10 }}>
            <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13.5 }}>{info.emoji} {info.label} <span style={{ color: '#F43F5E', fontSize: 11, marginLeft: 4 }}>punto débil</span></div>
            {c.titulo && c.titulo !== info.label && <div className="font-body" style={{ color: T.cyan, fontWeight: 700, fontSize: 12.5, marginTop: 2 }}>{c.titulo}</div>}
            {c.porQue && <div className="font-body" style={{ ...txtPeq, marginTop: 4 }}>{c.porQue}</div>}
            {c.acciones.map((a, j) => <div key={j} className="font-body" style={{ ...txtPeq, color: T.text, marginTop: 3 }}>✓ {a}</div>)}
            {c.ejercicios.map((e, j) => {
              const kk = k + '-' + j;
              return (
                <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                  <div className="font-body" style={{ color: T.text, fontSize: 12.5, minWidth: 0 }}>🏋️ <b>{e.nombre}</b>{e.pauta ? ' · ' + e.pauta : ''}{e.dia ? <span style={{ color: T.dim }}> · {nombreDia(e.dia)}</span> : null}</div>
                  {e.dia && (anadidos[kk]
                    ? <span className="font-body" style={{ color: '#A3E635', fontSize: 12, flexShrink: 0 }}>✓ Añadido</span>
                    : <button onClick={() => anadir(k, e, kk)} className="font-body btn btn-ghost" style={{ padding: '5px 9px', fontSize: 11.5, flexShrink: 0 }}>➕ Añadir</button>)}
                </div>
              );
            })}
          </div>
        );
      })}
      {debiles.length > 0 && (cargando || (rehacer && !err)) && <div className="font-body" style={{ ...txtPeq, marginTop: 10 }}>✨ {d ? 'Has cambiado la diana: reajustando los consejos…' : 'Preparando consejos para tus puntos débiles…'}</div>}
      {d && visibles.length > 0 && <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 10 }}>"Añadir" pone el ejercicio en ese día de tu rutina; luego ajusta sus series. Los consejos se reajustan solos cuando cambias la diana.</div>}
      {debiles.length > 0 && <button disabled={cargando} onClick={() => { intentado.current = firma; hacer(); }} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 12 }}>{cargando ? '✨ Pensando…' : '↺ Actualizar consejos'}</button>}
      <AvisoError msg={err} />
    </Card>
  );
}

/* ---------- 6) Pregúntale a tu entrenador ---------- */

export function PreguntaIACard({ tema }) {
  const { state } = useGym();
  const g = useGemini();
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [hilo, setHilo] = useState([]);
  if (!g.activo) return <SinGemini que="Pregunta lo que quieras sobre tu rutina, técnica o comida." />;
  const enviar = async (e) => {
    setCargando(true); setErr('');
    try { const r = await preguntar(state, { ...e, tema }); setHilo((h) => [r].concat(h).slice(0, 5)); } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="font-body" style={{ ...txtPeq, marginBottom: 10 }}>{tema === 'comida'
        ? <>Conoce tus macros, lo que llevas hoy y tus recetas. Ej.: <i style={{ color: T.text }}>"¿Qué ceno si me faltan 40 g de proteína?"</i>, <i style={{ color: T.text }}>"Tengo pollo, arroz y calabacín, ¿qué hago?"</i>, <i style={{ color: T.text }}>"¿Por qué sustituyo el pan?"</i></>
        : <>Conoce tu rutina, tus marcas, tu peso y tu plan de comida. Ej.: <i style={{ color: T.text }}>"¿Por qué no subo en press banca?"</i>, <i style={{ color: T.text }}>"¿Cómo hago bien el peso muerto?"</i></>}</div>
      <Entrada placeholder="Escribe tu pregunta…" cargando={cargando} onEnviar={enviar} boton="✨ Preguntar" />
      <AvisoError msg={err} />
      {hilo.map((h, i) => (
        <div key={i} style={{ ...caja, marginTop: 10 }}>
          <div className="font-body" style={{ color: T.cyan, fontWeight: 700, fontSize: 12.5, marginBottom: 4 }}>❓ {h.pregunta}</div>
          <div className="font-body" style={{ color: T.text, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{h.respuesta}</div>
        </div>
      ))}
    </Card>
  );
}


/* ---------- 7) Cardio: cuestionario → propuestas para añadir ---------- */

export function CardioIAModal({ onClose }) {
  const { state, commit, showToast } = useGym();
  const g = useGemini();
  const [q, setQ] = useState({ intensidad: 'moderado', objetivo: 'grasa', minutos: 30, dias: 3, material: [], nota: '' });
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const [anadidos, setAnadidos] = useState({});
  const set = (k, v) => setQ((x) => ({ ...x, [k]: v }));
  const pedir = async () => {
    setCargando(true); setErr('');
    try { setRes(await recomendarCardio(state, { ...q, intensidad: (CARDIO_INTENSIDAD.find((x) => x[0] === q.intensidad) || [])[1], objetivo: (CARDIO_OBJETIVO.find((x) => x[0] === q.objetivo) || [])[1] })); setAnadidos({}); } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  const anadir = (p, i) => {
    commit((prev) => ({ ...prev, cardio: (prev.cardio || []).concat([{ id: 'cardio_' + uid(), ...cardioParaGuardar(p) }]) }));
    setAnadidos((x) => ({ ...x, [i]: true }));
    showToast('🏃 Añadido a tu cardio');
  };
  return (
    <Modal title="✨ Cardio a tu medida" onClose={onClose}>
      {!g.activo ? <SinGemini que="Para que te proponga cardio según lo que quieras." /> : (
        <div>
          <Card style={{ marginBottom: 14 }}>
            <Label>¿Qué intensidad quieres?</Label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{CARDIO_INTENSIDAD.map((x) => <Chip key={x[0]} active={q.intensidad === x[0]} onClick={() => set('intensidad', x[0])}>{x[1]}</Chip>)}</div>
            <Label>¿Para qué?</Label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{CARDIO_OBJETIVO.map((x) => <Chip key={x[0]} active={q.objetivo === x[0]} onClick={() => set('objetivo', x[0])}>{x[1]}</Chip>)}</div>
            <Label>Minutos por sesión</Label>
            <Stepper value={q.minutos} onChange={(v) => set('minutos', v)} min={10} max={90} step={5} suffix="min" />
            <Label style={{ marginTop: 12 }}>Días de cardio por semana</Label>
            <Stepper value={q.dias} onChange={(v) => set('dias', v)} min={1} max={7} step={1} suffix="días" />
            <Label style={{ marginTop: 12 }}>¿Qué tienes a mano? (si no marcas nada, vale cualquiera)</Label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{CARDIO_MATERIAL.map((m) => {
              const on = q.material.indexOf(m) !== -1;
              return <Chip key={m} active={on} onClick={() => set('material', on ? q.material.filter((x) => x !== m) : q.material.concat([m]))}>{m}</Chip>;
            })}</div>
            <Label>Algo más (opcional)</Label>
            <textarea value={q.nota} onChange={(e) => set('nota', e.target.value)} rows={2} placeholder="ej. me molesta la rodilla, lo hago después de pesas, quiero algo divertido…" className="font-body inp" style={{ resize: 'vertical' }} />
            <button disabled={cargando} onClick={pedir} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 12 }}>{cargando ? '✨ Preparando propuestas…' : res ? '✨ Dame otras' : '✨ Proponme cardio'}</button>
            <AvisoError msg={err} />
          </Card>
          {res && res.resumen && <div className="font-body" style={{ ...caja, ...txtPeq, color: T.text, marginBottom: 12 }}>💡 {res.resumen}</div>}
          {res && res.propuestas.map((p, i) => (
            <Card key={i} style={{ marginBottom: 12 }}>
              <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>{p.nombre}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
                {[p.modalidad, p.metodo, p.duracion ? Math.round(p.duracion) + ' min' : '', p.intensidad, p.frecuencia].filter(Boolean).map((t, j) => <span key={j} className="font-body" style={{ fontSize: 11, color: T.cyan, border: '1px solid rgba(var(--ac-rgb),0.4)', borderRadius: 999, padding: '2px 8px' }}>{t}</span>)}
              </div>
              {p.detalle.map((x, j) => <div key={j} className="font-body" style={{ ...txtPeq, color: T.text, marginBottom: 2 }}>• {x}</div>)}
              {p.porQue && <div className="font-body" style={{ ...txtPeq, marginTop: 6 }}>💡 {p.porQue}</div>}
              {p.cuando && <div className="font-body" style={{ ...txtPeq, marginTop: 2 }}>🕒 {p.cuando}</div>}
              {anadidos[i]
                ? <div className="font-body" style={{ color: '#A3E635', fontSize: 12.5, marginTop: 10, textAlign: 'center' }}>✓ Añadido a tu cardio</div>
                : <button onClick={() => anadir(p, i)} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 10 }}>➕ Añadir a mi cardio</button>}
            </Card>
          ))}
          {res && res.avisos.map((a, i) => <div key={i} className="font-body" style={{ ...txtPeq, marginBottom: 4 }}>⚠️ {a}</div>)}
        </div>
      )}
    </Modal>
  );
}

/* ---------- 8) Plan de la semana con tus recetas ---------- */

export function PlanSemanaIAModal({ onClose }) {
  const { state, commit, showToast } = useGym();
  const g = useGemini();
  const [dias, setDias] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [peticion, setPeticion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const rec = (id) => state.comida.recetas.find((r) => r.id === id);
  const pedir = async () => {
    setCargando(true); setErr('');
    try { setRes(await planSemanal(state, { peticion, dias })); } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  const totales = (d) => { let t = { kcal: 0, p: 0, c: 0, g: 0 }; MOMENTOS.forEach((m) => d[m[0]].forEach((it) => { const r = rec(it.recetaId); if (r) { const x = recTotals(r, it.raciones); t = { kcal: t.kcal + x.kcal, p: t.p + x.p, c: t.c + x.c, g: t.g + x.g }; } })); return t; };
  const aplicar = () => {
    commit((prev) => {
      const plan = { ...prev.comida.plan };
      Object.keys(res.dias).forEach((i) => {
        const d = res.dias[i];
        const o = {};
        MOMENTOS.forEach((m) => { o[m[0]] = d[m[0]].map((it) => ({ id: uid(), recetaId: it.recetaId, raciones: it.raciones })); });
        plan[i] = o;
      });
      return { ...prev, comida: { ...prev.comida, plan } };
    });
    showToast('📅 Plan guardado. Ya tienes la lista de la compra');
    onClose();
  };
  return (
    <Modal title="✨ Planificar mi semana" onClose={onClose}>
      {!g.activo ? <SinGemini que="Para que te monte el plan de comidas de la semana." /> : (
        <div>
          <Card style={{ marginBottom: 14 }}>
            <div className="font-body" style={{ ...txtPeq, marginBottom: 10 }}>Gemini reparte tus recetas en la semana para que cada día cuadre con tus calorías y macros. Los macros los calcula la app con tus recetas.</div>
            <Label>Días</Label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{DIAS_SEMANA.map((n, i) => {
              const on = dias.indexOf(i) !== -1;
              return <Chip key={i} active={on} onClick={() => setDias(on ? dias.filter((x) => x !== i) : dias.concat([i]).sort())}>{n.slice(0, 3)}</Chip>;
            })}</div>
            <Label>Preferencias (opcional)</Label>
            <textarea value={peticion} onChange={(e) => setPeticion(e.target.value)} rows={2} placeholder="ej. entre semana cosas rápidas, sin pescado, el finde algo especial…" className="font-body inp" style={{ resize: 'vertical' }} />
            <button disabled={cargando || !dias.length} onClick={pedir} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 12 }}>{cargando ? '✨ Planificando…' : res ? '✨ Hacer otro' : '✨ Planificar'}</button>
            <AvisoError msg={err} />
          </Card>
          {res && (
            <div>
              {res.consejo && <div className="font-body" style={{ ...caja, ...txtPeq, color: T.text, marginBottom: 12 }}>💡 {res.consejo}</div>}
              {Object.keys(res.dias).sort().map((i) => (
                <Card key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 14 }}>{DIAS_SEMANA[i]}</div>
                    <MacroLine t={totales(res.dias[i])} small />
                  </div>
                  {MOMENTOS.map((m) => res.dias[i][m[0]].map((it, j) => (
                    <div key={m[0] + j} className="font-body" style={{ ...txtPeq, color: T.text }}>{m[1].split(' ')[0]} {rec(it.recetaId).nombre}{it.raciones !== 1 ? ' ×' + fmt(it.raciones, 1) : ''}</div>
                  )))}
                </Card>
              ))}
              <div className="font-body" style={{ ...txtPeq, marginBottom: 8 }}>Al guardar se sustituyen esos días en tu planificador.</div>
              <button onClick={aplicar} className="font-body btn btn-primary" style={{ width: '100%' }}>💾 Guardar en mi planificador</button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ---------- 9) Dónde comprar la lista de la compra ---------- */

export function CompraIACard({ items }) {
  const { state, commit } = useGym();
  const g = useGemini();
  const guardado = state.ia && state.ia.compra;
  const [zona, setZona] = useState((guardado && guardado.zona) || (state.ia && state.ia.zonaCompra) || 'Madrid');
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [abierto, setAbierto] = useState(false);
  if (!g.activo) return null;
  const vigente = guardado && guardado.firma === firmaCompra(items);
  const pedir = async () => {
    setCargando(true); setErr('');
    try { const r = await dondeComprar(state, items, zona.trim()); commit((prev) => ({ ...prev, ia: { ...(prev.ia || {}), compra: r, zonaCompra: zona.trim() } }), { noUndo: true }); setAbierto(true); } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  return (
    <Card style={{ marginBottom: 12 }}>
      <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 14, marginBottom: 4 }}>🏪 ¿Dónde lo compro más barato?</div>
      <div className="font-body" style={{ ...txtPeq, marginBottom: 8 }}>Gemini te dice en qué súper comprar cada cosa con buena relación calidad-precio, agrupado para ir a pocos sitios. Precios orientativos.</div>
      {guardado && (
        <div style={{ marginBottom: 8 }}>
          {!vigente && <div className="font-body" style={{ color: '#FDE68A', fontSize: 12, marginBottom: 6 }}>ℹ️ Tu lista ha cambiado: actualiza las recomendaciones.</div>}
          {guardado.resumen && <div className="font-body" style={{ color: T.text, fontSize: 13, lineHeight: 1.5 }}>{guardado.resumen}</div>}
          {guardado.total && <div className="font-body" style={{ color: '#A3E635', fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>Total aproximado: {guardado.total}</div>}
          {(abierto || vigente) && guardado.supers.map((x, i) => (
            <div key={i} style={{ ...caja, marginTop: 8 }}>
              <div className="font-body" style={{ color: T.cyan, fontWeight: 800, fontSize: 13 }}>🛒 {x.nombre}</div>
              {x.porQue && <div className="font-body" style={{ ...txtPeq, marginTop: 2 }}>{x.porQue}</div>}
              {x.que.length > 0 && <div className="font-body" style={{ ...txtPeq, color: T.text, marginTop: 4 }}>{x.que.join(' · ')}</div>}
            </div>
          ))}
          {guardado.consejos.map((c, i) => <div key={i} className="font-body" style={{ ...txtPeq, marginTop: 6 }}>💡 {c}</div>)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Tu zona (ej. Chamberí, Madrid)" className="font-body inp" aria-label="Tu zona" style={{ flex: 1 }} />
        <button disabled={cargando} onClick={pedir} className={'font-body btn ' + (vigente ? 'btn-ghost' : 'btn-primary')} style={{ flexShrink: 0 }}>{cargando ? '✨…' : guardado ? '↺ Actualizar' : '✨ Dímelo'}</button>
      </div>
      <AvisoError msg={err} />
    </Card>
  );
}

/* ---------- 10) Fotos de tus platos (recetas y diario) ---------- */

export function useFotoComida(id) {
  const { fotos, setFoto, delFoto } = useGym();
  const src = id && fotos && fotos[id] ? Native.photoSrc(fotos[id]) : null;
  const poner = async (origen) => {
    try { const f = await Native.pickPhoto(origen, 900, 0.72); if (f) await setFoto(id, f); } catch (e) { /* cancelada */ }
  };
  return { src, poner, quitar: () => delFoto(id) };
}

export function FotoRecetaCabecera({ recetaId }) {
  const { src, poner, quitar } = useFotoComida('rec_' + recetaId);
  const { askConfirm } = useGym();
  return (
    <div style={{ marginBottom: 12 }}>
      {src && <img src={src} alt="Foto del plato" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 16, display: 'block', marginBottom: 8 }} />}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => poner('camara')} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>📷 {src ? 'Otra foto' : 'Hacer foto de mi plato'}</button>
        <button onClick={() => poner('galeria')} className="font-body btn btn-ghost" style={{ flex: src ? 1 : 0.6, fontSize: 12.5 }}>🖼️ Galería</button>
        {src && <button onClick={() => askConfirm({ title: '¿Quitar la foto?', text: 'Se quita la foto de esta receta.', confirmLabel: 'Quitar', onConfirm: quitar })} className="font-body btn btn-danger" style={{ fontSize: 12.5, padding: '8px 10px' }} aria-label="Quitar foto">🗑️</button>}
      </div>
    </div>
  );
}

export function FotoMini({ id, size }) {
  const { fotos } = useGym();
  const [grande, setGrande] = useState(false);
  const src = id && fotos && fotos[id] ? Native.photoSrc(fotos[id]) : null;
  if (!src) return null;
  const t = size || 46;
  return (
    <>
      <img src={src} alt="Foto" onClick={(e) => { e.stopPropagation(); setGrande(true); }} style={{ width: t, height: t, objectFit: 'cover', borderRadius: 10, flexShrink: 0, cursor: 'zoom-in' }} />
      {grande && <Modal title="📷 Foto" onClose={() => setGrande(false)}><img src={src} alt="Foto en grande" style={{ width: '100%', borderRadius: 14 }} /></Modal>}
    </>
  );
}

/* ---------- 11) Nutricionista IA: modos, lo que tienes en casa, recetas para guardar ---------- */

const PLACEHOLDER_NUTRI = {
  casa: 'Dime lo que tienes: "tengo pollo, 3 huevos, arroz, un tomate y yogur griego"…',
  sustituir: 'Qué quieres cambiar y por qué: "no puedo con los lácteos, cambio la leche de mi batido"…',
  macros: 'Cuéntame lo que te falta hoy o déjalo en blanco y miro tus macros…',
  entreno: 'Qué entrenas hoy y a qué hora: "pierna a las 19:00"…',
  fuera: 'Dónde comes: "menú del día en un bar", "burger king", "sushi"…',
  libre: 'Escribe tu pregunta de nutrición…',
};

export function NutricionistaCard() {
  const { state, commit, showToast } = useGym();
  const g = useGemini();
  const [modo, setModo] = useState('casa');
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const [guardadas, setGuardadas] = useState({});
  if (!g.activo) return <SinGemini que="El nutricionista IA te propone comidas con lo que tengas en casa, cambios de ingredientes y qué pedir fuera." />;

  const enviar = async (e) => {
    setCargando(true); setErr(''); setGuardadas({});
    try { setRes(await nutricionista(state, { modo, ...e })); } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  const guardar = (r, i) => {
    const id = 'r_' + uid();
    const receta = { id, nombre: r.nombre, tipo: r.tipo, objetivos: r.objetivos, p: r.p, c: r.c, g: r.g, ingredientes: r.ingredientes, pasos: r.pasos.length ? r.pasos : ['Prepara los ingredientes y cocina a tu gusto.'], propia: true };
    commit((prev) => ({ ...prev, comida: { ...prev.comida, recetas: prev.comida.recetas.concat([receta]) } }));
    setGuardadas((x) => ({ ...x, [i]: true }));
    showToast('✓ Guardada en tus recetas');
  };

  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 14, marginBottom: 4 }}>🥗 Tu nutricionista IA</div>
      <div className="font-body" style={{ ...txtPeq, marginBottom: 10 }}>Elige qué necesitas. Con lo que tengas en casa, te propone comidas fáciles; cada receta la puedes guardar.</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {NUTRI_MODOS.map((m) => <Chip key={m[0]} active={modo === m[0]} onClick={() => { setModo(m[0]); setRes(null); setErr(''); }}>{m[1]}</Chip>)}
      </div>
      <Entrada key={modo} conFoto={modo === 'casa'} placeholder={PLACEHOLDER_NUTRI[modo]} cargando={cargando} onEnviar={enviar} boton="✨ Pedir ayuda" />
      <AvisoError msg={err} />
      {res && (
        <div style={{ marginTop: 12 }}>
          {res.respuesta && <div className="font-body" style={{ ...caja, color: T.text, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{res.respuesta}</div>}
          {res.faltaria.length > 0 && <div className="font-body" style={{ ...txtPeq, marginBottom: 10 }}>🛒 Te haría falta: <b style={{ color: T.text }}>{res.faltaria.join(', ')}</b></div>}
          {res.recetas.map((r, i) => (
            <div key={i} style={{ ...caja, marginBottom: 10 }}>
              <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 14 }}>{r.nombre}</div>
              <div style={{ margin: '4px 0 6px' }}><MacroLine t={{ kcal: kcalOfMacros(r.p, r.c, r.g), p: r.p, c: r.c, g: r.g }} /></div>
              {r.porQue && <div className="font-body" style={{ ...txtPeq, marginBottom: 6 }}>💡 {r.porQue}</div>}
              {r.ingredientes.map((x, j) => <div key={j} className="font-body" style={txtPeq}>• {x.q !== null ? fmt(x.q, 2) + ' ' + x.u + ' ' : ''}{x.n}</div>)}
              {r.pasos.map((p, j) => <div key={j} className="font-body" style={{ ...txtPeq, marginTop: 2 }}>{j + 1}. {p}</div>)}
              {guardadas[i]
                ? <div className="font-body" style={{ color: '#A3E635', fontSize: 12.5, marginTop: 8 }}>✓ Guardada en tus recetas</div>
                : <button onClick={() => guardar(r, i)} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 12.5 }}>💾 Guardar en mis recetas</button>}
            </div>
          ))}
          {res.consejo && <div className="font-body" style={{ ...txtPeq }}>💡 {res.consejo}</div>}
        </div>
      )}
    </Card>
  );
}
