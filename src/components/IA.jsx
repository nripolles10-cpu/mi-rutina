import React, { useEffect, useRef, useState } from 'react';
import { Card, CheckRow, Chip, Label, MacroLine, Modal, NumInput, Stepper, useGym } from './ui.jsx';
import { CATS, MOMENTOS, OBJETIVOS, catInfo } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { Native } from '../native/index.js';
import { fmt, fromYmd, uid, ymd } from '../utils/format.js';
import { kcalOfMacros } from '../utils/health.js';
import { describeSet } from '../utils/training.js';
import { empezarGrabacion, microDisponible } from '../utils/grabadora.js';
import {
  alCambiarConfig, aplicarEntreno, consejosDiana, entenderComida, entenderEntreno, escalarPor100, firmaDiana, generarRecetas,
  guardarConfig, leerConfig, listarModelos, preguntar, repasoSemanal,
} from '../utils/gemini.js';

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
  const g = useGemini();

  const enviar = async (e) => {
    setCargando(true); setErr('');
    try {
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
  const guardar = () => {
    const sel = res.comidas.filter((c, i) => !fuera[i] && c.nombre.trim());
    if (!sel.length) { setErr('No hay nada marcado para añadir.'); return; }
    const nuevas = sel.map((c) => ({ id: uid(), momento: c.momento, nombre: c.nombre.trim() + (c.gramos ? ' (' + fmt(c.gramos, 0) + ' g)' : c.cantidad ? ' (' + c.cantidad + ')' : ''), kcal: Math.round(c.kcal || 0), p: c.p || 0, c: c.c || 0, g: c.g || 0 }));
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

/* ---------- 5) Diana: consejos para los puntos débiles ---------- */

export function DianaConsejosCard() {
  const { state, commit, addExercise, showToast } = useGym();
  const g = useGemini();
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [anadidos, setAnadidos] = useState({});
  const d = state.ia && state.ia.diana;
  const estados = (state.diana && state.diana.estados) || {};
  const hayMarcados = Object.keys(estados).some((k) => estados[k] === 'debil' || estados[k] === 'intermedio');
  if (!g.activo) return <SinGemini que="Gemini puede decirte qué hacer para mejorar tus puntos débiles." />;
  const hacer = async () => {
    setCargando(true); setErr('');
    try { const nuevo = await consejosDiana(state); commit((prev) => ({ ...prev, ia: { ...(prev.ia || {}), diana: nuevo } })); setAnadidos({}); } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  const desactualizado = d && d.firma !== firmaDiana(state);
  const nombreDia = (id) => { const x = (state.days || []).find((y) => y.id === id); return x ? x.label : ''; };
  const anadir = (c, e, k) => {
    const cat = c.musculo && CATS[c.musculo] ? c.musculo : Object.keys(CATS)[0];
    addExercise(e.dia, e.nombre, cat);
    setAnadidos((x) => ({ ...x, [k]: true }));
    showToast('➕ ' + e.nombre + ' añadido a ' + nombreDia(e.dia) + (e.pauta ? ' (' + e.pauta + ')' : ''));
  };
  return (
    <Card style={{ marginBottom: 14 }}>
      {!d && <div className="font-body" style={txtPeq}>{hayMarcados ? 'Gemini mira tus puntos débiles (y los intermedios), los ejercicios y las series que les das y te dice qué cambiar para que mejoren.' : 'Marca arriba algún músculo como "Punto débil" o "Intermedio" y Gemini te dirá qué hacer para mejorarlo.'}</div>}
      {d && (
        <div>
          {desactualizado && <div className="font-body" style={{ color: '#FDE68A', fontSize: 12, marginBottom: 8 }}>ℹ️ Has cambiado la diana desde estos consejos: actualízalos abajo.</div>}
          {d.general && <div className="font-body" style={{ color: T.text, fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{d.general}</div>}
          {d.consejos.map((c, i) => {
            const info = c.musculo ? catInfo(CATS, c.musculo) : null;
            return (
              <div key={i} style={{ ...caja, borderLeft: '3px solid ' + (info ? info.color : T.cyan), marginTop: 10 }}>
                <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13.5 }}>{info ? info.emoji + ' ' : ''}{c.titulo}{c.musculo && estados[c.musculo] === 'debil' ? <span style={{ color: '#F43F5E', fontSize: 11, marginLeft: 6 }}>punto débil</span> : null}</div>
                {c.porQue && <div className="font-body" style={{ ...txtPeq, marginTop: 4 }}>{c.porQue}</div>}
                {c.acciones.map((a, j) => <div key={j} className="font-body" style={{ ...txtPeq, color: T.text, marginTop: 3 }}>✓ {a}</div>)}
                {c.ejercicios.map((e, j) => {
                  const k = i + '-' + j;
                  return (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                      <div className="font-body" style={{ color: T.text, fontSize: 12.5, minWidth: 0 }}>🏋️ <b>{e.nombre}</b>{e.pauta ? ' · ' + e.pauta : ''}{e.dia ? <span style={{ color: T.dim }}> · {nombreDia(e.dia)}</span> : null}</div>
                      {e.dia && (anadidos[k]
                        ? <span className="font-body" style={{ color: '#A3E635', fontSize: 12, flexShrink: 0 }}>✓ Añadido</span>
                        : <button onClick={() => anadir(c, e, k)} className="font-body btn btn-ghost" style={{ padding: '5px 9px', fontSize: 11.5, flexShrink: 0 }}>➕ Añadir</button>)}
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 10 }}>Hecho el {cuando(d.fecha)}. "Añadir" pone el ejercicio en ese día de tu rutina; luego ajusta sus series.</div>
        </div>
      )}
      <button disabled={cargando || !hayMarcados} onClick={hacer} className={'font-body btn ' + (d && !desactualizado ? 'btn-ghost' : 'btn-primary')} style={{ width: '100%', marginTop: 12 }}>{cargando ? '✨ Pensando…' : d ? '↺ Actualizar consejos' : '✨ ¿Qué hago con mis puntos débiles?'}</button>
      <AvisoError msg={err} />
    </Card>
  );
}

/* ---------- 6) Pregúntale a tu entrenador ---------- */

export function PreguntaIACard() {
  const { state } = useGym();
  const g = useGemini();
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState('');
  const [hilo, setHilo] = useState([]);
  if (!g.activo) return <SinGemini que="Pregunta lo que quieras sobre tu rutina, técnica o comida." />;
  const enviar = async (e) => {
    setCargando(true); setErr('');
    try { const r = await preguntar(state, e); setHilo((h) => [r].concat(h).slice(0, 5)); } catch (x) { setErr(x.message); }
    setCargando(false);
  };
  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="font-body" style={{ ...txtPeq, marginBottom: 10 }}>Conoce tu rutina, tus marcas, tu peso y tu plan de comida. Ej.: <i style={{ color: T.text }}>"¿Por qué no subo en press banca?"</i>, <i style={{ color: T.text }}>"¿Qué ceno si me faltan 40 g de proteína?"</i></div>
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

