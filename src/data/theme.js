import fondoUrl from '../assets/fondo.jpg';

/* =========================================================================
   SECCIÓN 2 · DATOS
   Tema, músculos, tipos de serie, tu rutina actual (semilla), cardio y constantes.
   ========================================================================= */

/* =========================================================================
   TEMA
   ========================================================================= */

export const T = {
  bg: '#060913', text: '#F5F7FF',
  muted: 'var(--muted)', dim: 'var(--dim)', // en la pestaña Rutina estas dos variables son casi blancas
  cyan: '#22D3EE', ac2: '#818CF8', acClaro: '#7DE9FA', acRgb: '34,211,238', violet: '#A78BFA', pink: '#F472B6', lime: '#A3E635', amber: '#FBBF24', red: '#FB7185',
  grad: 'linear-gradient(135deg, #22D3EE 0%, #818CF8 55%, #F472B6 100%)',
};

// Color de acento: cambia con el tema de Ajustes (aplicarTema). En el CSS se usan las variables --ac, --ac2, --ac-claro y --ac-rgb.
export const ACCENT = '#22D3EE';

export const TEMAS_COLOR = {
  cian:    { nombre: 'Cian (original)', ac: '#22D3EE', ac2: '#818CF8', ac3: '#F472B6', claro: '#7DE9FA', rgb: '34,211,238' },
  violeta: { nombre: 'Violeta',         ac: '#A78BFA', ac2: '#F472B6', ac3: '#FB7185', claro: '#C4B5FD', rgb: '167,139,250' },
  verde:   { nombre: 'Verde',           ac: '#34D399', ac2: '#A3E635', ac3: '#22D3EE', claro: '#6EE7B7', rgb: '52,211,153' },
  fuego:   { nombre: 'Fuego',           ac: '#FB923C', ac2: '#F472B6', ac3: '#FACC15', claro: '#FDBA74', rgb: '251,146,60' },
};
export const ESCALAS_LETRA = { pequena: ['Pequeña', 0.92], normal: ['Normal', 1], grande: ['Grande', 1.08], muygrande: ['Muy grande', 1.16] };

// Aplica el tema: actualiza T (lo que se pinta desde el código) y las variables CSS (lo que se pinta con estilos)
export function aplicarTema(id, letra) {
  const t = TEMAS_COLOR[id] || TEMAS_COLOR.cian;
  T.cyan = t.ac; T.ac2 = t.ac2; T.acClaro = t.claro; T.acRgb = t.rgb;
  T.grad = 'linear-gradient(135deg, ' + t.ac + ' 0%, ' + t.ac2 + ' 55%, ' + t.ac3 + ' 100%)';
  try {
    const r = document.documentElement.style;
    r.setProperty('--ac', t.ac); r.setProperty('--ac2', t.ac2); r.setProperty('--ac-claro', t.claro); r.setProperty('--ac-rgb', t.rgb);
    const esc = (ESCALAS_LETRA[letra] || ESCALAS_LETRA.normal)[1];
    // Tamaño de letra: se escala toda la pantalla (textos, botones y separaciones a la vez, para que nada se descuadre)
    if (esc === 1) r.removeProperty('zoom'); else r.setProperty('zoom', String(esc));
  } catch (e) { /* sin documento (pruebas): solo cambia T */ }
}

/* Imagen de fondo (comprimida y oscurecida) */
export const BG_IMAGE = fondoUrl;
