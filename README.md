# Mi Rutina

App de gimnasio (React + Vite) empaquetada como app de Android con Capacitor. Funciona sin internet
y también se puede abrir en el navegador del ordenador.

**¿Quieres el APK o instalarlo en el móvil?** Lee [GUIA.md](GUIA.md): está pensada para hacerlo sin saber programar.

## Carpetas

| Carpeta / archivo | Qué es |
|---|---|
| `src/` | El código de la app (pantallas, lógica, capa nativa en `src/native/`) |
| `src/data/defaultData.json` | La rutina con la que arranca la app la primera vez (ver GUIA.md, "Rutina para tus amigos") |
| `tests/` | Pruebas automáticas (`npm test`) |
| `android/` | Proyecto Android que genera el APK |
| `assets/` | Imágenes de partida del icono y de la pantalla de carga (`npm run assets`) |
| `scripts/` | Utilidades: `make-default` (crear `defaultData.json`), iconos |
| `.github/workflows/` | Compilación automática del APK en GitHub |
| `docs/` | Informes de cada fase |
| `legacy/` | La versión de un solo archivo HTML (Fase 1), como referencia |

## Comandos (necesitas Node 22)

```bash
npm install          # una vez
npm run dev          # abrir la app en el navegador del ordenador
npm test             # pruebas automáticas
npm run lint         # revisar el código
npm run build        # construir la web (carpeta dist/)
npm run android:sync # construir y copiar la web al proyecto Android
npm run make-default -- <código GYMR1… | archivo>   # crear la rutina por defecto para amigos
```
