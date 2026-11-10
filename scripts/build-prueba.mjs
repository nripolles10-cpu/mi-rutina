/* =========================================================================
   APP EN UN SOLO ARCHIVO HTML (para probarla sin instalar nada)
   npm run prueba → genera mi-rutina-prueba.html con todo dentro (código, estilos e imágenes).
   Se abre con doble clic en el ordenador o desde el móvil. Guarda sus datos aparte de la app
   instalada (en el navegador), así que se puede probar sin miedo.
   ========================================================================= */
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist-prueba';
const DESTINO = process.argv[2] || 'mi-rutina-prueba.html';

await build({
  configFile: false,
  base: './',
  plugins: [react()],
  logLevel: 'warn',
  build: {
    outDir: OUT, emptyOutDir: true, target: 'es2020', modulePreload: false, cssCodeSplit: false,
    assetsInlineLimit: 100 * 1024 * 1024, // imágenes dentro del archivo
    chunkSizeWarningLimit: 100000,
    rollupOptions: { output: { codeSplitting: false } }, // también Word/Excel, sin archivos aparte
  },
});

let html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (m, f) => '<style>' + fs.readFileSync(path.join(OUT, f), 'utf8') + '</style>');
html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g,
  (m, f) => '<script type="module">' + fs.readFileSync(path.join(OUT, f), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>');
// Manifiesto e iconos son archivos sueltos de la web instalable: aquí no hacen falta
html = html.replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*/g, '');
const sueltos = html.match(/(src|href)="\.\/[^"]+"/g);
if (sueltos) throw new Error('Quedan archivos sin meter en el HTML: ' + sueltos.join(', '));
fs.writeFileSync(DESTINO, html);
fs.rmSync(OUT, { recursive: true, force: true });
console.log('Listo: ' + DESTINO + ' (' + Math.round(fs.statSync(DESTINO).size / 1024) + ' KB)');
