/* Iconos de la versión web instalable (PWA) a partir de assets/icon-only.png y assets/icon-foreground.png.
   Se ejecuta dentro de "npm run assets". */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(raiz, 'public', 'iconos');
fs.mkdirSync(dir, { recursive: true });
const completo = path.join(raiz, 'assets', 'icon-only.png');
for (const t of [192, 512]) await sharp(completo).resize(t, t).png().toFile(path.join(dir, 'icono-' + t + '.png'));
// "maskable": el sistema lo recorta en círculo o redondeado; el dibujo ya queda dentro de la zona segura
await sharp(path.join(raiz, 'assets', 'icon-background.png')).resize(512, 512)
  .composite([{ input: await sharp(path.join(raiz, 'assets', 'icon-foreground.png')).resize(512, 512).toBuffer() }])
  .png().toFile(path.join(dir, 'icono-maskable-512.png'));
// iPhone (pantalla de inicio): 180 × 180, sin transparencia
await sharp(completo).resize(180, 180).flatten({ background: '#060913' }).png().toFile(path.join(dir, 'apple-touch-icon.png'));
await sharp(completo).resize(32, 32).png().toFile(path.join(dir, 'favicon-32.png'));
console.log('✓ iconos de la PWA en public/iconos');
