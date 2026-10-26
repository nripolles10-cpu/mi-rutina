/* global __ARCHIVOS__ */
/* Service worker de Mi Rutina (versión web / PWA). Generado al construir: no editar sw.js a mano.
   - Guarda todos los archivos de la app para que funcione sin internet.
   - La página principal se pide primero a internet (así llegan las versiones nuevas) y, sin conexión, se usa la guardada.
   - Los demás archivos llevan su huella en el nombre: se sirven desde lo guardado.
   - NO guarda ni toca tus datos: esos están en el almacenamiento del navegador, no aquí. */
const VERSION = '__VERSION__';
const CACHE = 'mi-rutina-' + VERSION;
const ARCHIVOS = __ARCHIVOS__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.indexOf('mi-rutina-') === 0 && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // enlaces externos (YouTube…): normal
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => {
      if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('./', copia)); }
      return r;
    }).catch(() => caches.match('./', { ignoreVary: true }).then((r) => r || caches.match('index.html', { ignoreVary: true }))));
    return;
  }
  // ignoreVary: algunos servidores mandan "Vary: Origin" y los scripts de tipo módulo llevan Origin
  e.respondWith(caches.match(req, { ignoreVary: true }).then((r) => r || fetch(req).then((resp) => {
    if (resp && resp.ok && resp.type === 'basic') { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
    return resp;
  })));
});
