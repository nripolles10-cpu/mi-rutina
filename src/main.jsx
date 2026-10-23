// Punto de entrada. Todo va empaquetado dentro de la app: sin CDN y sin Babel en el móvil.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import { App } from './App.jsx';
import { Native } from './native/index.js';

function pintarError(e) {
  const el = document.getElementById('root');
  if (el) el.innerHTML = '<div id="boot-fallback">No se pudo abrir Mi Rutina. Cierra la app y vuelve a abrirla.<br><small style="opacity:.6">' + String((e && e.message) || e).replace(/</g, '&lt;') + '</small></div>';
}

Native.init()
  .catch(() => { /* si algo falla al preparar el móvil, la app arranca igualmente con lo que pueda leer */ })
  .then(() => { createRoot(document.getElementById('root')).render(<App />); })
  .catch(pintarError);
