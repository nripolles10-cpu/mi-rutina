#!/usr/bin/env node
/* Genera src/data/defaultData.json (lo que ven tus amigos la primera vez que abren la app).
   Uso:
     npm run make-default -- GYMR1.xxxx.yyyy          (el código copiado de la app)
     npm run make-default -- ruta/al/archivo.txt       (un archivo con el código o un defaultData.json)
     npm run make-default -- --semilla                 (vuelve a la rutina de serie)
   Opciones: --sin-recetas  (no incluir recetas)   --salida=archivo.json  (escribir en otro sitio) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeShare, validateShareObj } from '../src/utils/share.js';
import { buildDefaultData } from '../src/utils/defaults.js';
import { buildInitialState } from '../src/state/migrate.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const salidaArg = args.find((a) => a.startsWith('--salida='));
const destino = salidaArg ? path.resolve(salidaArg.slice('--salida='.length)) : path.join(raiz, 'src', 'data', 'defaultData.json');
const sinRecetas = args.includes('--sin-recetas');
const entrada = args.filter((a) => !a.startsWith('--'))[0];

function fallar(msg) { console.error('\n❌ ' + msg + '\n'); process.exit(1); }

let obj;
if (args.includes('--semilla')) {
  obj = buildDefaultData(buildInitialState(), { recetas: !sinRecetas });
} else {
  if (!entrada) fallar('Falta el código. Ejemplo: npm run make-default -- GYMR1.abc.def');
  let texto = entrada;
  if (fs.existsSync(entrada)) texto = fs.readFileSync(entrada, 'utf8');
  texto = texto.replace(/^\uFEFF/, '').trim();
  if (texto.startsWith('{')) {
    let parsed;
    try { parsed = JSON.parse(texto); } catch (e) { fallar('El archivo no es un JSON válido.'); }
    const v = validateShareObj(parsed);
    if (!v.ok) fallar(v.error);
    obj = buildDefaultData(parsed, { recetas: !sinRecetas });
  } else {
    const r = decodeShare(texto);
    if (!r.ok) fallar(r.error);
    obj = buildDefaultData(r.obj, { recetas: !sinRecetas });
  }
}
const v = validateShareObj(obj);
if (!v.ok) fallar('El resultado no es válido: ' + v.error);
fs.writeFileSync(destino, JSON.stringify(obj, null, 2) + '\n');
console.log('\n✅ Guardado ' + path.relative(raiz, destino));
console.log('   ' + obj.rutina.days.length + ' días y ' + Object.keys(obj.rutina.exercises).length + ' ejercicios' + (obj.recetas ? ', ' + obj.recetas.length + ' recetas' : ', sin recetas'));
console.log('   Sin datos personales (peso, diario, medidas…). Sube el cambio a GitHub y la próxima APK lo llevará.\n');
