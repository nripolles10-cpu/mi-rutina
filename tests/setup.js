// Zona horaria del usuario (Madrid) para que las fechas locales se prueben como en su móvil
process.env.TZ = 'Europe/Madrid';
// jsdom no trae algunas APIs del navegador que la app usa de forma opcional
if (!globalThis.URL.createObjectURL) globalThis.URL.createObjectURL = () => 'blob:test';
if (!globalThis.URL.revokeObjectURL) globalThis.URL.revokeObjectURL = () => {};
