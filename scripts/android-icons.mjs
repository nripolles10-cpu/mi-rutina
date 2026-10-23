/* Icono adaptable de Android (8.0+) a la resolución correcta.
   capacitor-assets genera las capas a 48 dp y las encoge con un "inset"; aquí se crean a 108 dp
   (el tamaño real de la capa) para que el icono se vea nítido. Se ejecuta dentro de "npm run assets". */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const res = path.join(raiz, 'android', 'app', 'src', 'main', 'res');
if (!fs.existsSync(res)) { console.error('No existe la carpeta android/. Ejecuta antes "npx cap add android".'); process.exit(1); }
const densidades = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, f] of Object.entries(densidades)) {
  const tam = Math.round(108 * f);
  const carpeta = path.join(res, 'mipmap-' + d);
  fs.mkdirSync(carpeta, { recursive: true });
  await sharp(path.join(raiz, 'assets', 'icon-foreground.png')).resize(tam, tam).png().toFile(path.join(carpeta, 'ic_launcher_foreground.png'));
  await sharp(path.join(raiz, 'assets', 'icon-background.png')).resize(tam, tam).png().toFile(path.join(carpeta, 'ic_launcher_background.png'));
}
const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome>
        <inset android:drawable="@drawable/ic_stat_mirutina" android:inset="22%" />
    </monochrome>
</adaptive-icon>
`;
for (const n of ['ic_launcher.xml', 'ic_launcher_round.xml']) fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', n), xml);
// Restos de la plantilla de Capacitor que ya no se usan
for (const f of ['drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml']) fs.rmSync(path.join(res, f), { force: true });
console.log('✓ icono adaptable a 108 dp en ' + Object.keys(densidades).length + ' densidades');
