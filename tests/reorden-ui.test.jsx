// Nuevo orden de la app (aprobado en la maqueta): Entreno · Progreso · Comida · Diana · Recursos,
// candado en la cabecera, lista de días con día de la semana, terminar entreno, agua táctil y Mi objetivo.
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { loadApp } from './loadApp.js';
import { ymd } from '../src/utils/format.js';
import { DIAS_LARGOS } from '../src/utils/cardio.js';
import { idsActivosDelDia } from '../src/tabs/RutinaTab.jsx';
import { bloquear, comida, desbloquear, irA } from './nav.js';

let A, errores, oe;
beforeEach(() => {
  localStorage.clear();
  A = loadApp();
  errores = [];
  oe = console.error;
  console.error = (...a) => { errores.push(a.map(String).join(' ')); };
});
afterEach(() => {
  cleanup();
  console.error = oe;
  expect(errores, 'errores de consola:\n' + errores.join('\n')).toEqual([]);
});

const tick = () => act(async () => {});
async function click(el) { fireEvent.click(el); await tick(); }
const texto = () => document.body.textContent;
const guardado = () => JSON.parse(localStorage.getItem(A.STORAGE_KEY));
const esperar = () => act(async () => { await new Promise((r) => setTimeout(r, 350)); });
const HOY = ymd(new Date());
const SEM_HOY = ((new Date().getDay() + 6) % 7) + 1; // 1 = lunes … 7 = domingo
const otroDia = (k) => (k % 7) + 1;

async function montar(retoque) {
  const s = A.buildInitialState(); s.formulario.nombre = 'Prueba';
  s.formulario.sexo = 'hombre';
  s.nutricion = { ...s.nutricion, pesoActual: 80, edad: 30, alturaCm: 178, actividad: 'moderado', objetivo: s.nutricion.objetivo || 'definicion' };
  if (retoque) retoque(s);
  localStorage.setItem(A.STORAGE_KEY, JSON.stringify(s));
  const r = render(<A.App />); await tick();
  return r;
}
const tarjetaDia = (s, i) => screen.getByTestId('dia-' + s.days[i].id);

describe('navegación y candado', () => {
  test('cinco pestañas en el orden pedido, sin Cardio ni Extras sueltas', async () => {
    await montar();
    const nombres = ['Entreno', 'Progreso', 'Comida', 'Diana', 'Recursos'];
    const etiquetas = Array.from(document.querySelectorAll('span')).map((s) => s.textContent).filter((t) => nombres.indexOf(t) !== -1);
    expect(etiquetas.slice(-5)).toEqual(nombres);
    expect(screen.queryAllByText('Extras', { selector: 'span' })).toHaveLength(0);
    expect(screen.queryAllByText('Cardio', { selector: 'span' })).toHaveLength(0);
  });

  test('el candado está en la cabecera: bloqueado no ocupa nada, abierto avisa y se guarda', async () => {
    await montar();
    expect(texto()).not.toContain('Bloqueado — toca para editar');
    expect(screen.queryByTestId('aviso-edicion')).toBeNull();
    await desbloquear(); await esperar();
    expect(screen.getByTestId('aviso-edicion')).toBeTruthy();
    expect(guardado().meta.editMode).toBe(true);
    await bloquear(); await esperar();
    expect(screen.queryByTestId('aviso-edicion')).toBeNull();
    expect(guardado().meta.editMode).toBe(false);
  });
});

describe('Entreno', () => {
  test('al entrar se ve la lista de días como "Día N · nombre" y se pide asignar días', async () => {
    let s0; await montar((s) => { s0 = s; });
    expect(screen.getByTestId('entreno-secciones')).toBeTruthy();
    expect(tarjetaDia(s0, 0).textContent).toContain('Día 1 · ' + s0.days[0].label);
    expect(tarjetaDia(s0, 1).textContent).toContain('Día 2 · ' + s0.days[1].label);
    expect(screen.getByTestId('aviso-asignar')).toBeTruthy();
  });

  test('con el candado abierto se asigna el día de la semana: HOY aparece y un día de la semana solo tiene un entreno', async () => {
    let s0; await montar((s) => { s0 = s; });
    expect(screen.queryAllByLabelText(/^Asignar /)).toHaveLength(0); // bloqueado no se puede
    await desbloquear();
    await click(within(tarjetaDia(s0, 0)).getByLabelText('Asignar ' + DIAS_LARGOS[SEM_HOY - 1])); await esperar();
    expect(guardado().days[0].semana).toBe(SEM_HOY);
    expect(within(tarjetaDia(s0, 0)).getByTestId('marca-hoy')).toBeTruthy();
    // el mismo día de la semana a otro entreno: se lo quita al primero
    await click(within(tarjetaDia(s0, 1)).getByLabelText('Asignar ' + DIAS_LARGOS[SEM_HOY - 1])); await esperar();
    expect(guardado().days[0].semana).toBe(null);
    expect(guardado().days[1].semana).toBe(SEM_HOY);
    expect(within(tarjetaDia(s0, 0)).queryByTestId('marca-hoy')).toBeNull();
    expect(within(tarjetaDia(s0, 1)).getByTestId('marca-hoy')).toBeTruthy();
    // tocar el que ya está marcado lo quita
    await click(within(tarjetaDia(s0, 1)).getByLabelText('Asignar ' + DIAS_LARGOS[SEM_HOY - 1])); await esperar();
    expect(guardado().days[1].semana).toBe(null);
    await bloquear();
    expect(screen.queryAllByLabelText(/^Asignar /)).toHaveLength(0);
  });

  test('si hoy no hay entreno asignado, dice que hoy descansas', async () => {
    await montar((s) => { s.days[0].semana = otroDia(SEM_HOY); });
    expect(screen.getByTestId('hoy-descansas').textContent).toContain(DIAS_LARGOS[SEM_HOY - 1]);
    expect(screen.queryByTestId('marca-hoy')).toBeNull();
  });

  test('dentro del día: volver, descansos en una línea y terminar entreno guarda, cuenta y sobrevive a reabrir la app', async () => {
    let s0; await montar((s) => { s0 = s; s.days[0].semana = SEM_HOY; s.meta.activeDay = s.days[0].id; });
    await click(tarjetaDia(s0, 0));
    expect(screen.getByTestId('volver-dias')).toBeTruthy();
    expect(screen.getByTestId('dia-subtitulo').textContent).toContain('HOY');
    // descansos: una línea que se despliega
    const linea = screen.getByTestId('descansos-linea');
    expect(linea.getAttribute('aria-expanded')).toBe('false');
    expect(texto()).not.toContain('Entre lados (ejercicios unilaterales)');
    await click(linea);
    expect(texto()).toContain('Entre lados (ejercicios unilaterales)');
    // terminar entreno: pide confirmar y guarda los que faltan
    const ids = idsActivosDelDia(guardado().days[0], guardado().exercises);
    expect(ids.length).toBeGreaterThan(0);
    await click(screen.getByTestId('terminar-entreno'));
    expect(texto()).toContain('¿Terminar el entreno?');
    expect(guardado().entrenosHechos || {}).toEqual({}); // aún no
    await click(screen.getByRole('button', { name: 'Terminar' })); await esperar();
    const st = guardado();
    expect(st.entrenosHechos[HOY]).toBe(st.days[0].id);
    ids.forEach((id) => {
      const hoyEntradas = st.exercises[id].history.filter((h) => !h.seed && ymd(new Date(h.date)) === HOY);
      expect(hoyEntradas.length, id).toBe(1);
    });
    expect(screen.getByTestId('entreno-terminado')).toBeTruthy();
    // volver a la lista: ✓ HECHO
    await click(screen.getByTestId('volver-dias'));
    expect(within(tarjetaDia(s0, 0)).getByTestId('marca-hecho')).toBeTruthy();
    // reabrir la app: sigue hecho y no se ha duplicado nada
    cleanup(); render(<A.App />); await tick();
    expect(within(screen.getByTestId('dia-' + s0.days[0].id)).getByTestId('marca-hecho')).toBeTruthy();
    ids.forEach((id) => expect(guardado().exercises[id].history.filter((h) => !h.seed && ymd(new Date(h.date)) === HOY).length).toBe(1));
  });

  test('terminar entreno no guarda dos veces lo que ya tenía registro de hoy', async () => {
    let s0, ya;
    await montar((s) => {
      s0 = s; s.meta.activeDay = s.days[0].id;
      ya = idsActivosDelDia(s.days[0], s.exercises)[0];
      const ex = s.exercises[ya];
      ex.history = (ex.history || []).concat([{ date: new Date().toISOString(), sets: JSON.parse(JSON.stringify(ex.currentSets)) }]);
    });
    await click(tarjetaDia(s0, 0));
    const ids = idsActivosDelDia(guardado().days[0], guardado().exercises);
    await click(screen.getByTestId('terminar-entreno'));
    expect(texto()).toContain('de ' + (ids.length - 1) + ' ejercicio'); // avisa de cuántos faltan, sin contar el ya guardado
    await click(screen.getByRole('button', { name: 'Terminar' })); await esperar();
    ids.forEach((id) => expect(guardado().exercises[id].history.filter((h) => !h.seed && ymd(new Date(h.date)) === HOY).length, id).toBe(1));
  });

  test('en el entreno en vivo, "Terminar entreno" pide un segundo toque y marca el día como hecho', async () => {
    let s0; await montar((s) => { s0 = s; s.meta.activeDay = s.days[0].id; });
    await click(tarjetaDia(s0, 0));
    await click(screen.getByRole('button', { name: /Empezar entreno en vivo/ }));
    const fin = screen.getByTestId('vivo-terminar');
    await click(fin);
    expect(fin.textContent).toContain('Toca otra vez');
    expect(guardado().entrenosHechos || {}).toEqual({});
    await click(fin); await esperar();
    expect(guardado().entrenosHechos[HOY]).toBe(s0.days[0].id);
    expect(texto()).toContain('Entreno terminado');
  });

  test('Cardio y Movilidad son apartados de Entreno', async () => {
    await montar();
    await irA('Cardio'); await esperar();
    expect(texto()).toContain('Elegir tipo de cardio');
    expect(guardado().meta.entrenoSec).toBe('cardio');
    await irA('Movilidad');
    expect(texto()).toContain(guardado().extras.movilidad.titulo);
  });
});

describe('Progreso', () => {
  test('peso, racha y debajo el calendario siempre visible; apartados Análisis, Cuerpo y Logros', async () => {
    await montar();
    await irA('Progreso');
    const t = texto();
    expect(t.indexOf('Peso corporal')).toBeGreaterThan(-1);
    expect(t.indexOf('Peso corporal')).toBeLessThan(t.indexOf('Racha'));
    expect(t.indexOf('Racha')).toBeLessThan(t.indexOf('Calendario'));
    expect(screen.getByTestId('cal-leyenda')).toBeTruthy();
    const chips = Array.from(screen.getByTestId('progreso-secciones').querySelectorAll('button')).map((b) => b.textContent);
    expect(chips).toEqual(['📈 Análisis', '📏 Cuerpo', '🏅 Logros']);
    expect(t).not.toContain('Resumen de la semana');
  });
});

describe('Comida', () => {
  test('los macros van arriba y "Ajustar" lleva a Mi objetivo', async () => {
    await montar();
    await irA('Comida');
    const macros = screen.getByTestId('macros-dia');
    const secciones = screen.getByTestId('comida-secciones');
    expect(macros.compareDocumentPosition(secciones) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(Array.from(secciones.querySelectorAll('button')).map((b) => b.textContent)).toEqual(['Hoy', 'Semana', 'Recetas', 'Mi objetivo']);
    await click(screen.getByTestId('macros-ajustar')); await esperar();
    expect(guardado().meta.comidaSec).toBe('objetivo');
    expect(texto()).toContain('las calorías y macros de arriba se ajustan solas');
    await comida('Semana');
    expect(texto()).toContain('Lista de la compra');
  });

  test('agua: tocar la tarjeta suma 1 L; con el candado abierto se puede quitar y cambiar el objetivo', async () => {
    await montar((s) => { s.comida.agua = { ...s.comida.agua, objetivo: 3, dias: {} }; s.meta.comidaSec = 'hoy'; });
    await irA('Comida');
    expect(screen.getByTestId('agua-total').textContent).toBe('0 de 3 L');
    await click(screen.getByTestId('agua'));
    await click(screen.getByTestId('agua')); await esperar();
    expect(guardado().comida.agua.dias[HOY]).toBe(2);
    expect(screen.getByTestId('agua-total').textContent).toBe('2 de 3 L');
    expect(screen.queryByTestId('agua-quitar')).toBeNull(); // bloqueado: solo sumar
    await desbloquear();
    await click(screen.getByTestId('agua-quitar')); await esperar();
    expect(guardado().comida.agua.dias[HOY]).toBe(1); // y no ha sumado al tocar dentro de los ajustes
  });
});

describe('Recursos', () => {
  test('suplementos primero (plegados), luego calculadoras y el glosario al final', async () => {
    await montar();
    await irA('Recursos');
    const t = texto();
    const iSup = t.indexOf('Mis suplementos'), i1rm = t.indexOf('Calculadoras'), iGlo = t.indexOf('Glosario');
    expect(iSup).toBeGreaterThan(-1);
    expect(iSup).toBeLessThan(i1rm);
    expect(i1rm).toBeLessThan(iGlo);
    const sup = screen.getByTestId('sup-plegable');
    expect(sup.getAttribute('aria-expanded')).toBe('false');
    await click(sup);
    expect(sup.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('calendario de colores', () => {
  test('cada combinación de entreno, cardio y movilidad tiene su color; las tres, verde con ✓', () => {
    const casos = [[{ entreno: 1 }, 'e'], [{ cardio: 1 }, 'c'], [{ movilidad: 1 }, 'm'], [{ entreno: 1, cardio: 1 }, 'ec'],
      [{ entreno: 1, movilidad: 1 }, 'em'], [{ cardio: 1, movilidad: 1 }, 'cm'], [{ entreno: 1, cardio: 1, movilidad: 1 }, 'ecm']];
    casos.forEach(([dia, k]) => expect(A.comboDelDia(dia).k).toBe(k));
    expect(A.comboDelDia({})).toBe(null);
    const bg = (k) => A.COMBOS_DIA.find((x) => x.k === k).bg;
    // una sola cosa: tres colores apagados y distintos entre sí
    expect(new Set(['e', 'c', 'm'].map(bg)).size).toBe(3);
    ['e', 'c', 'm'].forEach((k) => expect(bg(k)).toMatch(/^rgba\(.*0\.38\)$/));
    // dos o tres cosas: el mismo verde intenso; las tres llevan además borde dorado
    expect(new Set(['ec', 'em', 'cm', 'ecm'].map(bg)).size).toBe(1);
    expect(A.COMBOS_DIA.filter((x) => x.oro).map((x) => x.k)).toEqual(['ecm']);
    ['ec', 'em', 'cm', 'ecm'].forEach((k) => expect(A.COMBOS_DIA.find((x) => x.k === k).fuerte).toBe(true));
    expect(A.LEYENDA_DIA.map((x) => x.label)).toEqual(['Entreno', 'Cardio', 'Movilidad', 'Dos cosas ✓', 'Las tres ✓']);
  });

  test('un día terminado cuenta como entreno aunque no tenga sesión', () => {
    const celdas = A.calendarioMes('2026-11', [], { '2026-11-03': true }, { entrenoFechas: { '2026-11-03': true }, movilidadFechas: { '2026-11-05': true } });
    expect(A.comboDelDia(celdas.find((c) => c.fecha === '2026-11-03')).k).toBe('ec');
    expect(A.comboDelDia(celdas.find((c) => c.fecha === '2026-11-05')).k).toBe('m');
  });

  test('en la app, hoy con entreno, cardio y movilidad sale como día completo', async () => {
    await montar((s) => {
      s.entrenosHechos = { [HOY]: s.days[0].id };
      s.cardio[0].hechos = [HOY];
      s.extras.movilidad.hechos = [HOY];
    });
    await irA('Progreso');
    const celda = screen.getByTestId('cal-' + HOY);
    expect(celda.getAttribute('data-combo')).toBe('ecm');
    expect(celda.textContent).toContain('✓');
    expect(within(celda).getByTestId('cal-tick-oro')).toBeTruthy();
    expect(celda.style.border).toMatch(/2px solid/);
    expect(screen.getByTestId('cal-resumen').textContent).toMatch(/1 día completo/);
  });
});

describe('movilidad', () => {
  test('como el cardio: cumplimiento de la semana, tick de hoy, editar los días y sale en el calendario', async () => {
    await montar();
    await irA('Movilidad');
    const seg = screen.getByTestId('movilidad-seguimiento');
    expect(seg.textContent).toMatch(/Esta semana\s*0 de 2/); // por defecto 2 días a la semana
    await click(within(seg).getByRole('button', { name: /He hecho la movilidad de hoy/ })); await esperar();
    expect(guardado().extras.movilidad.hechos).toEqual([HOY]);
    expect(seg.textContent).toMatch(/1 de 2/);
    // editar: cuántos días o qué días
    await click(screen.getByTestId('movilidad-editar'));
    await click(within(seg).getByRole('button', { name: '3 días a la semana' })); await esperar();
    expect(guardado().extras.movilidad.veces).toBe(3);
    await click(within(seg).getByRole('button', { name: /Días concretos/ })); await esperar();
    await click(within(seg).getByRole('button', { name: 'miércoles' })); await esperar();
    expect(guardado().extras.movilidad).toMatchObject({ modo: 'dias', dias: [3] });
    await click(screen.getByTestId('movilidad-editar'));
    // en el calendario, hoy sale con movilidad
    await irA('Progreso');
    expect(screen.getByTestId('cal-' + HOY).getAttribute('data-combo')).toContain('m');
  });

  test('los datos antiguos de movilidad (solo el vídeo) se completan sin perder el vídeo', () => {
    const s = A.buildInitialState();
    s.extras.movilidad = { titulo: 'Mi vídeo', url: 'https://ejemplo.com/v', hechos: ['2026-11-01', 'malo', '2026-11-01'], dias: [9, 2, 2], veces: 0 };
    const m = A.migrateState(JSON.parse(JSON.stringify(s)));
    expect(m.extras.movilidad).toEqual({ titulo: 'Mi vídeo', url: 'https://ejemplo.com/v', modo: 'veces', dias: [2], veces: 2, hechos: ['2026-11-01'] });
  });
});

describe('copias', () => {
  test('la copia "Todo" lleva el día de la semana de cada entreno y los entrenos terminados', () => {
    const s = A.migrateState(A.buildInitialState());
    s.days[0].semana = 2; s.days[1].semana = 5;
    s.entrenosHechos = { '2026-11-09': s.days[0].id };
    const codigo = A.encodeShare(A.buildShareObject(s, { historial: true, peso: true, recetas: true, nutricion: true, todo: true }));
    const leido = A.decodeShare(codigo);
    expect(leido.ok).toBe(true);
    const otro = A.applyImport(A.migrateState(A.buildInitialState()), leido.obj, 'todo');
    expect(otro.days[0].semana).toBe(2);
    expect(otro.days[1].semana).toBe(5);
    expect(otro.entrenosHechos).toEqual({ '2026-11-09': s.days[0].id });
  });
});

describe('descargar la rutina', () => {
  test('el texto lleva el día de la semana de cada entreno (si lo tiene)', () => {
    const s = A.migrateState(A.buildInitialState());
    s.days[0].semana = 7;
    const t = A.buildTxt(s);
    expect(t).toContain('DÍA 1: ' + s.days[0].label.toUpperCase() + ' · DOMINGO');
    expect(t).toContain('DÍA 2: ' + s.days[1].label.toUpperCase() + '\n');
  });
});

describe('datos antiguos', () => {
  test('se convierten sin perder nada: pestaña Cardio, apartado Progreso, días repetidos y entrenos hechos', () => {
    const s = A.buildInitialState();
    s.meta.activeTab = 'cardio';
    s.meta.progresoSec = 'progreso';
    delete s.meta.entrenoSec; delete s.meta.comidaSec;
    s.days[0].semana = 3; s.days[1].semana = 3; s.days[2].semana = 9;
    s.entrenosHechos = { '2026-11-01': 'piernaA', malo: 'x', '2026-11-02': 5 };
    const m = A.migrateState(JSON.parse(JSON.stringify(s)));
    expect(m.meta.activeTab).toBe('rutina');
    expect(m.meta.entrenoSec).toBe('cardio');
    expect(m.meta.progresoSec).toBe('analisis');
    expect(m.meta.comidaSec).toBe('hoy');
    expect(m.days[0].semana).toBe(3);
    expect(m.days[1].semana).toBe(null);
    expect(m.days[2].semana).toBe(null);
    expect(m.entrenosHechos).toEqual({ '2026-11-01': 'piernaA' });
  });
});
