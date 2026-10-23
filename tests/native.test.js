// Pruebas de la capa nativa (src/native/index.js) simulando los plugins de Capacitor como si
// estuviéramos en el móvil. No sustituyen a probarlo en un Android real, pero comprueban la lógica:
// elegir la copia más reciente, no perder datos si algo falla, mover las fotos antiguas a archivos…
import { describe, test, expect, beforeEach, vi } from 'vitest';

const sim = {};
function reiniciarSimulacion() {
  sim.prefs = {};
  sim.files = {};
  sim.prefsFalla = false;
  sim.fsFallaEn = null; // id de foto cuya escritura falla
  sim.permiso = 'granted';
  sim.programadas = [];
  sim.compartido = [];
  sim.shareCancela = false;
}

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, convertFileSrc: (u) => 'https://localhost/_capacitor_file_' + u.replace('file://', '') },
  SystemBars: { setStyle: async () => {} },
  SystemBarsStyle: { Dark: 'DARK' },
}));
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }) => ({ value: key in sim.prefs ? sim.prefs[key] : null }),
    set: async ({ key, value }) => { if (sim.prefsFalla) throw new Error('disco lleno'); sim.prefs[key] = value; },
  },
}));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA', Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    writeFile: async ({ path, data, directory }) => {
      if (sim.fsFallaEn && path.indexOf('fotos/' + sim.fsFallaEn + '_') === 0) throw new Error('sin espacio');
      const uri = 'file:///data/user/0/com.nripolles.mirutina/' + (directory === 'CACHE' ? 'cache/' : 'files/') + path;
      sim.files[uri] = data;
      return { uri };
    },
    readFile: async ({ path }) => { if (!(path in sim.files)) throw new Error('no existe'); return { data: sim.files[path] }; },
    deleteFile: async ({ path }) => { delete sim.files[path]; },
  },
}));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    createChannel: async () => {},
    checkPermissions: async () => ({ display: sim.permiso }),
    requestPermissions: async () => { if (sim.permiso === 'prompt') sim.permiso = sim.respuestaPermiso || 'granted'; return { display: sim.permiso }; },
    checkExactNotificationSetting: async () => ({ exact_alarm: 'granted' }),
    cancel: async () => {},
    schedule: async ({ notifications }) => { sim.programadas.push(...notifications); },
  },
}));
vi.mock('@capacitor/share', () => ({
  Share: { share: async (o) => { if (sim.shareCancela) throw new Error('Share canceled'); sim.compartido.push(o); } },
}));
vi.mock('@capacitor/keyboard', () => ({ Keyboard: { addListener: async () => ({ remove() {} }) } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: async () => ({ remove() {} }), exitApp: async () => {} } }));
vi.mock('@capacitor/camera', () => ({ Camera: {}, MediaTypeSelection: { Photo: 'photo' } }));
vi.mock('@capacitor/haptics', () => ({ Haptics: { vibrate: async () => {} } }));
vi.mock('@capacitor/browser', () => ({ Browser: { open: async () => {} } }));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: async () => {} } }));
vi.mock('@capacitor-community/keep-awake', () => ({ KeepAwake: { keepAwake: async () => {}, allowSleep: async () => {} } }));

const K = 'gymtracker_nacho_v2';
async function cargarNative() {
  vi.resetModules();
  const m = await import('../src/native/index.js');
  return m.Native;
}

beforeEach(() => { localStorage.clear(); reiniciarSimulacion(); });

describe('arranque en el móvil: qué copia se usa', () => {
  test('sin nada guardado devuelve null (primer arranque)', async () => {
    const N = await cargarNative();
    await N.init();
    expect(N.loadState()).toBeNull();
  });

  test('usa la copia del almacenamiento nativo si es la más reciente', async () => {
    sim.prefs[K] = JSON.stringify({ v: 'nativa' }); sim.prefs[K + '_hora'] = '2000';
    localStorage.setItem(K, JSON.stringify({ v: 'espejo' })); localStorage.setItem(K + '_hora', '1000');
    const N = await cargarNative();
    await N.init();
    expect(N.loadState()).toEqual({ v: 'nativa' });
  });

  test('usa el espejo si es más reciente (la app se cerró antes de terminar de guardar)', async () => {
    sim.prefs[K] = JSON.stringify({ v: 'nativa' }); sim.prefs[K + '_hora'] = '1000';
    localStorage.setItem(K, JSON.stringify({ v: 'espejo' })); localStorage.setItem(K + '_hora', '2000');
    const N = await cargarNative();
    await N.init();
    expect(N.loadState()).toEqual({ v: 'espejo' });
  });

  test('si una copia está estropeada usa la otra', async () => {
    sim.prefs[K] = '{roto'; sim.prefs[K + '_hora'] = '9999';
    localStorage.setItem(K, JSON.stringify({ v: 'espejo' })); localStorage.setItem(K + '_hora', '1');
    const N = await cargarNative();
    await N.init();
    expect(N.loadState()).toEqual({ v: 'espejo' });
  });

  test('si las dos están estropeadas NO se tiran: loadState lanza el error con el texto para rescatarlo', async () => {
    sim.prefs[K] = '{roto nativo';
    localStorage.setItem(K, '{roto espejo');
    const N = await cargarNative();
    await N.init();
    let err = null;
    try { N.loadState(); } catch (e) { err = e; }
    expect(err).not.toBeNull();
    expect(err.raw).toBe('{roto nativo');
  });

  test('si no se puede leer el almacenamiento nativo, arranca con el espejo y avisa', async () => {
    localStorage.setItem(K, JSON.stringify({ v: 'espejo' }));
    const N = await cargarNative();
    const { Preferences } = await import('@capacitor/preferences');
    const get = Preferences.get;
    Preferences.get = async () => { throw new Error('roto'); };
    try { await N.init(); } finally { Preferences.get = get; }
    expect(N.loadState()).toEqual({ v: 'espejo' });
    expect(N.problemasArranque().join(' ')).toMatch(/copia interna/);
  });
});

describe('guardar en el móvil', () => {
  test('guarda en el almacenamiento nativo y en el espejo, en orden, y flush espera', async () => {
    const N = await cargarNative();
    await N.init();
    for (let i = 1; i <= 5; i++) expect(N.saveState({ n: i })).toBe(true);
    await N.flush();
    expect(JSON.parse(sim.prefs[K])).toEqual({ n: 5 }); // nunca queda una versión anterior encima
    expect(JSON.parse(localStorage.getItem(K))).toEqual({ n: 5 });
    expect(Number(sim.prefs[K + '_hora'])).toBeGreaterThan(0);
    expect(N.loadState()).toEqual({ n: 5 });
  });

  test('si falla el almacenamiento nativo avisa, y los datos siguen en el espejo y se recuperan al reiniciar', async () => {
    let N = await cargarNative();
    await N.init();
    const avisos = [];
    N.onSaveError((m) => avisos.push(m));
    sim.prefsFalla = true;
    N.saveState({ n: 'importante' });
    await N.flush();
    expect(avisos.length).toBe(1);
    sim.prefsFalla = false;
    N = await cargarNative(); // la app se vuelve a abrir
    await N.init();
    expect(N.loadState()).toEqual({ n: 'importante' });
  });
});

describe('fotos en el móvil', () => {
  const foto = 'data:image/jpeg;base64,' + btoa('jpeg-falso');

  test('las fotos antiguas (base64) se pasan a archivos y se guarda una copia de seguridad', async () => {
    localStorage.setItem('gymtracker_fotos_v1', JSON.stringify({ gemelo: foto, hipThrust: foto }));
    const N = await cargarNative();
    await N.init();
    const mapa = N.loadFotos();
    expect(Object.keys(mapa).sort()).toEqual(['gemelo', 'hipThrust']);
    expect(mapa.gemelo).toMatch(/^file:\/\/.*fotos\/gemelo_/);
    expect(sim.files[mapa.gemelo]).toBe(btoa('jpeg-falso'));
    expect(JSON.parse(sim.prefs.gymtracker_fotos_v2)).toEqual(mapa);
    expect(localStorage.getItem('gymtracker_fotos_v1')).toBeNull();
    expect(localStorage.getItem('gymtracker_fotos_v1_migradas')).toContain('gemelo');
    expect(N.photoSrc(mapa.gemelo)).toMatch(/^https:\/\/localhost\/_capacitor_file_/);
    // y se pueden volver a sacar como base64 para una copia de seguridad
    expect(await N.photosAsDataUrls(mapa)).toEqual({ gemelo: foto, hipThrust: foto });
  });

  test('si una foto no se puede pasar, NO se borra nada de lo antiguo y se avisa', async () => {
    localStorage.setItem('gymtracker_fotos_v1', JSON.stringify({ gemelo: foto, hipThrust: foto }));
    sim.fsFallaEn = 'hipThrust';
    const N = await cargarNative();
    await N.init();
    expect(localStorage.getItem('gymtracker_fotos_v1')).toContain('hipThrust');
    expect(N.problemasArranque().join(' ')).toMatch(/fotos antiguas/);
    expect(Object.keys(N.loadFotos())).toEqual(['gemelo']);
    // al siguiente arranque lo vuelve a intentar sin duplicar la que ya pasó
    sim.fsFallaEn = null;
    const N2 = await cargarNative();
    await N2.init();
    expect(Object.keys(N2.loadFotos()).sort()).toEqual(['gemelo', 'hipThrust']);
    expect(localStorage.getItem('gymtracker_fotos_v1')).toBeNull();
  });

  test('cambiar y quitar una foto borra el archivo anterior', async () => {
    const N = await cargarNative();
    await N.init();
    const r1 = await N.savePhoto('gemelo', foto, {});
    expect(r1.ok).toBe(true);
    const primera = r1.mapa.gemelo;
    await new Promise((r) => setTimeout(r, 5));
    const r2 = await N.savePhoto('gemelo', foto, r1.mapa);
    expect(r2.mapa.gemelo).not.toBe(primera);
    await new Promise((r) => setTimeout(r, 0));
    expect(sim.files[primera]).toBeUndefined();
    const r3 = await N.deletePhoto('gemelo', r2.mapa);
    expect(r3.mapa).toEqual({});
    await new Promise((r) => setTimeout(r, 0));
    expect(Object.keys(sim.files).filter((k) => k.indexOf('fotos/') !== -1)).toEqual([]);
  });

  test('si no hay espacio para la foto, se mantiene la anterior', async () => {
    const N = await cargarNative();
    await N.init();
    const r1 = await N.savePhoto('gemelo', foto, {});
    sim.fsFallaEn = 'gemelo';
    const r2 = await N.savePhoto('gemelo', foto, r1.mapa);
    expect(r2.ok).toBe(false);
    expect(r2.mapa).toEqual(r1.mapa);
    expect(sim.files[r1.mapa.gemelo]).toBeDefined();
  });
});

describe('avisos y compartir en el móvil', () => {
  test('programa el aviso del descanso a la hora exacta, en su canal', async () => {
    const N = await cargarNative();
    await N.init();
    const at = Date.now() + 90000;
    const r = await N.scheduleNotification({ id: 1001, title: 'Descanso terminado', body: 'A por la siguiente serie', at });
    expect(r.ok).toBe(true);
    expect(sim.programadas[0]).toMatchObject({ id: 1001, channelId: 'descanso', smallIcon: 'ic_stat_mirutina', schedule: { allowWhileIdle: true } });
    expect(sim.programadas[0].schedule.at.getTime()).toBe(at);
  });

  test('pide el permiso la primera vez; si lo deniegan avisa con motivo "permiso"', async () => {
    const N = await cargarNative();
    await N.init();
    sim.permiso = 'prompt'; sim.respuestaPermiso = 'denied';
    const r = await N.scheduleNotification({ id: 1001, title: 'x', body: 'y', at: Date.now() + 1000 });
    expect(r).toEqual({ ok: false, motivo: 'permiso' });
    expect(sim.programadas.length).toBe(0);
  });

  test('guardar un archivo abre el menú de compartir con el archivo en la caché (sin permisos)', async () => {
    const N = await cargarNative();
    await N.init();
    expect(await N.saveFile('rutina.csv', 'Dia;Ejercicio\n', 'text/csv')).toBe(true);
    expect(sim.compartido[0].files[0]).toMatch(/cache\/compartir\/rutina\.csv$/);
    expect(sim.files[sim.compartido[0].files[0]]).toBe('Dia;Ejercicio\n');
    sim.shareCancela = true;
    expect(await N.saveFile('rutina.csv', 'x', 'text/csv')).toBe(true); // cancelar no es un error
  });
});
