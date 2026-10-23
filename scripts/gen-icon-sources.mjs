/* Genera las imágenes de partida del icono y de la pantalla de carga (carpeta assets/).
   Después "capacitor-assets generate --android" crea todos los tamaños que pide Android.
   Uso: npm run assets  (hace las dos cosas) */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(raiz, 'assets');
fs.mkdirSync(dir, { recursive: true });

const FONDO_APP = '#060913';
const degradado = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#22D3EE"/><stop offset="0.55" stop-color="#818CF8"/><stop offset="1" stop-color="#F472B6"/></linearGradient>`;

// Mancuerna blanca centrada en (512,512); escala 1 = unos 560 px de ancho
function mancuerna(escala, color = '#FFFFFF') {
  return `<g transform="translate(512 512) scale(${escala}) rotate(-35)" fill="${color}">
    <rect x="-200" y="-22" width="400" height="44" rx="14"/>
    <rect x="-262" y="-150" width="72" height="300" rx="26"/>
    <rect x="190" y="-150" width="72" height="300" rx="26"/>
    <rect x="-320" y="-100" width="52" height="200" rx="20"/>
    <rect x="268" y="-100" width="52" height="200" rx="20"/>
  </g>`;
}
const svg = (cuerpo, fondo = '') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>${degradado}</defs>${fondo}${cuerpo}</svg>`);

async function png(nombre, buffer, tam) {
  await sharp(buffer, { density: 300 }).resize(tam, tam).png().toFile(path.join(dir, nombre));
  console.log('✓ assets/' + nombre);
}

// Icono completo (Android antiguos): cuadrado con degradado y la mancuerna
await png('icon-only.png', svg(mancuerna(1.0), '<rect width="1024" height="1024" fill="url(#g)"/>'), 1024);
// Icono adaptable (Android 8+): fondo y primer plano por separado; la mancuerna dentro de la zona segura (66 %)
await png('icon-background.png', svg('', '<rect width="1024" height="1024" fill="url(#g)"/>'), 1024);
await png('icon-foreground.png', svg(mancuerna(0.72)), 1024);

// Pantalla de carga: fondo oscuro de la app con el icono redondeado en el centro
const iconoRedondo = await sharp(svg(mancuerna(1.0), '<rect width="1024" height="1024" rx="230" fill="url(#g)"/>'), { density: 300 }).resize(620, 620).png().toBuffer();
for (const nombre of ['splash.png', 'splash-dark.png']) {
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: FONDO_APP } })
    .composite([{ input: iconoRedondo, gravity: 'center' }]).png().toFile(path.join(dir, nombre));
  console.log('✓ assets/' + nombre);
}
