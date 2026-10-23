# Mi Rutina — Informe de la Fase 2 (app de Android)

Fecha: 23 de octubre de 2026

## Resumen

La app ya es un proyecto **Vite + React + Capacitor** que genera un APK de Android firmado en GitHub Actions.
El diseño y las funciones son los mismos que en `ultimo.html` (Fase 1), con los dos cambios que pediste
y lo que pedía el encargo para el móvil.

- **Pruebas automáticas:** 119 pasan, 0 fallan (`npm test`). Se lanzan también en GitHub antes de cada APK:
  si alguna falla, no se genera el APK.
- **ESLint:** 0 errores, 0 avisos (`npm run lint`).
- **Compilación Android en GitHub Actions:** ver el apartado *Qué está comprobado y qué no*.
- La app sigue funcionando en el navegador del ordenador (`npm run dev`) con `localStorage`, como antes.

## Tus respuestas a las dudas de la Fase 1

- **Duda 1 (trofeo):** el trofeo muestra la mejor marca. Hecho, con prueba automática.
- **Duda 2 (deshacer):** quitados los botones ↩/↪ de la cabecera y todo su código. Lo que borraba sin
  posibilidad de deshacer (borrar un día, restablecer…) sigue pidiendo confirmación y recuerda que tienes
  las copias de seguridad y las copias de rescate.

## Qué se ha hecho

### 1. Proyecto

| Antes (Fase 1) | Ahora |
|---|---|
| Un archivo de 7.000 líneas con React y Babel cargados desde internet | Módulos en `src/` (pantallas, lógica, datos, capa nativa) compilados con Vite |
| Necesitaba internet la primera vez (CDN de React, Babel, fuentes) | Todo va dentro del APK: funciona sin conexión desde el primer arranque. Las fuentes Rajdhani e Inter van incluidas |
| Babel compilaba en el móvil al abrir (lento) | Se compila una vez al construir: arranca más rápido |

`legacy/ultimo-fase1.html` y `legacy/ultimo-original.html` se quedan como referencia.

### 2. Capa nativa (`src/native/index.js`)

Todo lo que depende del móvil pasa por un único objeto `Native`. En el navegador usa las alternativas web, sin errores.

- **Guardado sin perder datos.** En el móvil se guarda en el almacenamiento nativo (Preferences, que Android
  no borra al limpiar la caché del navegador) y además en una copia espejo en `localStorage`, cada una con
  su hora. Al arrancar se usa la más reciente que se pueda leer; si las dos están dañadas, no se tira nada:
  pasa al sistema de copias de rescate de la Fase 1. Las escrituras van en fila (una antigua nunca pisa a una
  nueva) y se esperan al pasar la app a segundo plano. Si el almacenamiento nativo falla, se avisa al usuario.
- **Fotos como archivos.** Antes las fotos iban en base64 dentro de `localStorage` (límite de unos 5 MB).
  Ahora cada foto es un archivo dentro de la app. Las fotos antiguas se pasan a archivos solas la primera vez;
  la lista antigua solo se borra cuando todas se han pasado bien (y se guarda una copia).
  En las copias de seguridad las fotos se siguen metiendo en base64, así que son compatibles con la web.
- **Cámara y galería.** Dos botones: 📷 Cámara (app de cámara del sistema) y 🖼️ Galería (selector de fotos de Android).
  No piden permisos.
- **Aviso del descanso con la pantalla apagada.** Notificación local programada para la hora exacta del final,
  en un canal de prioridad alta con sonido y vibración. Pide el permiso la primera vez (Android 13+).
  Si no se concede, la app lo dice y el aviso suena solo con la app abierta.
- **Guardar y compartir archivos.** Excel, Word, CSV, texto, códigos y `defaultData.json` se abren con el menú
  de compartir de Android (Drive, Archivos/Descargas, WhatsApp, correo…).
- **Botón Atrás.** Cierra la ventana o el aviso que esté abierto, de arriba abajo; si no hay nada, sale de la app.
  En el ordenador, la tecla Escape hace lo mismo.
- **Pantalla encendida** (opción en Ajustes → Pantalla y avisos), **vibración**, **teclado** que no tapa el
  campo, barras del sistema oscuras y márgenes para la barra de estado y la de gestos.

### 3. Funciones nuevas que pedía el encargo para esta fase

- **Descargar la rutina en Excel (.xlsx)** con dos hojas (Rutina y Peso) y en **Word (.docx)** con una tabla por día.
- **Importar una rutina desde Excel o CSV**, con plantilla descargable. Reconoce el separador (`;`, `,` o tabulador),
  los decimales con coma y los tipos de serie (top set, back-off, rest-pause, dropset, calentamiento).
  Los ejercicios con el mismo nombre que los tuyos conservan su historial. Avisa de las filas que no entiende
  y pide confirmación antes de cambiar nada (y se puede deshacer la última importación).
- **Rutina para tus amigos (`src/data/defaultData.json`).** La primera vez que se abre la app, arranca con esa rutina.
  Se crea desde la propia app (Ajustes → Rutina para tus amigos) o con `npm run make-default`.
  Nunca lleva datos personales, peso, diario, historial ni fotos (hay pruebas que lo comprueban).

### 4. Android

- **Identificador:** `com.nripolles.mirutina`. **Nombre:** Mi Rutina. Android 7.0 o superior.
- **Icono** con la mancuerna sobre el degradado cian–violeta–rosa de la app (adaptable, y monocromo para el
  icono temático de Android 13+). **Pantalla de carga** con el fondo oscuro de la app. Se regeneran con `npm run assets`.
- **Solo en vertical.**
- **Permisos (los mínimos):** notificaciones, alarma exacta, vibración, mantener el aviso con la pantalla apagada
  (WAKE_LOCK y reprogramar tras reiniciar) e INTERNET (lo trae Capacitor; la app no envía datos a ningún sitio).
  **Sin** cámara, fotos, archivos ni ubicación.
- **Firma:** con tu propia llave, guardada en los Secrets de GitHub. Hay un flujo para crearla
  ("Crear llave de firma"), que se niega a crear otra si ya existe. **Si no hay llave, no se genera ningún APK**
  (nunca se firma con una llave provisional: no se podría instalar encima del bueno).
- **Número de versión automático** (número de cambios del repositorio): siempre sube, así Android acepta la
  actualización encima. En cada compilación se muestra la huella SHA-256 de la llave para comprobar que es la de siempre.
- **GitHub Actions** (`.github/workflows/android.yml`): en cada cambio en `main` → ESLint → pruebas →
  web → proyecto Android → APK firmado → artefacto `mi-rutina` (30 días).

## Decisiones que se apartan del encargo (y por qué)

1. **Node 22 y Java 21 en vez de Node 20 y Java 17.** La versión actual de Capacitor (8) los exige.
   Con Node 20 / Java 17 habría que usar Capacitor 6, que ya no recibe correcciones.
2. **Excel sin la librería SheetJS (xlsx).** La versión de npm (0.18.5) tiene fallos de seguridad conocidos y ya no
   se actualiza allí. He escrito un generador y un lector de .xlsx pequeños (con `fflate` para el zip),
   con pruebas de ida y vuelta, y de lectura de archivos guardados por Excel.
3. **Guardar archivos con el menú de compartir** en vez de escribir directamente en Descargas. Escribir en
   Descargas pide permisos distintos según la versión de Android y falla en muchos móviles; el menú de compartir
   funciona igual en todos y deja elegir dónde guardarlo.
4. **Permiso de alarma exacta `USE_EXACT_ALARM`.** Es el adecuado para un temporizador instalado fuera de la
   Play Store: se concede solo y el aviso llega a su hora. (Si algún día se publica en la Play Store, Google pide
   justificarlo; un temporizador de descanso es uno de los usos permitidos.)
5. **Pantalla encendida** con el plugin `@capacitor-community/keep-awake` 8.0.1 (compatible con Capacitor 8).

## Qué está comprobado y qué no

**Comprobado aquí (se puede repetir con `npm test`, `npm run lint` y `npm run build`):**

- Las 81 pruebas de la Fase 1, adaptadas a los módulos, y 38 nuevas:
  - Excel y CSV de ida y vuelta (la rutina exportada se vuelve a importar igual, con ids e historial),
    lectura de un .xlsx con el formato que guarda Excel, plantilla, errores y avisos.
  - Word: el .docx se genera y tiene una tabla por día.
  - `defaultData.json`: primer arranque, que no lleva datos personales, que uno roto no impide arrancar,
    y el script `make-default`.
  - Capa nativa con los plugins simulados: elegir la copia más reciente, no tirar datos dañados, fallo del
    almacenamiento nativo, migración de fotos (también cuando falla a medias), cambiar/quitar fotos,
    notificación programada, permiso denegado, compartir archivos y cancelar.
  - Interfaz: sin botones de deshacer, trofeo con la mejor marca, exportaciones, botón Atrás (Escape),
    importar CSV, fotos y pantalla encendida en la web.
- GitHub Actions instala, revisa, prueba, construye y prepara el proyecto Android.

**NO comprobado (no tengo un móvil Android en este entorno):**

- Que el APK se instale y abra en un móvil real, y todo lo que depende del hardware: notificaciones con la pantalla
  apagada (y el ahorro de batería de cada marca), cámara, selector de fotos, menú de compartir, vibración,
  teclado, botón Atrás físico y márgenes de las barras del sistema.
- El aspecto visual en una pantalla real (no he podido abrir un navegador de verdad aquí).
- El APK firmado: hasta que estén los Secrets, GitHub solo comprueba que el proyecto compila.

Para eso está `docs/PRUEBAS_MOVIL.md`: una lista de comprobación para hacer en el móvil con cada APK.

## Lo que tienes que hacer tú

1. Poner `main` como rama principal (GUIA.md, paso 1). Yo no tengo permiso de administrador en el repositorio.
2. Crear la llave y los 4 Secrets (GUIA.md, paso 3). No lo he hecho yo a propósito: la llave y su contraseña
   tienen que ser solo tuyas.
3. Lanzar **APK de Android**, instalarlo y repasar `docs/PRUEBAS_MOVIL.md`.
4. Pasar tus datos de la web a la app con una copia de seguridad completa (GUIA.md, paso 5).

## Problemas probables

- **El aviso no llega con la pantalla apagada** en Xiaomi, Huawei, Samsung… por el ahorro de batería. La app trae
  las instrucciones por marca (Ajustes → Pantalla y avisos).
- **Play Protect** avisa al instalar porque la app no está en la Play Store. Es normal.
- **Perder la llave** = no poder actualizar la app instalada. Guárdala en dos sitios.
- **Desinstalar la app borra sus datos.** Para actualizar, siempre instalar encima.

## Fase 3

Las funciones extra de la Fase 3 quedan para cuando la app esté probada en el móvil y me confirmes que la base va bien.
