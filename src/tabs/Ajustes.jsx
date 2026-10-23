import React, { useState } from 'react';
import { Card, CheckRow, Chip, Label, LabeledNum, Modal, SectionTitle, SupRow, useGym } from '../components/ui.jsx';
import { ACTIVIDADES } from '../data/catalog.js';
import { T } from '../data/theme.js';
import { Native } from '../native/index.js';
import { RECOVERY_PREFIX, listRescueKeys } from '../state/storage.js';
import { copyText, toastResult } from '../utils/clipboard.js';
import { buildCsv, buildTxt } from '../utils/exportar.js';
import { buildXlsx, bytesToBase64, readXlsxRows } from '../utils/excel.js';
import { buildDocxBase64 } from '../utils/word.js';
import { PLANTILLA_CSV, parseCsv, rowsToRutina } from '../utils/importar.js';
import { buildDefaultData } from '../utils/defaults.js';
import { fmt } from '../utils/format.js';
import { calcCalorias, estimaGrasaCorporal } from '../utils/health.js';
import { buildShareObject, decodeShare, describeShare, encodeShare } from '../utils/share.js';

/* =========================================================================
   AJUSTES: datos personales, compartir / importar / copia de seguridad, exportar y restablecer
   ========================================================================= */

export function FormularioCard({ onDone }) {
  const { state, guardarFormulario } = useGym();
  const f0 = state.formulario;
  const [nombre, setNombre] = useState(f0.nombre || '');
  const [edad, setEdad] = useState(f0.edad);
  const [sexo, setSexo] = useState(f0.sexo || 'M');
  const [alturaCm, setAlturaCm] = useState(f0.alturaCm);
  const [pesoInicialKg, setPesoInicialKg] = useState(f0.pesoInicialKg);
  const [grasaPct, setGrasaPct] = useState(f0.grasaPct);
  const [actividad, setActividad] = useState(f0.actividad || 'intenso');
  const [objetivoPesoKg, setObjetivoPesoKg] = useState(f0.objetivoPesoKg);
  const [objetivoPasosDiarios, setObjetivoPasosDiarios] = useState(f0.objetivoPasosDiarios || 10000);

  const draft = { nombre: nombre.trim(), edad, sexo, alturaCm, pesoInicialKg, grasaPct, actividad, objetivoPesoKg, objetivoPasosDiarios };
  const cals = calcCalorias(draft);
  const grasa = estimaGrasaCorporal(draft);

  return (
    <Card style={{ marginBottom: 18 }}>
      <Label>Tu nombre</Label>
      <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Escribe tu nombre" className="font-body inp" style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <LabeledNum label="Edad" value={edad} onChange={(v) => setEdad(v === null ? null : Math.round(v))} />
        <div style={{ flex: 1 }}>
          <Label>Sexo</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip active={sexo === 'M'} onClick={() => setSexo('M')}>Hombre</Chip>
            <Chip active={sexo === 'F'} onClick={() => setSexo('F')}>Mujer</Chip>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <LabeledNum label="Altura (cm)" value={alturaCm} onChange={setAlturaCm} />
        <LabeledNum label="Peso actual (kg)" value={pesoInicialKg} onChange={setPesoInicialKg} />
      </div>
      <LabeledNum label="% de grasa corporal (opcional)" suffix="%" value={grasaPct} onChange={setGrasaPct} />
      <div style={{ margin: '12px 0' }}>
        <Label>Nivel de actividad</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ACTIVIDADES.map((a) => <Chip key={a[0]} active={actividad === a[0]} onClick={() => setActividad(a[0])}>{a[1]}</Chip>)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <LabeledNum label="¿A qué peso quieres llegar? (kg)" value={objetivoPesoKg} onChange={setObjetivoPesoKg} placeholder="ej. 80" />
        <LabeledNum label="Pasos al día (referencia)" value={objetivoPasosDiarios} onChange={(v) => setObjetivoPasosDiarios(v === null ? null : Math.round(v))} />
      </div>
      {cals && (
        <div style={{ marginBottom: 16 }}>
          <div className="font-body" style={{ color: T.dim, fontSize: 10.5, marginBottom: 4 }}>Estimaciones orientativas ({cals.metodo})</div>
          <SupRow label="Mantener peso" value={cals.mantener + ' kcal/día'} />
          <SupRow label="Subir de peso" value={cals.subir + ' kcal/día'} />
          <SupRow label="Bajar de peso" value={cals.bajar + ' kcal/día'} highlight />
          {grasa !== null && <SupRow label="Grasa corporal estimada" value={'~' + grasa + '%'} />}
        </div>
      )}
      <button disabled={!pesoInicialKg} onClick={() => { guardarFormulario(draft); if (onDone) onDone(); }} className="font-body btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 14 }}>Guardar cambios</button>
    </Card>
  );
}

/* ---------- Generar un código para compartir o guardar ---------- */

export function CodeModal({ modo, onClose }) {
  const { state, fotos, showToast } = useGym();
  const backup = modo === 'backup';
  const [op, setOp] = useState({ historial: false, peso: false, recetas: false, nutricion: false, fotos: false });
  const [code, setCode] = useState(null);
  const tog = (k) => { setOp({ ...op, [k]: !op[k] }); setCode(null); };
  const items = [['historial', 'Historial de ejercicios'], ['peso', 'Peso corporal'], ['recetas', 'Recetas'], ['nutricion', 'Nutrición (calculadora, tus datos y planificador)']];
  const [generando, setGenerando] = useState(false);
  const generar = async () => {
    const o = backup ? { historial: true, peso: true, recetas: true, nutricion: true, todo: true, fotos: op.fotos } : op;
    setGenerando(true);
    try {
      // En el móvil las fotos están en archivos: se leen para meterlas en el código
      const fotosCodigo = o.fotos ? await Native.photosAsDataUrls(fotos) : null;
      setCode(encodeShare(buildShareObject(state, o, fotosCodigo)));
    } finally { setGenerando(false); }
  };
  const titulo = backup ? 'Copia de seguridad de mi rutina' : 'Mi rutina';
  return (
    <Modal title={backup ? '💾 Copia de seguridad' : '📤 Compartir mi rutina'} onClose={onClose}>
      <Card>
        <div className="font-body" style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
          {backup ? 'Genera un código con TODO lo que hay en la app (rutina, historial, peso, recetas, nutrición, diana, diario, agua…). Con él puedes pasar la app a otro móvil sin perder nada.'
            : 'Se compartirá siempre tu rutina (días, ejercicios, series, pesos, objetivos y notas). Marca lo que quieras añadir:'}
        </div>
        {!backup && items.map((it) => <CheckRow key={it[0]} on={op[it[0]]} onClick={() => tog(it[0])}>{it[1]}</CheckRow>)}
        <CheckRow on={op.fotos} onClick={() => tog('fotos')}>Incluir las fotos de los ejercicios (el código será mucho más largo)</CheckRow>
        <button disabled={generando} onClick={generar} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 12 }}>{generando ? 'Generando…' : 'Generar código'}</button>
      </Card>
      {code && (
        <Card style={{ marginTop: 12 }}>
          <div className="font-body" style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>{fmt(code.length, 0)} caracteres. Toca el texto para seleccionarlo.</div>
          <textarea readOnly value={code} rows={6} onFocus={(e) => e.target.select()} onClick={(e) => e.target.select()} className="font-body inp" style={{ fontSize: 11, wordBreak: 'break-all' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => toastResult(showToast, copyText(code), 'Código copiado ✓', 'Selecciona el texto y cópialo a mano')} className="font-body btn btn-ghost" style={{ flex: 1 }}>📋 Copiar</button>
            <button onClick={async () => { if (!(await Native.share({ title: titulo, text: code }))) showToast('No se pudo compartir: copia el código a mano', 'warn'); }} className="font-body btn btn-primary" style={{ flex: 1 }}>📤 Enviar</button>
          </div>
          <button onClick={async () => toastResult(showToast, await Native.saveFile(backup ? 'copia_seguridad_rutina.txt' : 'mi_rutina_codigo.txt', code, 'text/plain;charset=utf-8'), 'Archivo preparado ✓', 'No se pudo guardar el archivo')} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 12.5 }}>💾 Guardar en un archivo de texto</button>
        </Card>
      )}
    </Modal>
  );
}

/* ---------- Importar un código ---------- */

export function ImportModal({ onClose }) {
  const { importObj, askConfirm } = useGym();
  const [txt, setTxt] = useState('');
  const [res, setRes] = useState(null);
  const [modo, setModo] = useState('rutina');
  const aplicar = () => {
    const o = res.obj;
    const aviso = modo === 'rutina'
      ? 'Se reemplazarán tus días y ejercicios actuales por los del código (' + o.rutina.days.length + ' días). Conservarás el historial de los ejercicios que coincidan. Todo lo demás (peso, recetas, diario…) no se toca.\n\nAntes de cambiar nada se guarda una copia automática para poder volver atrás.'
      : 'Se reemplazará con lo que trae el código: rutina' + (describeShare(o).length > 1 ? ', ' + describeShare(o).slice(1).join(', ').toLowerCase() : '') + '. Lo que el código no trae no se toca.\n\nAntes de cambiar nada se guarda una copia automática para poder volver atrás.';
    askConfirm({ title: '¿Importar este código?', text: aviso, confirmLabel: 'Importar', danger: false, onConfirm: () => { importObj(o, modo); onClose(); } });
  };
  return (
    <Modal title="📥 Importar / restaurar" onClose={onClose}>
      <Card>
        <div className="font-body" style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>Pega aquí el código que te han enviado o tu copia de seguridad (empieza por GYMR1.):</div>
        <textarea value={txt} onChange={(e) => { setTxt(e.target.value); setRes(null); }} rows={6} placeholder="GYMR1.…" className="font-body inp" style={{ fontSize: 11, wordBreak: 'break-all' }} />
        <button disabled={!txt.trim()} onClick={() => setRes(decodeShare(txt))} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 10 }}>Comprobar código</button>
      </Card>
      {res && !res.ok && <div className="font-body" style={{ marginTop: 12, color: '#FDA4AF', fontSize: 13, lineHeight: 1.5, padding: '12px', borderRadius: 12, background: 'rgba(251,113,133,0.10)', border: '1px solid rgba(251,113,133,0.4)' }}>❌ {res.error}</div>}
      {res && res.ok && (
        <Card style={{ marginTop: 12 }}>
          <div className="font-body" style={{ color: '#A3E635', fontWeight: 800, fontSize: 13, marginBottom: 6 }}>✅ Código válido{res.obj.nombre ? ' · de ' + res.obj.nombre : ''}</div>
          {describeShare(res.obj).map((d, i) => <div key={i} className="font-body" style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.6 }}>• {d}</div>)}
          <Label style={{ marginTop: 14 }}>¿Qué quieres importar?</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip active={modo === 'rutina'} onClick={() => setModo('rutina')}>Solo la rutina (días y ejercicios)</Chip>
            <Chip active={modo === 'todo'} onClick={() => setModo('todo')}>Reemplazar todo lo que trae</Chip>
          </div>
          <button onClick={aplicar} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 14 }}>Importar…</button>
          <div className="font-body" style={{ color: T.dim, fontSize: 11, marginTop: 8 }}>Te pediré confirmación antes de cambiar nada.</div>
        </Card>
      )}
    </Modal>
  );
}

/* ---------- Exportar a archivo ---------- */

// build: función (puede ser asíncrona) que devuelve { text, base64 } con el contenido del archivo
export function ExportRow({ titulo, desc, filename, mime, build }) {
  const { showToast } = useGym();
  const [ocupado, setOcupado] = useState(false);
  const run = async (compartir) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const out = await build();
      const ok = compartir
        ? await Native.share({ title: 'Mi rutina', text: out.text, filename, mime, base64: !!out.base64 })
        : await Native.saveFile(filename, out.text, mime, !!out.base64);
      toastResult(showToast, ok, compartir ? 'Listo para compartir ✓' : 'Archivo preparado ✓', compartir ? 'No se pudo compartir' : 'No se pudo guardar el archivo');
    } catch (e) {
      showToast('No se pudo crear el archivo: ' + String((e && e.message) || e), 'warn');
    } finally { setOcupado(false); }
  };
  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid rgba(140,170,255,0.12)' }}>
      <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 13.5 }}>{titulo}</div>
      <div className="font-body" style={{ color: T.dim, fontSize: 11.5, margin: '2px 0 8px' }}>{desc}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={ocupado} onClick={() => run(false)} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }}>⬇️ Descargar</button>
        <button disabled={ocupado} onClick={() => run(true)} className="font-body btn btn-primary" style={{ flex: 1, fontSize: 12.5 }}>📤 Compartir</button>
      </div>
    </div>
  );
}

/* ---------- Importar una rutina desde CSV o Excel ---------- */

export function ImportarArchivoModal({ onClose }) {
  const { state, importObj, askConfirm, showToast } = useGym();
  const [txt, setTxt] = useState('');
  const [res, setRes] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const comprobarFilas = (rows) => setRes(rowsToRutina(rows, state));
  const leerArchivo = async (f) => {
    setNombreArchivo(f.name);
    try {
      if (/\.xlsx$/i.test(f.name)) comprobarFilas(readXlsxRows(new Uint8Array(await f.arrayBuffer())));
      else { const t = await f.text(); setTxt(t); comprobarFilas(parseCsv(t)); }
    } catch (e) { setRes({ ok: false, error: String((e && e.message) || e) }); }
  };
  const elegirArchivo = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.style.display = 'none';
    input.setAttribute('data-testid', 'importar-archivo');
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (input.parentNode) input.parentNode.removeChild(input);
      if (f) leerArchivo(f);
    });
    input.click();
  };
  const importar = () => askConfirm({
    title: '¿Importar esta rutina?',
    text: 'Se reemplazarán tus días y ejercicios por los del archivo (' + res.resumen + '). Los ejercicios que se llamen igual que los tuyos conservan su historial. Tu peso, comidas y demás datos no se tocan.\n\nAntes de cambiar nada se guarda una copia para poder volver atrás.',
    confirmLabel: 'Importar', danger: false,
    onConfirm: () => { importObj(res.obj, 'rutina'); onClose(); },
  });
  return (
    <Modal title="📊 Importar desde Excel o CSV" onClose={onClose}>
      <Card>
        <div className="font-body" style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
          Elige un archivo <b style={{ color: T.text }}>.xlsx</b> o <b style={{ color: T.text }}>.csv</b> con una fila por serie, o pega aquí el contenido del CSV. Las columnas son las mismas que al exportar; solo <b style={{ color: T.text }}>Dia</b> y <b style={{ color: T.text }}>Ejercicio</b> son obligatorias.
        </div>
        <button onClick={elegirArchivo} className="font-body btn btn-primary" style={{ width: '100%' }}>📂 Elegir archivo (.xlsx o .csv)</button>
        {nombreArchivo && <div className="font-body" style={{ color: T.dim, fontSize: 11.5, marginTop: 6 }}>{'Archivo: ' + nombreArchivo}</div>}
        <Label style={{ marginTop: 12 }}>O pega el CSV</Label>
        <textarea value={txt} onChange={(e) => { setTxt(e.target.value); setRes(null); setNombreArchivo(''); }} rows={6} placeholder="Dia;Equipo;Ejercicio;Musculo;Serie;Tipo;Repeticiones;Peso_kg…" className="font-body inp" style={{ fontSize: 11.5 }} />
        <button disabled={!txt.trim()} onClick={() => comprobarFilas(parseCsv(txt))} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 8 }}>Comprobar CSV pegado</button>
      </Card>
      {res && !res.ok && <div className="font-body" style={{ marginTop: 12, color: '#FDA4AF', fontSize: 13, lineHeight: 1.5, padding: '12px', borderRadius: 12, background: 'rgba(251,113,133,0.10)', border: '1px solid rgba(251,113,133,0.4)' }}>{'❌ ' + res.error}</div>}
      {res && res.ok && (
        <Card style={{ marginTop: 12 }}>
          <div className="font-body" style={{ color: '#A3E635', fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{'✅ Rutina leída: ' + res.resumen}</div>
          {res.obj.rutina.days.map((d) => <div key={d.id} className="font-body" style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.6 }}>{'• ' + d.label + ' (' + d.ids.length + ' ejercicios)'}</div>)}
          {res.avisos.length > 0 && (
            <div className="font-body" style={{ color: '#FDE68A', fontSize: 11.5, lineHeight: 1.5, marginTop: 8 }}>
              {res.avisos.slice(0, 8).map((a, i) => <div key={i}>{'⚠️ ' + a}</div>)}
              {res.avisos.length > 8 && <div>{'…y ' + (res.avisos.length - 8) + ' avisos más.'}</div>}
            </div>
          )}
          <button onClick={importar} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 12 }}>Importar…</button>
        </Card>
      )}
      <Card style={{ marginTop: 12 }}>
        <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Plantilla de ejemplo</div>
        <div className="font-body" style={{ color: T.muted, fontSize: 11.5, lineHeight: 1.5, marginBottom: 8 }}>
          Tipos de serie: top set, back-off, rest-pause, dropset, calentamiento. En rest-pause pon las repeticiones de cada tanda separadas por « · » o «/» (8 · 4 · 3). En dropset, las repeticiones y los pesos de cada descenso igual (10 · 8 y 30 · 22,5).
        </div>
        <pre className="font-body" style={{ margin: 0, padding: 10, borderRadius: 10, background: 'rgba(7,11,22,0.9)', border: '1px solid rgba(140,170,255,0.2)', color: '#C9D3EE', fontSize: 10.5, lineHeight: 1.5, whiteSpace: 'pre', overflowX: 'auto' }} data-testid="plantilla-csv">{PLANTILLA_CSV.replace(/^\uFEFF/, '')}</pre>
        <button onClick={async () => toastResult(showToast, await Native.saveFile('plantilla_rutina.csv', PLANTILLA_CSV, 'text/csv;charset=utf-8'), 'Plantilla preparada ✓', 'No se pudo guardar la plantilla')} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 12.5 }}>⬇️ Descargar plantilla (.csv)</button>
      </Card>
    </Modal>
  );
}

/* ---------- Datos por defecto para amigos ---------- */

export function DatosAmigosCard() {
  const { state, showToast } = useGym();
  const [recetas, setRecetas] = useState(true);
  const generar = async () => {
    const json = JSON.stringify(buildDefaultData(state, { recetas }), null, 2) + '\n';
    toastResult(showToast, await Native.saveFile('defaultData.json', json, 'application/json;charset=utf-8'), 'defaultData.json preparado ✓', 'No se pudo crear el archivo');
  };
  return (
    <Card style={{ marginBottom: 18 }}>
      <div className="font-body" style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
        Crea el archivo <b style={{ color: T.text }}>defaultData.json</b> con tu rutina actual: es lo que verán tus amigos la primera vez que abran la APK. Solo lleva la rutina, el cardio, los suplementos y, si quieres, las recetas. <b style={{ color: T.text }}>Nunca</b> tu peso, tu diario ni tus datos personales.
      </div>
      <CheckRow on={recetas} onClick={() => setRecetas(!recetas)}>Incluir las recetas</CheckRow>
      <button onClick={generar} className="font-body btn btn-primary" style={{ width: '100%', marginTop: 8 }}>🎁 Crear defaultData.json</button>
      <div className="font-body" style={{ color: T.dim, fontSize: 11, lineHeight: 1.5, marginTop: 8 }}>
        Después súbelo a GitHub en src/data/defaultData.json (sustituyendo el que hay) y la siguiente APK que se compile ya lo llevará. Los pasos están en la guía (GUIA.md).
      </div>
    </Card>
  );
}

/* ---------- Pantalla encendida y avisos del descanso ---------- */

const FABRICANTES = [
  ['Xiaomi / Redmi / POCO (MIUI, HyperOS)', 'Ajustes → Apps → Gestionar apps → Mi Rutina → Ahorro de batería → Sin restricciones. Activa también «Inicio automático».'],
  ['Samsung (One UI)', 'Ajustes → Apps → Mi Rutina → Batería → Sin restricciones. Comprueba también que no esté en Ajustes → Batería → Límites de uso en segundo plano («Apps en suspensión»).'],
  ['Huawei / Honor (EMUI)', 'Ajustes → Batería → Inicio de aplicaciones → Mi Rutina → desactiva «Gestionar automáticamente» y deja activadas las tres opciones.'],
  ['OnePlus / OPPO / realme (OxygenOS, ColorOS)', 'Ajustes → Batería → Optimización de batería → Mi Rutina → No optimizar. En OPPO y realme, activa también «Permitir actividad en segundo plano».'],
  ['Google Pixel y Android sin capa', 'Ajustes → Apps → Mi Rutina → Batería → Sin restricciones (normalmente no hace falta).'],
];

export function PantallaAvisosCard() {
  const { state, setPreferencia, showToast } = useGym();
  const [estado, setEstado] = useState(null);
  const [verFab, setVerFab] = useState(false);
  const on = !!(state.preferencias && state.preferencias.pantallaEncendida);
  const nativo = Native.isNative();
  const comprobar = async () => setEstado(await Native.notificationStatus());
  const probar = async () => {
    const r = await Native.scheduleNotification({ id: 1002, title: '🔔 Prueba de aviso', body: 'Si ves esto con la pantalla bloqueada, los avisos del descanso funcionan.', at: Date.now() + 10000 });
    await comprobar();
    if (r.ok) showToast('Aviso de prueba en 10 s: bloquea la pantalla y espera', undefined, 6000);
    else if (r.motivo === 'permiso') showToast('Sin permiso de notificaciones. Actívalo en Ajustes del móvil → Apps → Mi Rutina → Notificaciones.', 'warn', 8000);
    else showToast('No se pudo programar el aviso', 'warn');
  };
  const txtPermiso = !estado ? '—' : estado.permiso === 'granted' ? '✅ Concedido' : estado.permiso === 'denied' ? '❌ Denegado' : 'Sin pedir todavía';
  const txtExacto = !estado || estado.exacto === null ? '—' : estado.exacto === 'granted' ? '✅ Puntuales' : '⚠️ Pueden retrasarse';
  return (
    <Card style={{ marginBottom: 18 }}>
      <CheckRow on={on} onClick={() => setPreferencia({ pantallaEncendida: !on })}>Mantener la pantalla encendida mientras uses la app</CheckRow>
      <div className="font-body" style={{ color: T.dim, fontSize: 11, lineHeight: 1.5, margin: '2px 0 12px' }}>Útil durante el entreno. Gasta algo más de batería y deja de aplicarse al salir de la app.</div>
      <div className="font-body" style={{ color: T.text, fontWeight: 800, fontSize: 13.5, marginBottom: 4 }}>⏱️ Avisos del descanso</div>
      {!nativo ? (
        <div className="font-body" style={{ color: T.muted, fontSize: 12, lineHeight: 1.5 }}>Los avisos con la pantalla bloqueada o la app cerrada funcionan en la app instalada en el móvil.</div>
      ) : (
        <div>
          <SupRow label="Permiso de notificaciones" value={txtPermiso} />
          <SupRow label="Avisos exactos" value={txtExacto} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={comprobar} className="font-body btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>Comprobar</button>
            <button onClick={probar} className="font-body btn btn-primary" style={{ flex: 1, fontSize: 12 }}>Probar aviso (10 s)</button>
          </div>
          <div className="font-body" style={{ color: T.muted, fontSize: 11.5, lineHeight: 1.5, marginTop: 10 }}>
            Si el permiso está denegado: Ajustes del móvil → Apps → Mi Rutina → Notificaciones → actívalas, incluido el canal «Descanso entre series».
          </div>
        </div>
      )}
      <button onClick={() => setVerFab(!verFab)} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 10, fontSize: 12 }}>{verFab ? 'Ocultar' : '🔋 Si el aviso no suena con la app cerrada (ahorro de batería)'}</button>
      {verFab && (
        <div style={{ marginTop: 8 }}>
          <div className="font-body" style={{ color: T.muted, fontSize: 11.5, lineHeight: 1.5, marginBottom: 6 }}>Algunas marcas cierran las apps en segundo plano para ahorrar batería, y los avisos llegan tarde o no llegan. Quita Mi Rutina del ahorro de batería (los nombres cambian un poco según el modelo):</div>
          {FABRICANTES.map((f) => (
            <div key={f[0]} style={{ padding: '7px 0', borderTop: '1px solid rgba(140,170,255,0.12)' }}>
              <div className="font-body" style={{ color: T.text, fontWeight: 700, fontSize: 12.5 }}>{f[0]}</div>
              <div className="font-body" style={{ color: T.muted, fontSize: 11.5, lineHeight: 1.5 }}>{f[1]}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------- Pantalla de ajustes ---------- */

export function AjustesScreen({ onClose }) {
  const { state, askConfirm, resetAll, restoreBackup, hasBackup } = useGym();
  const [modal, setModal] = useState(null);
  return (
    <div style={{ padding: '10px 18px 30px', maxWidth: 460, margin: '0 auto' }}>
      <div className="font-display" style={{ color: T.text, fontSize: 30, fontWeight: 700, marginBottom: 14 }}>⚙️ Ajustes</div>

      <SectionTitle emoji="👤">Tus datos</SectionTitle>
      <FormularioCard onDone={onClose} />

      <SectionTitle emoji="📱">Pantalla y avisos</SectionTitle>
      <PantallaAvisosCard />

      <SectionTitle emoji="🔄">Compartir y copias</SectionTitle>
      <Card style={{ marginBottom: 18 }}>
        <div className="font-body" style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
          Tus datos se guardan solos cada vez que cambias algo. Para pasarlos a un amigo o a otro móvil usa un código de texto.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setModal('compartir')} className="font-body btn btn-primary">📤 Compartir mi rutina</button>
          <button onClick={() => setModal('backup')} className="font-body btn btn-ghost">💾 Copia de seguridad completa (cambio de móvil)</button>
          <button onClick={() => setModal('importar')} className="font-body btn btn-ghost">📥 Importar rutina o restaurar copia</button>
          <button onClick={() => setModal('archivo')} className="font-body btn btn-ghost">📊 Importar rutina desde Excel o CSV</button>
          {hasBackup && <button onClick={() => askConfirm({ title: '¿Volver al estado anterior?', text: 'Se restaurará cómo estaba la app justo antes de la última importación o restablecimiento.', confirmLabel: 'Restaurar', danger: false, onConfirm: restoreBackup })} className="font-body btn btn-ghost">↩️ Deshacer la última importación</button>}
        </div>
      </Card>

      <RescueCard />

      <SectionTitle emoji="📄">Descargar mi rutina</SectionTitle>
      <Card style={{ marginBottom: 18 }}>
        <div className="font-body" style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 4 }}>Todo tu plan en un archivo para guardarlo o enviarlo a quien quieras. En el móvil se abre el menú de compartir: desde ahí puedes guardarlo en Drive, en Archivos o enviarlo.</div>
        <ExportRow titulo="📗 Excel (.xlsx)" desc="Una hoja con la rutina (una fila por serie) y otra con tu peso. Se puede volver a importar." filename="mi_rutina.xlsx" mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" build={async () => ({ text: bytesToBase64(buildXlsx(state)), base64: true })} />
        <ExportRow titulo="📘 Word (.docx)" desc="Documento con una tabla por día; lo abren Word, LibreOffice y Google Docs." filename="mi_rutina.docx" mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document" build={async () => ({ text: await buildDocxBase64(state), base64: true })} />
        <ExportRow titulo="📊 CSV" desc="Lo mismo que el Excel en texto (separado por «;», con tildes). También se puede importar." filename="mi_rutina.csv" mime="text/csv;charset=utf-8" build={async () => ({ text: buildCsv(state) })} />
        <ExportRow titulo="📝 Texto (.txt)" desc="Todo junto y ordenado: días, ejercicios, series, objetivos, cardio, suplementos, diana, peso y nutrición." filename="mi_rutina.txt" mime="text/plain;charset=utf-8" build={async () => ({ text: buildTxt(state) })} />
      </Card>

      <SectionTitle emoji="🎁">Rutina para tus amigos</SectionTitle>
      <DatosAmigosCard />

      <button onClick={() => askConfirm({ title: '¿Restablecer todo?', text: 'Se volverán a poner los datos originales de la app y se perderá tu progreso guardado. Antes se guarda una copia por si te arrepientes (botón «Deshacer la última importación»).', confirmLabel: 'Restablecer', onConfirm: () => { resetAll(); onClose(); } })} className="font-body btn btn-danger" style={{ width: '100%', fontSize: 13 }}>
        🗑️ Restablecer todos los datos
      </button>

      {modal === 'compartir' && <CodeModal modo="share" onClose={() => setModal(null)} />}
      {modal === 'backup' && <CodeModal modo="backup" onClose={() => setModal(null)} />}
      {modal === 'importar' && <ImportModal onClose={() => setModal(null)} />}
      {modal === 'archivo' && <ImportarArchivoModal onClose={() => setModal(null)} />}
    </div>
  );
}
/* ---------- Copias de rescate (datos guardados que no se pudieron leer o versiones anteriores) ---------- */

export function RescueCard() {
  const { showToast } = useGym();
  const [keys, setKeys] = useState(() => listRescueKeys());
  if (!keys.length) return null;
  const etiqueta = (k) => {
    const p = k.slice(RECOVERY_PREFIX.length).split('_');
    const fecha = new Date(Number(p[0]));
    const tipo = p.slice(2).join('_');
    const t = tipo === 'ilegible' ? 'datos dañados' : tipo === 'error' ? 'datos que no se pudieron convertir' : tipo.indexOf('premigracion') === 0 ? 'antes de actualizar la app' : tipo;
    return (isNaN(fecha.getTime()) ? '' : fecha.toLocaleString('es-ES')) + ' · ' + t;
  };
  return (
    <div>
      <SectionTitle emoji="🛟">Copias de rescate</SectionTitle>
      <Card style={{ marginBottom: 18 }}>
        <div className="font-body" style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 6 }}>
          La app guarda aquí una copia de tus datos antes de actualizarlos de versión o si alguna vez no se pudieron leer. Normalmente no hace falta tocarlas; descárgalas solo si se ha perdido algo.
        </div>
        {keys.map((k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid rgba(140,170,255,0.12)', flexWrap: 'wrap' }}>
            <span className="font-body" style={{ flex: 1, minWidth: 150, color: T.text, fontSize: 12.5 }}>{etiqueta(k)}</span>
            <button onClick={async () => {
              let raw = null; try { raw = localStorage.getItem(k); } catch (e) { raw = null; }
              toastResult(showToast, raw !== null && (await Native.saveFile('rescate_mi_rutina.json', raw, 'application/json;charset=utf-8')), 'Copia preparada ✓', 'No se pudo guardar la copia');
            }} className="font-body btn btn-ghost" style={{ padding: '7px 10px', fontSize: 12 }}>⬇️ Descargar</button>
          </div>
        ))}
        <button onClick={() => setKeys(listRescueKeys())} className="font-body btn btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 12 }}>Actualizar lista</button>
      </Card>
    </div>
  );
}

/* ---------- Pantalla de ajustes ---------- */

