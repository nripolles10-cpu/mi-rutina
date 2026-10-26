/* Plugin de Vite que crea sw.js (el "service worker" de la versión web) al construir.
   Lleva la lista exacta de archivos de esta versión para que la web funcione SIN internet
   después de abrirla una vez. En la app Android no se usa (allí todo va dentro del APK). */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function archivosPublicos(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = base ? base + '/' + e.name : e.name;
    return e.isDirectory() ? archivosPublicos(path.join(dir, e.name), rel) : [rel];
  });
}

export function serviceWorker() {
  let publicDir = 'public';
  return {
    name: 'mi-rutina-sw',
    apply: 'build',
    configResolved(cfg) { publicDir = cfg.publicDir; },
    generateBundle(_opts, bundle) {
      // Fuentes: solo las .woff2 de alfabeto latino (las demás se guardan si algún día se piden)
      const fuenteInnecesaria = (f) => /\.woff$/.test(f) || (/\.woff2$/.test(f) && /(cyrillic|greek|vietnamese|devanagari)/.test(f));
      const archivos = ['./', 'index.html']
        .concat(Object.keys(bundle).filter((f) => !f.endsWith('.map') && !fuenteInnecesaria(f)))
        .concat(archivosPublicos(publicDir).filter((f) => f !== 'sw.js'));
      const plantilla = fs.readFileSync(new URL('./sw-plantilla.js', import.meta.url), 'utf8');
      const version = createHash('sha256').update(plantilla + archivos.join('|') + Object.values(bundle).map((b) => b.code || '').join('')).digest('hex').slice(0, 12);
      const codigo = plantilla
        .replace("const VERSION = '__VERSION__';", "const VERSION = '" + version + "';")
        .replace('const ARCHIVOS = __ARCHIVOS__;', 'const ARCHIVOS = ' + JSON.stringify(archivos) + ';');
      if (codigo.indexOf('__ARCHIVOS__;') !== -1 || codigo.indexOf("'__VERSION__'") !== -1) this.error('No se pudo generar sw.js');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: codigo });
    },
  };
}
