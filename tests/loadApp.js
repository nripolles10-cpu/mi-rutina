// Reúne en un solo objeto las funciones de los módulos de la app, con los mismos nombres que tenían
// en el archivo único de la Fase 1, para que las pruebas sigan siendo las mismas.
import * as catalog from '../src/data/catalog.js';
import * as seed from '../src/data/seed.js';
import * as recetas from '../src/data/recetas.js';
import * as format from '../src/utils/format.js';
import * as training from '../src/utils/training.js';
import * as health from '../src/utils/health.js';
import * as comida from '../src/utils/comida.js';
import * as clipboard from '../src/utils/clipboard.js';
import * as share from '../src/utils/share.js';
import * as exportar from '../src/utils/exportar.js';
import * as excel from '../src/utils/excel.js';
import * as importar from '../src/utils/importar.js';
import * as defaults from '../src/utils/defaults.js';
import * as word from '../src/utils/word.js';
import * as peso from '../src/utils/peso.js';
import * as musculos from '../src/utils/musculos.js';
import * as migrate from '../src/state/migrate.js';
import * as storage from '../src/state/storage.js';
import * as native from '../src/native/index.js';
import * as back from '../src/native/back.js';
import { App } from '../src/App.jsx';
import defaultData from '../src/data/defaultData.json';

export function loadApp() {
  return {
    ...catalog, ...seed, ...recetas, ...format, ...training, ...health, ...comida, ...clipboard,
    ...share, ...exportar, ...excel, ...importar, ...defaults, ...word, ...peso, ...musculos, ...migrate, ...storage, ...native, ...back,
    App, defaultData,
  };
}
