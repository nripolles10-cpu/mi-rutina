# Mi Rutina — Informe de las mejoras (versión de datos 8)

Fecha: 26 de octubre de 2026

## Resumen corto

- **Hecho:**
  - Objetivo de peso editable en Progreso.
  - Calorías que tienen en cuenta todas tus variables, con un mínimo de seguridad.
  - Músculos personalizables en toda la app.
  - 29 recetas nuevas (60 en total).
  - Versión web instalable (PWA) para iPhone, con su propio flujo de publicación.
- **Tus datos:** no he cambiado ninguna clave de almacenamiento (`gymtracker_nacho_v2`, `gymtracker_fotos_v1`,
  `gymtracker_backup_import_v1` y las demás siguen igual). Hay una migración de la versión 7 a la 8 que nunca
  sustituye tu rutina ni tus registros. Antes de convertir, la app guarda sola una copia de rescate.
- **Firma:** el APK se sigue firmando con la llave de tus Secrets. El número de versión (versionCode) sube solo
  con cada cambio, así que se instala encima del que tienes.
- **Pruebas automáticas:** 157, todas pasan. Antes había 119; las nuevas cubren las funciones puras nuevas o
  cambiadas y la interfaz. ESLint: 0 errores. La web se construye sin errores.
- **Lo que NO he podido comprobar:**
  - No tengo un móvil Android ni un iPhone de verdad.
  - Lo de la pantalla lo he comprobado en Chromium con tamaño de móvil, incluso haciéndose pasar por un iPhone.
  - Safari de verdad no lo he podido probar.
  - Lista para el móvil: `docs/PRUEBAS_MOVIL.md`, apartado 0.

## 1. Cómo está organizado el proyecto y dónde he tocado

| Punto | Dónde |
|---|---|
| Objetivo de peso | `src/utils/peso.js` (lógica nueva), `src/tabs/ProgresoTab.jsx` (tarjeta), `src/App.jsx` (guardar y Deshacer), `src/tabs/ExtrasTab.jsx` (la calculadora usa el mismo dato) |
| Calorías | `src/utils/health.js` (`calcBMRInfo`, `calcPlan`, `calcCalorias`, `effNutri`), `src/tabs/ExtrasTab.jsx` (avisos y nota) |
| Músculos | `src/data/catalog.js` (catálogo de serie y catálogo activo), `src/utils/musculos.js` (crear/renombrar/quitar), `src/tabs/DianaTab.jsx` (mapa y editor), y los sitios que leen el músculo: `training.js`, `exportar.js`, `excel.js`, `word.js`, `importar.js`, `share.js`, `defaults.js` |
| Recetas | `src/data/recetas.js` (29 recetas y 37 ingredientes nuevos en `NUTRI_DB`) |
| Migración | `src/state/migrate.js` (`APP_VERSION` 8, `MIGRATIONS[8]`, `normalizeCurrent`) |
| PWA | `public/manifest.webmanifest`, `public/iconos/`, `scripts/vite-sw.mjs` + `scripts/sw-plantilla.js` (service worker), `src/native/index.js` (parte web), `src/components/AvisoCopia.jsx`, `src/tabs/Ajustes.jsx` (tarjeta "Versión web"), `.github/workflows/web.yml` |

Tus ejercicios alternos (`day.alternos`, tu cambio en `RutinaTab.jsx`) se conservan tal cual: la migración no
los toca, y la copia de seguridad y el código de compartir los llevan.

## 2. Qué he cambiado, punto por punto

### 2.1 Objetivo de peso corporal editable

- En la tarjeta "Peso corporal", el objetivo (🎯 80 kg) ahora es un botón. Al tocarlo se abre un campo para
  escribir el peso al que quieres llegar, con coma decimal. Debajo se ve "Bajar 5,5 kg" o "Subir…".
  Desde ahí se puede **Guardar**, **Quitar objetivo** o **Cancelar**.
- **Validación:** el peso tiene que estar entre 30 y 300 kg y se redondea a 0,1 kg. Si escribes algo que no es
  un número, sale un mensaje y no se guarda nada.
- **Un único dato:**
  - `peso.objetivoKg` y `formulario.objetivoPesoKg` siempre valen lo mismo; cambiarlo en Progreso o en Ajustes
    actualiza los dos.
  - La calculadora ya no guarda un objetivo propio (`nutricion.pesoObjetivo`). Su campo "¿A qué peso quieres
    llegar?" cambia ese mismo dato.
- La dirección (bajar o subir) se recalcula con tu último peso registrado. "Objetivo alcanzado" solo vuelve a
  "no" si el objetivo cambia.
- **Deshacer:** tras guardar sale un aviso con el botón **↩ Deshacer** durante 6 segundos.

### 2.2 Calorías según sexo, edad, altura, peso, % de grasa y actividad

**Por qué "Mujer" apenas cambiaba nada.** Encontré tres causas en el código:

1. **Con % de grasa, Katch-McArdle ignora el sexo.** La fórmula usa solo la masa magra. Si tenías un % de grasa
   puesto (en Ajustes o en la calculadora), cambiar a Mujer no cambiaba nada.
2. **El sexo estaba duplicado.**
   - La calculadora guardaba el suyo (`nutricion.sexo`) y, si alguna vez lo tocabas ahí, ese mandaba sobre el
     de Ajustes.
   - Cambiar el sexo en Ajustes no se veía en la calculadora, y al revés.
3. **El objetivo de peso también estaba duplicado** (se arregla con el punto 2.1).

La diferencia de Mifflin-St Jeor no se perdía en los factores: 166 kcal de basal × 1,5 de actividad son
unas 250 kcal al día.

**Ahora:**

- **El sexo es un único dato**, el de Ajustes. Si lo cambias en la calculadora, cambia en Ajustes, y al revés.
  Los campos que escribes a mano en la calculadora (peso, edad, altura…) no se pisan.
- **Mifflin-St Jeor como base.** Usa sexo, edad, altura y peso.
- **Katch-McArdle solo con un % de grasa creíble para el sexo:**
  - Hombre: entre 4 y 45 %.
  - Mujer: entre 10 y 50 %.
  - Si el % no es creíble, no se usa y se avisa.
  - Con Katch-McArdle, la pantalla explica que el cálculo va por masa magra, que esa fórmula no usa la edad, y
    enseña cuánto daría la fórmula estándar con tu sexo y tu edad.
- **Macros que dependen del sexo:**
  - La proteína se calcula sobre tu peso o, si hay % de grasa, sobre el peso que tendrías con una grasa
    normal (15 % hombre, 23 % mujer). Así nadie recibe proteína de más por tener mucha grasa.
  - La grasa de la dieta es 0,1 g/kg más alta en mujeres, con un mínimo del 20 % de las calorías en hombres
    y del 25 % en mujeres.
- **Suelo de seguridad:** con déficit nunca baja de 1.200 kcal (mujer) / 1.500 (hombre) ni de tu metabolismo
  basal. Si el ritmo te llevaría por debajo, se queda en el mínimo y sale un aviso con la cifra.
- **Aviso de déficit excesivo:** si el déficit pasa del 25 % de tu gasto o supone perder más del 1 % de tu
  peso a la semana.
- La calculadora mantiene las mismas preguntas y el mismo formato.

**Resultados**

Todos con 30 años, 175 cm, 75 kg, actividad moderada y definición a ritmo normal (−450 kcal), salvo lo que se
indica en cada fila. Comprobados con pruebas automáticas.

| Caso | Basal | Gasto | Calorías | Proteína / Grasa |
|---|---|---|---|---|
| Hombre | 1.699 | 2.548 | **2.098** | 173 g / 53 g |
| Mujer | 1.533 | 2.299 | **1.849** | 173 g / 60 g |
| Hombre 20 años / 50 años | — | — | 2.173 / 1.948 | — |
| Mujer 20 años / 50 años | — | — | 1.924 / 1.699 | — |
| Hombre con 20 % de grasa (Katch) | 1.666 | 2.499 | 2.049 | 162 g / 49 g |
| Mujer con 20 % de grasa (Katch) | 1.666 | 2.499 | 2.049 | 173 g / 60 g |
| Mujer 55 kg, 160 cm, sedentaria, ritmo rápido | 1.239 | 1.487 | **1.239** (sin el suelo serían 887) | — |
| Hombre 60 kg, 165 cm, sedentario, ritmo rápido | 1.486 | 1.784 | **1.500** (suelo) | — |

- En las mismas condiciones, la mujer sale con unas 250 kcal menos.
- Con el mismo % de grasa y el mismo peso, hombre y mujer tienen la misma masa magra y el mismo basal: eso es
  lo que dice la fórmula por masa magra. Se explica en pantalla y lo que cambia son los macros.

### 2.3 Diana física con músculos personalizables

- Lo de antes sigue igual:
  - Mapa delante y detrás.
  - Al tocar un músculo salen Punto fuerte / Intermedio / Punto débil / Sin marcar.
  - La lista se agrupa en fuertes, intermedios, débiles y sin marcar.
  - El cambio se guarda al instante.
- **Catálogo editable** (`state.musculos`):
  - Empieza con los 15 músculos de siempre, con los mismos ids y colores, así que nada se rompe.
  - Desde la Diana → **"✏️ Crear, renombrar o quitar músculos"** puedes:
    - Crear un músculo; cada uno nuevo recibe un color libre.
    - Renombrarlo; no deja repetir nombres.
    - Elegir qué zona del mapa pinta, o ninguna.
    - Quitarlo.
- **Quitar un músculo con ejercicios:**
  - Te pide a qué músculo pasan **todos** sus ejercicios, también los ocultos.
  - No se pierde ningún ejercicio ni su historial.
  - No deja quitar el último músculo.
  - Su estado de la Diana se borra.
  - Se puede **↩ Deshacer**.
- **El mapa:**
  - El dibujo no cambia: las zonas son las 15 de siempre.
  - Un músculo nuevo puede pintar una zona; por ejemplo, "Pecho superior" pinta el pecho.
  - Si una zona tiene varios músculos con estados distintos, sale a franjas con cada color. Al tocarla se
    alterna entre sus músculos, y en el panel aparecen como botones.
  - Un músculo sin zona aparece en la lista y se marca igual.
- **Funciona en toda la app:**
  - Selector de músculo al crear o editar un ejercicio, y colores.
  - Series efectivas por semana y "cuánto me falta para mis objetivos".
  - Diana.
  - Exportaciones .txt, .csv, .doc, Excel y Word.
  - Importar desde Excel o CSV: reconoce tus músculos por el nombre.
  - Compartir e importar por código, y copia de seguridad.
- **Importar un código:**
  - El código lleva tus músculos.
  - "Copia completa" usa los del código.
  - "Solo la rutina" añade los que te falten sin tocar los tuyos.
  - Un código antiguo, sin músculos, usa los de serie.
- **Migración:** los datos sin catálogo propio cargan los 15 de serie. Si un ejercicio apunta a un músculo que
  ya no existe, pasa a Core (o al primero de la lista si ya no tienes Core).

### 2.4 Recetas: de 31 a 60

- **29 recetas nuevas:** 7 desayunos, 8 comidas, 7 cenas y 7 snacks.
- Mismo formato que las de siempre: ingredientes con cantidades exactas por ración, pasos y objetivos.
- **Macros calculados** con `NUTRI_DB`:
  - He añadido 37 ingredientes nuevos con valores habituales por 100 g; las carnes y los pescados, en crudo.
  - Las pruebas comprueban que kcal = 4P + 4C + 9G, que cada receta tiene entre 150 y 800 kcal y al menos 15 g
    de proteína, y que ningún ingrediente suma más de 100 g de macros por 100 g.
- **Lo que no cambia:** los ids y el contenido de las 31 recetas de siempre, y tus recetas propias o editadas.
- **Migración:**
  - Añade las nuevas a tu lista guardada **solo si no existen ya** (por id), sin duplicar.
  - Las recetas de serie que hubieras borrado no vuelven.
  - Al restaurar una copia antigua también se añaden.

### 2.5 Versión web para iPhone (PWA)

- **Mismo código que el APK**, publicado como web instalable:
  - Manifest e iconos.
  - Service worker: después de abrirla una vez funciona **sin internet**. Lo he probado en Chromium: la recargué
    sin conexión y abrió con los datos guardados.
- **Publicación:** flujo de GitHub Actions **independiente** (`web.yml`). No usa la llave ni toca el flujo del APK.
- **Cada persona tiene su copia:**
  - Los datos de la web se guardan en el navegador de cada uno, con las mismas claves, y no se comparten con
    nadie.
  - Un usuario nuevo arranca con `defaultData.json` y el nombre vacío.
  - He revisado que todo es editable y no está ligado a tus datos: rutina, músculos, vídeo de movilidad,
    suplementos, recetas, cardio y nutrición. Lo único con tu nombre es el comentario "Técnica Nacho." de
    un ejercicio de serie, que se puede editar.
- **Protección de los datos en la web:**
  - La app pide al navegador almacenamiento persistente (`navigator.storage.persist`).
  - Ajustes → "Versión web" muestra si lo ha concedido y la fecha de la última copia.
  - Si hay datos propios y la última copia tiene más de 14 días, sale arriba un **recordatorio** con
    "Hacer copia ahora" y "Más tarde" (lo aplaza 7 días). En el APK no sale.
- **Revisión de la capa nativa en la web:**

| Función | Android (APK) | iPhone (web) |
|---|---|---|
| Guardado | Almacenamiento nativo + espejo | Almacenamiento del navegador (Safari puede borrarlo; por eso el recordatorio) |
| Fotos | Cámara / galería del sistema | Selector de archivos del iPhone (permite cámara y fototeca) |
| Compartir | Menú de compartir | Menú de compartir del iPhone (Web Share) o copiar |
| Descargar Excel/Word/CSV | Menú de compartir | Menú de compartir → "Guardar en Archivos" |
| Vibración | Sí | No (iOS no lo permite a las webs): no da error |
| Sonido del descanso | Sí | Sí, con la app abierta |
| Aviso con la pantalla apagada | Sí (notificación programada) | **No**: iOS no deja programar avisos a una web. La app lo dice claramente |
| Pantalla encendida | Sí | Depende de la versión de iOS |

- **GitHub Pages y tu repositorio privado:** GitHub Pages gratis solo publica repositorios **públicos**. Por eso
  el flujo comprueba si Pages está activado: si no lo está, termina en verde con un aviso y no publica nada. Las
  opciones (hacerlo público, GitHub Pro u otro sitio gratuito) están en la GUIA, paso 9. Decide tú: no he cambiado
  la visibilidad del repositorio.

## 3. Decisiones que he tomado yo

1. **Deshacer.** En la Fase 1 pediste quitar los botones ↩/↪ de la cabecera, y en esta lista pides "↩ Deshacer"
   en varios sitios. Para cumplir las dos cosas, el Deshacer sale dentro del aviso que aparece justo después del
   cambio, durante 6 segundos:
   - Al cambiar o quitar el objetivo de peso.
   - Al crear, renombrar o quitar un músculo.

   Si haces otro cambio entretanto, no deshace (para no pisarlo).
2. **Datos que estaban duplicados.** Al pasar a la versión 8 mandan el sexo de Ajustes y el objetivo de peso de
   Progreso. Si alguna vez pusiste otro en la calculadora, se descarta. Revisa los dos tras actualizar.
3. **Zonas del mapa fijas.** Un músculo nuevo solo puede pintar una de las 15 zonas que ya están dibujadas.
   Dibujar zonas nuevas (por ejemplo, tres franjas del pecho) no sería fiable.
4. **Rango del objetivo de peso:** de 30 a 300 kg.
5. **Service worker escrito a mano**, sin librerías externas. Solo funciona en la web publicada: nunca dentro del
   APK ni en `localhost`.

## 4. Qué está verificado de verdad y qué no

**Verificado aquí:**

- **Pruebas automáticas (157, todas en verde):**
  - Objetivo de peso: validación, sincronización, "alcanzado", quitar, migración e interfaz con Deshacer.
  - Calorías: los casos de la tabla, el suelo, el déficit excesivo, el % de grasa no creíble y el sexo
    sincronizado en la interfaz.
  - Músculos: crear, renombrar, quitar pasando sus ejercicios con su historial, nombres repetidos, lista vacía,
    Diana, series por semana, objetivos, exportaciones, compartir e importar, CSV y migración.
  - Recetas: número, tipos, macros, `NUTRI_DB` y migración sin duplicar ni pisar, también desde copias
    antiguas.
  - PWA: recordatorio de copia, plataforma, y que el modo sin internet no se activa dentro del APK.
- **Revisión visual** en Chromium a 360 px: tarjeta del objetivo, editor de músculos, Diana con franjas,
  calculadora y recetas. Nada se sale y no hay errores de consola.
- **Web haciéndose pasar por un iPhone:**
  - El service worker se instala y guarda los archivos.
  - El manifest se carga.
  - Sin internet, la app abre con los datos.
  - Salen el aviso de copia y los textos de iPhone.
- **GitHub Actions:** el flujo de la web se ejecuta y, como Pages no está activado, termina en verde con el
  aviso. Ver en el siguiente apartado cómo quedó la compilación del APK.

**No verificado (hay que hacerlo en el móvil, `docs/PRUEBAS_MOVIL.md` apartado 0):**

- Instalar el APK nuevo encima del tuyo y que tus datos reales pasen bien a la versión 8. Está probado con datos
  simulados, no con los tuyos.
- Safari en un iPhone real: instalación en la pantalla de inicio, borrado de datos de Safari, menú de compartir.
- La web publicada en GitHub Pages, que no estará disponible hasta que la actives.

## 5. Problemas más probables y cómo se arreglan

| Problema | Solución |
|---|---|
| Tras actualizar, el sexo o el objetivo de peso no son los que esperabas | Al unificar mandan Ajustes (sexo) y Progreso (objetivo). Cámbialo una vez y queda igual en todas partes |
| "App no instalada" al actualizar | La firma no coincide. No desinstales: revisa los Secrets (GUIA, paso 6) |
| Quitaste un músculo sin querer | ↩ Deshacer en el aviso. Si ya pasó el aviso, crea el músculo otra vez y cambia el músculo de los ejercicios; su historial no se ha perdido |
| El flujo de la web no publica | Falta activar Pages (GUIA, paso 9) |
| En iPhone se borraron los datos | Restaurar la última copia de seguridad (GUIA, paso 10) |
| Algo sale raro tras actualizar | Ajustes → Copias de rescate → la copia "premigracion_v7" tiene tus datos tal como estaban antes |
