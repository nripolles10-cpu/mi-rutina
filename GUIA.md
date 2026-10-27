# Guía de Mi Rutina: Android y versión web para iPhone (paso a paso, sin saber programar)

Esta guía explica cómo conseguir el APK (el instalador de la app), instalarlo en el móvil,
actualizarlo sin perder datos, prepararlo para tus amigos y publicar la versión web para iPhone. Todo se hace desde la web de GitHub;
no hace falta instalar nada en el ordenador.

**Lo más importante de toda la guía:**

1. **Nunca desinstales la app para actualizarla.** Instala el APK nuevo encima: así se conservan los datos.
   Si desinstalas, Android borra los datos de la app.
2. **Guarda la llave de firma en dos sitios** (paso 3). Sin ella no se puede actualizar la app instalada.
3. **Haz una copia de seguridad de vez en cuando** (Ajustes → Compartir y copias → Copia de seguridad completa)
   y guárdala fuera del móvil (Drive, correo…).

---

## Paso 1. Poner `main` como rama principal (una sola vez)

El código de la app está en la rama `main`. GitHub solo deja lanzar los flujos a mano desde la rama principal.

1. Entra en el repositorio `mi-rutina` en github.com.
2. Pulsa **Settings** (arriba a la derecha, el engranaje).
3. En **General**, busca **Default branch**. Pulsa el botón de las dos flechas (⇄), elige **main** y pulsa **Update**.
   Acepta el aviso (*I understand, update the default branch*).

## Paso 2. Ver que todo funciona

1. Pulsa la pestaña **Actions**.
2. Verás una ejecución de **APK de Android**. Si sale una ✓ verde o una ✗ roja que dice
   *"falta la llave de firma"*, es normal: significa que las pruebas pasan y el proyecto compila,
   pero aún no hay llave. Vamos a crearla.

## Paso 3. Crear la llave de firma (una sola vez en la vida de la app)

La llave es lo que demuestra a Android que cada versión nueva es "la misma app".
Si cambia la llave, Android no deja instalar la actualización encima y habría que desinstalar (perdiendo los datos).

### 3.1 Crearla

1. **Actions** → en la lista de la izquierda, **Crear llave de firma (solo una vez)**.
2. Pulsa **Run workflow** (a la derecha). En la casilla escribe `CREAR` (en mayúsculas) y pulsa el botón verde **Run workflow**.
3. Espera 1 minuto y entra en la ejecución (cuando tenga la ✓ verde).
4. Abajo del todo, en **Artifacts**, descarga **llave-mi-rutina-DESCARGAR-Y-GUARDAR**. Es un .zip.
   Solo se puede descargar durante 1 día.
5. Descomprímelo. Dentro hay 3 archivos:
   - `mirutina.jks` → la llave.
   - `MIRUTINA_KEYSTORE_BASE64.txt` → la misma llave escrita como texto (para copiarla a GitHub).
   - `LEEME-DATOS-DE-LA-LLAVE.txt` → la contraseña y las instrucciones.
6. **Guarda la carpeta entera en dos sitios distintos**, por ejemplo Google Drive (privado) y un pendrive
   o tu ordenador. No la mandes por WhatsApp ni la subas al repositorio.

### 3.2 Copiarla a GitHub (Secrets)

Los *Secrets* son una caja fuerte de GitHub: la llave queda guardada ahí y nadie puede volver a verla,
solo los flujos de compilación pueden usarla.

1. **Settings** → en el menú de la izquierda **Secrets and variables** → **Actions**.
2. Pulsa **New repository secret** y crea estos 4 (el nombre tiene que ser exactamente este):

   | Name | Secret (valor) |
   |---|---|
   | `MIRUTINA_KEYSTORE_BASE64` | Abre `MIRUTINA_KEYSTORE_BASE64.txt`, selecciona todo (Ctrl+A), copia y pega |
   | `MIRUTINA_KEYSTORE_PASSWORD` | La contraseña que aparece en `LEEME-DATOS-DE-LA-LLAVE.txt` |
   | `MIRUTINA_KEY_ALIAS` | `mirutina` |
   | `MIRUTINA_KEY_PASSWORD` | La misma contraseña |

3. Vuelve a **Actions**, entra en la ejecución de **Crear llave de firma**, pulsa los tres puntos **···**
   de arriba a la derecha → **Delete workflow run**. Así la llave deja de estar descargable.

> Si se te pasa el día sin descargarla: borra la ejecución y vuelve a lanzar el paso 3.1.
> Si ya habías creado los Secrets, el flujo se negará a crear otra llave (es a propósito).

<details>
<summary>Alternativa: crear la llave en tu ordenador (solo si tienes Java instalado)</summary>

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore mirutina.jks -alias mirutina -keyalg RSA -keysize 4096 -validity 10000
```
Te pedirá una contraseña y unos datos (pon lo que quieras). Luego, para el Secret `MIRUTINA_KEYSTORE_BASE64`:
- Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("mirutina.jks")) | Set-Clipboard`
- Mac: `base64 -i mirutina.jks | pbcopy`
- Linux: `base64 -w 0 mirutina.jks`
</details>

## Paso 4. Conseguir el APK

1. **Actions** → **APK de Android** → **Run workflow** → **Run workflow** (rama `main`).
   (También se lanza solo cada vez que se sube un cambio a `main`.)
2. Tarda unos 6–10 minutos. Cuando tenga la ✓ verde, entra en la ejecución.
3. Abajo, en **Artifacts**, descarga **mi-rutina**. Es un .zip con el APK dentro
   (`mi-rutina-1.N.apk`, donde N es el número de versión). El archivo se guarda 30 días.

## Paso 5. Instalar en el móvil

1. Pasa el APK al móvil: súbelo a tu Google Drive, mándatelo por correo o cópialo con el cable.
2. En el móvil, ábrelo desde Drive / Archivos / Descargas.
3. La primera vez Android dirá que esa app (Drive, Chrome, Archivos…) no tiene permiso para instalar
   aplicaciones. Pulsa **Ajustes** → activa **Permitir de esta fuente** → vuelve atrás.
4. Pulsa **Instalar**. Si sale **Play Protect** diciendo que la app no es conocida, pulsa
   **Más detalles → Instalar de todas formas** (sale porque la app no está en la Play Store).
5. Abre **Mi Rutina**. La primera vez que uses el temporizador de descanso te pedirá permiso para
   las notificaciones: **Permitir** (si no, el aviso solo suena con la app abierta).

### Pasar tus datos de la versión web (ultimo.html) a la app

Los datos de la web están en el navegador y la app no puede leerlos sola. Una vez:

1. En la web: **⚙️ Ajustes → Compartir y copias → 💾 Copia de seguridad completa** →
   marca *Incluir las fotos* si quieres → **📋 Copiar** (o **💾 Guardar en un archivo de texto**).
2. Pásate ese texto al móvil (correo, nota, WhatsApp a ti mismo…).
3. En la app: **⚙️ Ajustes → Compartir y copias → 📥 Importar rutina o restaurar copia** → pega el código →
   **Comprobar código** → elige **Reemplazar todo lo que trae** → confirma.

## Paso 6. Actualizar la app

1. Cuando haya cambios en `main`, GitHub crea un APK nuevo solo (paso 4). Se firma con la misma llave de siempre
   (la de los Secrets) y el número de versión sube solo, así que Android lo acepta encima del que tienes.
2. Por si acaso, haz antes una **copia de seguridad completa** desde la app y guárdala fuera del móvil.
3. Instala el APK nuevo **encima**, sin desinstalar. Android dirá *"¿Quieres actualizar esta app?"* → **Actualizar**.
   Tus datos siguen ahí. Al abrirla, la app convierte tus datos a la versión nueva sin tocar tu rutina ni tus
   registros (y antes guarda una copia de rescate por si acaso: Ajustes → Copias de rescate).
4. Comprueba que la huella SHA-256 que sale en el paso *Comprobar la firma* de la compilación es la misma que la
   de tu `LEEME-DATOS-DE-LA-LLAVE.txt`.

Si Android dice **"La app no se ha instalado porque el paquete entra en conflicto con un paquete existente"**:
el APK está firmado con otra llave. **No desinstales.** Revisa que los Secrets son los de tu llave
(paso 3.2). En cada compilación, en el paso *Comprobar la firma*, aparece la **huella SHA-256**: tiene que ser
siempre la misma que dice tu `LEEME-DATOS-DE-LA-LLAVE.txt`.

## Paso 7. Que el aviso del descanso suene con la pantalla apagada

La app programa una notificación para el final del descanso, así que suena aunque bloquees el móvil.
Algunas marcas (Xiaomi, Samsung, Huawei, OnePlus, Oppo, Realme…) cierran las apps para ahorrar batería.
Si el aviso no llega:

- En la app: **⚙️ Ajustes → Pantalla y avisos → Probar aviso (10 s)** y bloquea el móvil para comprobarlo.
- En la misma tarjeta tienes las instrucciones para tu marca (**🔋 Si el aviso no suena con la app cerrada**).
  En general: Ajustes del móvil → Apps → Mi Rutina → Batería → **Sin restricciones**.
- Opción *Mantener la pantalla encendida mientras uses la app*: útil en el gimnasio si prefieres no bloquear.
- Lo mismo vale para los **recordatorios de entrenamiento** (Ajustes → 🔔). Se programan para las próximas
  8 semanas y se renuevan cada vez que abres la app.

En `docs/INFORME_FASE3.md` tienes explicadas todas las funciones nuevas (modo en vivo, calendario, logros, medidas,
fotos de progreso, tema de color…).

## Paso 8. Rutina para tus amigos (que la app arranque con tu rutina)

Cuando alguien instala la app por primera vez, arranca con la rutina de `src/data/defaultData.json`.
Lleva solo la rutina (días, ejercicios, series de referencia), el cardio, los extras y, si quieres, las recetas.
**Nunca** lleva tus datos personales, tu peso, tu diario de comidas, tu historial ni tus fotos.

1. En la app: **⚙️ Ajustes → Rutina para tus amigos** → elige si incluir las recetas → **🎁 Crear defaultData.json**.
   Se abre el menú de compartir: guárdalo en Drive o mándatelo.
2. En github.com, entra en el repositorio → carpeta `src` → `data` → pulsa **Add file → Upload files**,
   arrastra el `defaultData.json` (tiene que llamarse exactamente así) y pulsa **Commit changes** (a `main`).
3. GitHub compila un APK nuevo con esa rutina (paso 4). Ese es el que les pasas a tus amigos.

A ti no te afecta: `defaultData.json` solo se usa cuando la app no tiene ningún dato guardado.

(Para programadores: `npm run make-default -- <código GYMR1… o archivo>` hace lo mismo desde un código de la app.)

## Paso 9. Publicar la versión web (para amigos con iPhone)

Además del APK, el mismo código se publica como una **web instalable** (PWA). Un amigo con iPhone (o con
cualquier móvil) la abre en el navegador, la añade a su pantalla de inicio y tiene **su propia copia con sus
propios datos**: no ve los tuyos ni tú los suyos. Se publica sola con el flujo **Web (PWA) en GitHub Pages**,
que es independiente del APK (no usa la llave y no lo toca).

**Importante:** GitHub Pages gratis solo funciona con repositorios **públicos**. Tu repositorio es privado,
así que tienes que elegir una de estas opciones:

- **A. Hacer público el repositorio (gratis, lo más sencillo).** No contiene contraseñas: la llave está en los
  Secrets, que siguen siendo secretos. Lo que sí se vería: el código, la rutina de serie y el historial de cambios
  (con los correos de quien hizo cada cambio). Settings → General → abajo del todo, *Danger Zone* →
  **Change repository visibility** → **Make public**.
- **B. GitHub Pro (de pago, unos 4 $/mes).** El repositorio sigue privado y Pages funciona igual.
- **C. Otro sitio gratuito (Netlify, Cloudflare Pages…).** Funciona con repositorios privados, pero hay que crear
  una cuenta allí y conectarla. Si lo prefieres, pídemelo y lo preparo.

Con la opción A o B:

1. **Settings → Pages**. En **Build and deployment → Source** elige **GitHub Actions**.
2. **Actions → Web (PWA) en GitHub Pages → Run workflow**. Tarda 2–3 minutos.
3. Al terminar, la dirección de la web aparece en **Settings → Pages** (algo como
   `https://nripolles10-cpu.github.io/mi-rutina/`). Desde entonces se actualiza sola con cada cambio en `main`.

Mientras Pages no esté activado, el flujo termina en verde con el aviso *"GitHub Pages no está activado
todavía"*: es normal y no afecta al APK.

## Paso 10. Pasarle la web a un amigo con iPhone

1. Mándale la dirección de la web (paso 9).
2. Que la abra en **Safari** (en iPhone es mejor Safari para poder instalarla).
3. Botón **Compartir** (el cuadrado con la flecha) → **Añadir a pantalla de inicio** → **Añadir**.
4. Que la abra siempre desde ese icono: así funciona a pantalla completa y **sin internet**.
5. La primera vez arranca con la rutina de `defaultData.json` (paso 8) y su nombre vacío para que lo ponga él.
   Todo lo puede editar: rutina, músculos, vídeo de movilidad, suplementos, recetas, cardio y nutrición.

**Lo que no funciona igual en iPhone** (es una limitación de iOS con las webs, no de la app):

- El aviso del descanso **solo suena con la app abierta** y en primer plano: iOS no deja programar avisos a una web.
  Tampoco vibra.
- **Mantener la pantalla encendida** depende de la versión de iOS; si no funciona, que suba el tiempo de bloqueo.
- **Safari puede borrar los datos** de una web que no se usa durante un tiempo (sobre todo si no está añadida a
  la pantalla de inicio). La app pide al navegador que no los borre y **le recuerda hacer una copia de seguridad**
  cada 14 días (Ajustes → Copia de seguridad completa → guardar el código en Notas, correo…).
- Guardar archivos (Excel, Word…) abre el menú de compartir del iPhone → **Guardar en Archivos**.

**Pasar datos entre móviles** (de Android a iPhone, de un iPhone a otro, o al cambiar de móvil):
Ajustes → **Copia de seguridad completa** → copiar el código → en el otro móvil, Ajustes →
**Importar rutina o restaurar copia** → pegar → **Reemplazar todo lo que trae**.

## Problemas frecuentes

| Qué pasa | Qué hacer |
|---|---|
| La ejecución de Actions falla en **Pruebas automáticas** | Algún cambio ha roto algo. No se genera APK (a propósito). Abre el paso para ver qué prueba falla. |
| Falla con **FALTA LA LLAVE DE FIRMA** | Faltan los Secrets o algún nombre está mal escrito (paso 3.2). |
| Falla en **Preparar la llave** o **Compilar** con *"Keystore was tampered with, or password was incorrect"* | La contraseña de los Secrets no es la de la llave. Revisa `MIRUTINA_KEYSTORE_PASSWORD` y `MIRUTINA_KEY_PASSWORD`. |
| *"App no instalada"* al actualizar | Ver Paso 6 (conflicto de llave). No desinstales. |
| No aparece **Run workflow** | Falta el paso 1 (rama principal `main`). |
| No suena el aviso del descanso | Paso 7. |
| La app se abre en blanco | Cierra la app del todo y ábrela otra vez. Si sigue, apunta el modelo de móvil y la versión de Android. |
| El flujo de la web dice *"GitHub Pages no está activado"* | Falta el paso 9. El APK no se ve afectado. |
| En iPhone no aparece "Añadir a pantalla de inicio" | Ábrela en Safari (no dentro de WhatsApp o Instagram) y busca la opción bajando en el menú Compartir. |
| En iPhone han desaparecido los datos | Safari los borró. Restaura la última copia de seguridad (paso 10). Por eso la app recuerda hacerla. |

En `docs/PRUEBAS_MOVIL.md` tienes una lista para comprobar la app en el móvil después de instalar cada versión.
