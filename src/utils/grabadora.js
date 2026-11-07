/* =========================================================================
   GRABADORA — graba la voz con el micrófono y la entrega como WAV (16 kHz, mono)
   en base64, que es un formato que Gemini entiende siempre.
   ========================================================================= */

const FREC = 16000;
const MAX_SEG = 240; // 4 minutos como mucho

export function microDisponible() {
  try { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext)); } catch (e) { return false; }
}

export async function empezarGrabacion(alNivel) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const fuente = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const trozos = [];
  let muestras = 0;
  proc.onaudioprocess = (e) => {
    const d = e.inputBuffer.getChannelData(0);
    trozos.push(new Float32Array(d));
    muestras += d.length;
    if (alNivel) { let m = 0; for (let i = 0; i < d.length; i += 16) m = Math.max(m, Math.abs(d[i])); alNivel(m, muestras / ctx.sampleRate); }
  };
  fuente.connect(proc);
  proc.connect(ctx.destination);
  const inicio = Date.now();
  return {
    segundos: () => (Date.now() - inicio) / 1000,
    max: MAX_SEG,
    async parar() {
      try { proc.disconnect(); fuente.disconnect(); } catch (e) { /* nada */ }
      stream.getTracks().forEach((t) => t.stop());
      const frecOrigen = ctx.sampleRate;
      try { await ctx.close(); } catch (e) { /* nada */ }
      const todo = new Float32Array(muestras);
      let o = 0;
      for (const t of trozos) { todo.set(t, o); o += t.length; }
      return aWavBase64(reducir(todo, frecOrigen, FREC), FREC);
    },
    cancelar() {
      try { proc.disconnect(); fuente.disconnect(); } catch (e) { /* nada */ }
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
    },
  };
}

function reducir(datos, de, a) {
  if (de === a) return datos;
  const k = de / a;
  const n = Math.floor(datos.length / k);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const ini = Math.floor(i * k), fin = Math.min(datos.length, Math.floor((i + 1) * k));
    let s = 0;
    for (let j = ini; j < fin; j++) s += datos[j];
    out[i] = s / Math.max(1, fin - ini);
  }
  return out;
}

function aWavBase64(muestras, frec) {
  const buf = new ArrayBuffer(44 + muestras.length * 2);
  const v = new DataView(buf);
  const txt = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); v.setUint32(4, 36 + muestras.length * 2, true); txt(8, 'WAVE'); txt(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, frec, true);
  v.setUint32(28, frec * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); txt(36, 'data'); v.setUint32(40, muestras.length * 2, true);
  for (let i = 0; i < muestras.length; i++) { const x = Math.max(-1, Math.min(1, muestras[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
