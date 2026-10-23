
/* ---------- Comida, copiado y exportación ---------- */

// Mensaje de éxito en el estilo normal y de fallo en amarillo
export function toastResult(showToast, ok, okMsg, failMsg) { showToast(ok ? okMsg : failMsg, ok ? undefined : 'warn'); return ok; }

export function legacyCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch (e) { return false; }
}

export function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // La API moderna es asíncrona: si falla (permiso denegado, WebView antigua) se intenta el método clásico
      navigator.clipboard.writeText(text).catch(() => { legacyCopy(text); });
      return true;
    }
  } catch (e) { /* seguimos con el método antiguo */ }
  return legacyCopy(text);
}
