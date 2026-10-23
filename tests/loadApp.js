// Carga el código REAL de ultimo.html para los tests:
//  - el script inline de LZString tal cual
//  - el script type="text/babel" compilado con @babel/standalone 7.23.5 (preset react),
//    el MISMO compilador y versión que usa la app en el navegador.
// Devuelve todas las funciones y constantes que se quieran probar, y el componente App.
import fs from 'node:fs';
import path from 'node:path';
import * as Babel from '@babel/standalone';
import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactDOM from 'react-dom';

export const HTML_PATH = process.env.APP_HTML || path.resolve(__dirname, '..', 'ultimo.html');

const NAMES = [
  // datos
  'CATS', 'CAT_IDS', 'SET_TYPES', 'OBJETIVOS', 'RITMOS', 'ACTIVIDAD_FACTOR', 'APP_VERSION', 'SEED_EXERCISES', 'DAYS_SEED',
  'NUTRI_DB', 'STORAGE_KEY', 'FOTOS_KEY', 'BACKUP_KEY', 'RECOVERY_PREFIX',
  // utilidades
  'ymd', 'fromYmd', 'addDays', 'fmt', 'parseNum', 'parseDecimal', 'formatDecimal', 'mean', 'num',
  'ensureStruct', 'normalizeSet', 'effectiveCount', 'computeScore', 'bestSerie1', 'latestSerie1', 'activeExerciseIds',
  'weeklySets', 'muscleProgress', 'calcBMI', 'calcBMRInfo', 'calcCalorias', 'macroSplit', 'calcPlan', 'effNutri',
  'ingMacros', 'mkRecetas', 'kcalOfMacros', 'entryTotals', 'gastoReal', 'setVolume', 'setsVolume',
  'normalizeAgua', 'normalizeRecetas', 'listaCompra', 'calc1RM', 'calcDiscos', 'recTotals', 'recKcal', 'scaleQty', 'safeUrl',
  'macrosFromIngredientes', 'listRescueKeys', 'saveRescue', 'LEGACY_MAX_VERSION',
  // estado y migración
  'normalizeExercise', 'normalizeDay', 'buildInitialState', 'normalizeCurrent', 'upgradeLegacy', 'migrateState', 'MIGRATIONS',
  'readInitialState',
  // compartir / exportar
  'hashStr', 'encodeShare', 'decodeShare', 'buildShareObject', 'describeShare', 'applyImport', 'buildCsv', 'buildDocHtml',
  'buildTxt', 'describeSet', 'csvEsc',
  // nativo y app
  'Native', 'App',
];

export function readScripts(htmlPath = HTML_PATH) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const lz = html.match(/<script>(\/\* lz-string[\s\S]*?)<\/script>/);
  const app = html.match(/<script type="text\/babel" data-presets="react">([\s\S]*?)<\/script>/);
  if (!lz || !app) throw new Error('No encuentro los scripts en el HTML');
  return { html, lzSrc: lz[1], appSrc: app[1] };
}

export function compileApp(appSrc) {
  return Babel.transform(appSrc, { presets: ['react'], sourceType: 'script', filename: 'app.jsx' }).code;
}

export function loadApp({ htmlPath, patch } = {}) {
  const r = readScripts(htmlPath);
  const lzSrc = r.lzSrc;
  const appSrc = patch ? patch(r.appSrc) : r.appSrc;
  // LZString: el código inline de la app
  const lzFactory = new Function('define', 'module', 'angular', lzSrc + '\n;return LZString;');
  const LZString = lzFactory(undefined, undefined, undefined);
  globalThis.LZString = LZString;
  // Quitamos solo la última línea que monta la app en #root (los tests la montan cuando quieren)
  const body = appSrc.replace(/ReactDOM\.createRoot\(document\.getElementById\('root'\)\)\.render\([^\n]*\);?\s*$/, '');
  if (body === appSrc) throw new Error('No encuentro la línea de montaje de la app');
  const compiled = compileApp(body);
  const ret = '\n;return {' + NAMES.map((n) => `${JSON.stringify(n)}: (typeof ${n} !== 'undefined' ? ${n} : undefined)`).join(',') + '};';
  const RD = { ...ReactDOM, createRoot: ReactDOMClient.createRoot };
  const fn = new Function('React', 'ReactDOM', 'LZString', compiled + ret);
  const api = fn(React, RD, LZString);
  api.LZString = LZString;
  return api;
}
