/* =========================================================================
   CAPA NATIVA — todo lo que depende del móvil pasa por aquí.
   En la app Android (Capacitor) usa los plugins nativos; en un navegador de PC
   usa las alternativas web (localStorage, descargas, Web Audio…), sin errores.
   ========================================================================= */

import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App as CapApp } from '@capacitor/app';
import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Haptics } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { LocalNotifications } from '@capacitor/local-notifications';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { safeUrl } from '../utils/format.js';

export const STORAGE_KEY = 'gymtracker_nacho_v2';
const STAMP_KEY = STORAGE_KEY + '_hora'; // cuándo se guardó cada copia (para elegir la más reciente al arrancar)
export const FOTOS_KEY = 'gymtracker_fotos_v1'; // fotos en base64 (navegador, y datos antiguos del móvil)
const FOTOS_NATIVE_KEY = 'gymtracker_fotos_v2'; // móvil: { idEjercicio: ruta del archivo }
export const NATIVE_AVISO = 'Esta función solo está disponible en la app instalada en el móvil.';
export const NOTIF_CANAL = 'descanso';
export const NOTIF_ID_DESCANSO = 1001;

export const isNative = () => { try { return Capacitor.isNativePlatform(); } catch (e) { return false; } };

// Reduce una imagen (File, Blob o URL) a un máximo de px y la devuelve como dataURL JPEG
export function compressImage(input, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const fromUrl = (url, revoke) => {
      const img = new Image();
      img.onerror = () => { if (revoke) URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h && w > maxDim) { h = Math.round(h * (maxDim / w)); w = maxDim; }
        else if (h >= w && h > maxDim) { w = Math.round(w * (maxDim / h)); h = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        if (revoke) URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = url;
    };
    if (typeof input === 'string') { fromUrl(input, false); return; }
    try { fromUrl(URL.createObjectURL(input), true); } catch (e) { reject(e); }
  });
}

// Audio compartido: se "desbloquea" en un toque del usuario (los móviles no dejan sonar
// un AudioContext creado fuera de un gesto) y se reutiliza para el pitido del fin del descanso.
let SHARED_AUDIO = null;

/* ---------- Almacenamiento ----------
   Móvil: Preferences (almacenamiento nativo) + copia espejo en localStorage.
   Al arrancar se usa la copia más reciente que se pueda leer. Las escrituras a Preferences
   van en fila (nunca se pisa una posterior con una anterior) y se esperan al pasar a segundo plano. */
const MEM = { raw: null, fotos: null, iniciado: false, problemas: [] };
let colaGuardado = Promise.resolve();
let pendiente = null; // último texto pendiente de escribir en Preferences
let escribiendo = false;
let alFallarGuardado = null; // función que la app registra para avisar al usuario

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } }
function legible(raw) { if (!raw) return false; try { JSON.parse(raw); return true; } catch (e) { return false; } }

async function escribirPreferences() {
  if (escribiendo) return;
  escribiendo = true;
  try {
    while (pendiente !== null) {
      const { raw, hora } = pendiente;
      pendiente = null;
      try {
        await Preferences.set({ key: STORAGE_KEY, value: raw });
        await Preferences.set({ key: STAMP_KEY, value: String(hora) });
      } catch (e) {
        if (alFallarGuardado) alFallarGuardado('No se pudo guardar en el almacenamiento del móvil. Tus datos siguen en la copia interna; exporta una copia de seguridad por si acaso.');
      }
    }
  } finally { escribiendo = false; }
}

/* ---------- Fotos ---------- */
function fotosWebLeer() { try { const r = lsGet(FOTOS_KEY); return r ? JSON.parse(r) : {}; } catch (e) { return {}; } }

async function fotoAArchivo(id, dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || '';
  const path = 'fotos/' + String(id).replace(/[^a-zA-Z0-9_-]/g, '_') + '_' + Date.now() + '.jpg';
  const res = await Filesystem.writeFile({ path, data: base64, directory: Directory.Data, recursive: true });
  return res.uri;
}

async function guardarMapaFotosNativo(mapa) {
  await Preferences.set({ key: FOTOS_NATIVE_KEY, value: JSON.stringify(mapa) });
}

export const Native = {
  isNative,

  // Debe llamarse una vez antes de pintar la app: carga lo guardado (en el móvil es asíncrono) y prepara los plugins.
  async init() {
    if (MEM.iniciado) return;
    MEM.iniciado = true;
    if (!isNative()) { MEM.raw = lsGet(STORAGE_KEY); MEM.fotos = fotosWebLeer(); return; }
    // Estado: la copia más reciente que se pueda leer
    let pref = null, prefHora = 0;
    try {
      pref = (await Preferences.get({ key: STORAGE_KEY })).value;
      prefHora = Number((await Preferences.get({ key: STAMP_KEY })).value) || 0;
    } catch (e) { MEM.problemas.push('No se pudo leer el almacenamiento del móvil; se usa la copia interna.'); }
    const ls = lsGet(STORAGE_KEY);
    const lsHora = Number(lsGet(STAMP_KEY)) || 0;
    const prefOk = legible(pref), lsOk = legible(ls);
    if (prefOk && lsOk) MEM.raw = lsHora > prefHora ? ls : pref;
    else if (prefOk) MEM.raw = pref;
    else if (lsOk) MEM.raw = ls;
    else MEM.raw = pref || ls || null; // ninguna se puede leer: se entrega tal cual para que el arranque la rescate
    // Fotos: mapa de rutas + migración de las fotos antiguas en base64 a archivos (sin borrar nada hasta terminar)
    let mapa = {};
    try { const v = (await Preferences.get({ key: FOTOS_NATIVE_KEY })).value; mapa = v ? JSON.parse(v) : {}; } catch (e) { mapa = {}; }
    const antiguas = fotosWebLeer();
    const ids = Object.keys(antiguas).filter((id) => typeof antiguas[id] === 'string' && antiguas[id].indexOf('data:') === 0);
    if (ids.length) {
      let todas = true;
      for (const id of ids) {
        if (mapa[id]) continue;
        try { mapa[id] = await fotoAArchivo(id, antiguas[id]); } catch (e) { todas = false; }
      }
      try {
        await guardarMapaFotosNativo(mapa);
        if (todas) { lsSet(FOTOS_KEY + '_migradas', lsGet(FOTOS_KEY) || '{}'); lsDel(FOTOS_KEY); }
      } catch (e) { todas = false; }
      if (!todas) MEM.problemas.push('Algunas fotos antiguas no se pudieron pasar al móvil; se siguen guardando como antes.');
    }
    MEM.fotos = mapa;
    // Canal de notificaciones de prioridad alta para el descanso
    try {
      await LocalNotifications.createChannel({ id: NOTIF_CANAL, name: 'Descanso entre series', description: 'Aviso cuando termina el descanso', importance: 5, visibility: 1, vibration: true });
    } catch (e) { /* sin canal: Android usa el de por defecto */ }
    try { await SystemBars.setStyle({ style: SystemBarsStyle.Dark }); } catch (e) { /* nada */ }
    Native.ajustarTeclado();
  },

  // Avisos acumulados durante init() (para mostrarlos al usuario al arrancar)
  problemasArranque() { const p = MEM.problemas.slice(); MEM.problemas = []; return p; },

  // Oculta la pantalla de inicio cuando la app ya se ha pintado
  ocultarSplash() { if (isNative()) SplashScreen.hide().catch(() => {}); },

  // Devuelve el estado guardado (objeto) o null si no hay NADA guardado.
  // Si hay algo guardado pero no se puede leer, LANZA un error con el texto original en err.raw,
  // para que el arranque lo rescate en vez de pisarlo con los datos de fábrica.
  loadState() { // NATIVE-HOOK
    let raw;
    if (MEM.iniciado && isNative()) raw = MEM.raw;
    else {
      try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { const err = new Error('almacenamiento no accesible'); err.raw = null; err.inaccesible = true; throw err; }
    }
    if (raw === null || raw === undefined || raw === '') return null;
    try { return JSON.parse(raw); } catch (e) { const err = new Error('datos guardados ilegibles'); err.raw = raw; throw err; }
  },

  // Guarda el estado. Devuelve true si se ha guardado (o puesto en la fila del almacenamiento nativo).
  saveState(obj) { // NATIVE-HOOK
    let raw;
    try { raw = JSON.stringify(obj); } catch (e) { return false; }
    const hora = Date.now();
    const espejo = lsSet(STORAGE_KEY, raw) && lsSet(STAMP_KEY, String(hora));
    if (!isNative()) return espejo;
    MEM.raw = raw;
    pendiente = { raw, hora };
    colaGuardado = colaGuardado.then(escribirPreferences);
    return true;
  },

  // Espera a que terminen las escrituras pendientes (al pasar a segundo plano)
  flush() { return colaGuardado.then(escribirPreferences); },

  onSaveError(fn) { alFallarGuardado = fn; },

  /* ---------- Fotos ----------
     En el estado de fotos se guarda, por ejercicio, una ruta (móvil) o un dataURL (navegador). */
  loadFotos() { // NATIVE-HOOK
    if (isNative() && MEM.fotos) return { ...MEM.fotos };
    return fotosWebLeer();
  },

  // Guarda la foto (dataURL JPEG ya comprimido) del ejercicio id. Devuelve { ok, mapa }.
  async savePhoto(id, dataUrl, mapaActual) { // NATIVE-HOOK
    const mapa = { ...(mapaActual || Native.loadFotos()) };
    if (!isNative()) {
      mapa[id] = dataUrl;
      const ok = lsSet(FOTOS_KEY, JSON.stringify(mapa));
      return { ok, mapa };
    }
    try {
      const anterior = mapa[id];
      mapa[id] = await fotoAArchivo(id, dataUrl);
      await guardarMapaFotosNativo(mapa);
      MEM.fotos = mapa;
      if (anterior && anterior.indexOf('data:') !== 0) Filesystem.deleteFile({ path: anterior }).catch(() => {});
      return { ok: true, mapa };
    } catch (e) { return { ok: false, mapa: mapaActual || {} }; }
  },

  async deletePhoto(id, mapaActual) { // NATIVE-HOOK
    const mapa = { ...(mapaActual || Native.loadFotos()) };
    const anterior = mapa[id];
    delete mapa[id];
    if (!isNative()) {
      const ok = lsSet(FOTOS_KEY, JSON.stringify(mapa));
      return { ok, mapa };
    }
    try {
      await guardarMapaFotosNativo(mapa);
      MEM.fotos = mapa;
      if (anterior && anterior.indexOf('data:') !== 0) Filesystem.deleteFile({ path: anterior }).catch(() => {});
      return { ok: true, mapa };
    } catch (e) { return { ok: false, mapa: mapaActual || {} }; }
  },

  // Dirección que se puede poner en <img src>
  photoSrc(v) {
    if (!v) return null;
    if (String(v).indexOf('data:') === 0) return v;
    try { return Capacitor.convertFileSrc(v); } catch (e) { return null; }
  },

  // Convierte el mapa de fotos a dataURL (para meterlas en una copia de seguridad o un código)
  async photosAsDataUrls(mapa) {
    const out = {};
    for (const id of Object.keys(mapa || {})) {
      const v = mapa[id];
      if (!v) continue;
      if (String(v).indexOf('data:') === 0) { out[id] = v; continue; }
      try { const r = await Filesystem.readFile({ path: v }); out[id] = 'data:image/jpeg;base64,' + r.data; } catch (e) { /* foto ilegible: se omite */ }
    }
    return out;
  },

  // Elige una foto. origen: 'camara' | 'galeria'. Devuelve un dataURL JPEG (~500 px, calidad 0,65) o null si se cancela.
  async pickPhoto(origen) { // NATIVE-HOOK
    if (isNative()) {
      try {
        let webPath = null;
        if (origen === 'camara') {
          const r = await Camera.takePhoto({ quality: 80, correctOrientation: true, saveToGallery: false });
          webPath = r && r.webPath;
        } else {
          const r = await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, allowMultipleSelection: false, limit: 1, quality: 80 });
          webPath = r && r.results && r.results[0] && r.results[0].webPath;
        }
        if (!webPath) return null;
        const blob = await (await fetch(webPath)).blob();
        return await compressImage(blob, 500, 0.65);
      } catch (e) {
        if (/cancel/i.test(String(e && (e.message || e)))) return null;
        throw e;
      }
    }
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
      if (origen === 'camara') input.setAttribute('capture', 'environment');
      document.body.appendChild(input);
      const done = (v) => { if (input.parentNode) input.parentNode.removeChild(input); resolve(v); };
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        if (!f) { done(null); return; }
        compressImage(f, 500, 0.65).then(done, () => done(null));
      });
      input.addEventListener('cancel', () => done(null));
      input.click();
    });
  },

  /* ---------- Vibración y sonido ---------- */
  vibrate(ms) { // NATIVE-HOOK
    if (isNative()) { Haptics.vibrate({ duration: ms || 200 }).catch(() => {}); return true; }
    try { if (navigator.vibrate) { navigator.vibrate(ms || 200); return true; } } catch (e) { /* sin vibración */ }
    return false;
  },

  unlockAudio() { // NATIVE-HOOK
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      if (!SHARED_AUDIO) SHARED_AUDIO = new AC();
      if (SHARED_AUDIO.state === 'suspended' && SHARED_AUDIO.resume) SHARED_AUDIO.resume().catch(() => {});
      return true;
    } catch (e) { return false; }
  },

  beep() { // NATIVE-HOOK
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const shared = SHARED_AUDIO && SHARED_AUDIO.state !== 'closed';
      const ctx = shared ? SHARED_AUDIO : new AC();
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
      if (!shared) setTimeout(() => { try { ctx.close(); } catch (e) { /* ya cerrado */ } }, 600);
      return true;
    } catch (e) { return false; }
  },

  /* ---------- Compartir y guardar archivos ----------
     En el móvil el archivo se escribe en la caché de la app y se abre el menú de compartir de Android:
     desde ahí se guarda en Drive/Archivos/Descargas o se envía por WhatsApp, correo… No necesita permisos
     de almacenamiento y funciona igual en todas las versiones de Android.
     opts: { title, text, filename, mime, base64 } (base64 = true si text ya es binario en base64). Devuelve Promise<boolean>. */
  async share(o) { // NATIVE-HOOK
    const opts = o || {};
    if (isNative()) {
      try {
        if (opts.filename) {
          const path = 'compartir/' + opts.filename;
          const w = await Filesystem.writeFile(opts.base64
            ? { path, data: opts.text || '', directory: Directory.Cache, recursive: true }
            : { path, data: opts.text || '', directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
          await Share.share({ title: opts.title || opts.filename, files: [w.uri], dialogTitle: opts.title || 'Compartir' });
        } else {
          await Share.share({ title: opts.title || '', text: opts.text || '', dialogTitle: opts.title || 'Compartir' });
        }
        return true;
      } catch (e) {
        return /cancel/i.test(String(e && (e.message || e))); // cancelar no es un error
      }
    }
    try {
      if (navigator.share && !opts.filename) {
        await navigator.share({ title: opts.title || '', text: opts.text || '' }).catch(() => {});
        return true;
      }
    } catch (e) { /* seguimos con la descarga */ }
    return Native.saveFile(opts.filename || 'compartir.txt', opts.text || '', opts.mime || 'text/plain;charset=utf-8', !!opts.base64);
  },

  async saveFile(filename, content, mime, base64) { // NATIVE-HOOK
    if (isNative()) return Native.share({ title: filename, text: content, filename, mime, base64 });
    try {
      let blob;
      if (base64) {
        const bin = atob(content);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
      } else blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { if (a.parentNode) document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
      return true;
    } catch (e) { return false; }
  },

  // Abre un enlace fuera de la app. Solo http/https.
  openUrl(url) { // NATIVE-HOOK
    const u = safeUrl(url);
    if (!u) return false;
    if (isNative()) { Browser.open({ url: u }).catch(() => {}); return true; }
    try { window.open(u, '_blank', 'noopener'); return true; } catch (e) { return false; }
  },

  /* ---------- Notificaciones ---------- */
  // Estado de los permisos: { soportado, permiso: 'granted'|'denied'|'prompt'…, exacto: 'granted'|'denied'|null }
  async notificationStatus() {
    if (!isNative()) return { soportado: false, permiso: 'denied', exacto: null };
    let permiso = 'prompt', exacto = null;
    try { permiso = (await LocalNotifications.checkPermissions()).display; } catch (e) { /* nada */ }
    try { exacto = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm; } catch (e) { exacto = null; }
    return { soportado: true, permiso, exacto };
  },

  // Programa un aviso: { id (número), title, body, at (ms) }. Pide el permiso la primera vez.
  // Devuelve Promise<{ ok, motivo }>.
  async scheduleNotification(o) { // NATIVE-HOOK
    if (!isNative()) return { ok: false, motivo: 'web', aviso: NATIVE_AVISO };
    try {
      let p = (await LocalNotifications.checkPermissions()).display;
      if (p === 'prompt' || p === 'prompt-with-rationale') p = (await LocalNotifications.requestPermissions()).display;
      if (p !== 'granted') return { ok: false, motivo: 'permiso' };
      await LocalNotifications.cancel({ notifications: [{ id: o.id }] }).catch(() => {});
      await LocalNotifications.schedule({ notifications: [{
        id: o.id, title: o.title, body: o.body, channelId: NOTIF_CANAL,
        schedule: { at: new Date(o.at), allowWhileIdle: true },
        smallIcon: 'ic_stat_mirutina', iconColor: '#22D3EE',
      }] });
      return { ok: true };
    } catch (e) { return { ok: false, motivo: 'error' }; }
  },

  async cancelNotification(id) { // NATIVE-HOOK
    if (!isNative()) return { ok: false, aviso: NATIVE_AVISO };
    try { await LocalNotifications.cancel({ notifications: [{ id }] }); return { ok: true }; } catch (e) { return { ok: false }; }
  },

  /* ---------- Pantalla encendida ---------- */
  async keepAwake(on) { // NATIVE-HOOK
    if (isNative()) {
      try { if (on) await KeepAwake.keepAwake(); else await KeepAwake.allowSleep(); return { ok: true }; } catch (e) { return { ok: false }; }
    }
    // Navegador: Screen Wake Lock (Chrome); si no existe, no hace nada
    try {
      if (on && navigator.wakeLock) { Native._lock = await navigator.wakeLock.request('screen'); return { ok: true }; }
      if (!on && Native._lock) { await Native._lock.release(); Native._lock = null; }
      return { ok: !on };
    } catch (e) { return { ok: false }; }
  },
  _lock: null,

  /* ---------- Botón Atrás y ciclo de vida ---------- */
  onBackButton(fn) {
    if (!isNative()) return () => {};
    let h = null;
    CapApp.addListener('backButton', fn).then((x) => { h = x; }).catch(() => {});
    return () => { if (h) h.remove(); };
  },
  exitApp() { if (isNative()) CapApp.exitApp().catch(() => {}); },
  onAppStateChange(fn) {
    if (!isNative()) return () => {};
    let h = null;
    CapApp.addListener('appStateChange', (s) => fn(!!(s && s.isActive))).then((x) => { h = x; }).catch(() => {});
    return () => { if (h) h.remove(); };
  },

  /* ---------- Teclado: que no tape el campo que estás escribiendo ---------- */
  ajustarTeclado() {
    if (!isNative()) return;
    let alturaAntes = window.innerHeight;
    Keyboard.addListener('keyboardWillShow', () => { alturaAntes = window.innerHeight; }).catch(() => {});
    Keyboard.addListener('keyboardDidShow', (info) => {
      // Si Android no ha encogido la vista, se añade espacio abajo para poder subir el campo
      const encogida = window.innerHeight < alturaAntes - 50;
      document.documentElement.style.setProperty('--kb-pad', encogida ? '0px' : ((info && info.keyboardHeight) || 0) + 'px');
      const el = document.activeElement;
      if (el && el.scrollIntoView) setTimeout(() => { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* nada */ } }, 60);
    }).catch(() => {});
    Keyboard.addListener('keyboardWillHide', () => { document.documentElement.style.setProperty('--kb-pad', '0px'); }).catch(() => {});
  },
};

if (typeof window !== 'undefined') window.Native = Native;
