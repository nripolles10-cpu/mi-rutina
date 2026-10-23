# Lista de pruebas en el móvil

Para hacer después de instalar cada APK nuevo. Marca cada punto; si algo falla, apunta el modelo
del móvil, la versión de Android (Ajustes → Información del teléfono) y qué estabas haciendo.

Antes de empezar: **⚙️ Ajustes → Compartir y copias → 💾 Copia de seguridad completa** y guárdala fuera del móvil.

## 1. Instalación y arranque
- [ ] El icono aparece en el escritorio con la mancuerna y el degradado; el nombre es "Mi Rutina".
- [ ] Al abrir sale la pantalla de carga oscura y después la app, sin pantallazo blanco.
- [ ] La barra de arriba (hora, batería) se ve en blanco sobre oscuro y no tapa el título.
- [ ] Abajo, la barra de gestos/botones de Android no tapa las pestañas.
- [ ] Girar el móvil: la app se queda en vertical.
- [ ] Funciona en modo avión (sin internet) igual que con internet.
- [ ] Primera instalación: arranca con la rutina de `defaultData.json`.

## 2. Guardar datos (lo más importante)
- [ ] Apunta una serie (peso y repeticiones, con decimales con coma: `82,5`). Cierra la app desde
      multitarea (deslizar fuera) y vuelve a abrirla: el dato sigue ahí.
- [ ] Apunta otra serie y **apaga el móvil** justo después. Al encenderlo, el dato sigue.
- [ ] Instala encima el mismo APK otra vez (o uno nuevo): los datos siguen.
- [ ] Importa la copia de la versión web (GUIA.md, paso 5): aparecen la rutina, el historial, el peso y las fotos.

## 3. Botón Atrás de Android
- [ ] Con una ventana abierta (temporizador, editar ejercicio, ajustes…), Atrás la cierra.
- [ ] Con un aviso de confirmación abierto, Atrás lo cierra sin hacer nada.
- [ ] Sin nada abierto, Atrás sale de la app (y al volver, los datos siguen).

## 4. Teclado
- [ ] Al escribir en un campo de la parte de abajo, el teclado no lo tapa.
- [ ] Los campos de peso sacan teclado numérico y aceptan la coma.

## 5. Temporizador de descanso
- [ ] Inicia un descanso con la app abierta: al terminar suena/vibra.
- [ ] La primera vez pide permiso de notificaciones. Acepta.
- [ ] Inicia un descanso, **bloquea el móvil**: al terminar llega la notificación (con sonido y vibración).
- [ ] Inicia un descanso, sal al escritorio: llega la notificación.
- [ ] Cancela el descanso antes de que acabe: no llega ninguna notificación.
- [ ] Ajustes → Pantalla y avisos: "Notificaciones ✅ Concedido" y "Hora exacta ✅ Puntuales".
- [ ] Probar aviso (10 s) con el móvil bloqueado: llega.
- [ ] Deniega el permiso (Ajustes de Android → Apps → Mi Rutina → Notificaciones) y prueba: la app avisa de que solo sonará con la app abierta, sin errores.

## 6. Fotos de ejercicios
- [ ] 📷 Cámara: abre la cámara, haces la foto y aparece en el ejercicio. No pide permiso de cámara.
- [ ] 🖼️ Galería: abre el selector de fotos, eliges una y aparece.
- [ ] Cancelar la cámara o el selector no da error.
- [ ] Quitar foto funciona.
- [ ] Cierra y abre la app: las fotos siguen.
- [ ] Copia de seguridad *con fotos* → restaurar en otro móvil (o tras reinstalar): vuelven las fotos.

## 7. Compartir y archivos
- [ ] 📤 Compartir mi rutina → Enviar: se abre el menú de compartir de Android con el código.
- [ ] Descargar mi rutina en Excel, Word, CSV y texto: se abre el menú de compartir; guárdalo en Drive o
      Archivos y ábrelo (el Excel en Excel/Google Sheets, el Word en Word/Google Docs).
- [ ] Importar rutina desde Excel o CSV: con la plantilla y con el Excel descargado, la rutina se lee bien.
- [ ] Rutina para tus amigos → Crear defaultData.json: se abre el menú de compartir.
- [ ] El enlace del vídeo de movilidad (Extras) se abre en el navegador y al volver la app sigue igual.

## 8. Resto de la app (que todo siga como en la web)
- [ ] Pestañas: Rutina, Progreso, Cardio, Comida, Extras… todas se abren y se ven igual que en la web.
- [ ] Modo edición: añadir, mover y borrar ejercicios y días.
- [ ] El trofeo muestra tu mejor marca.
- [ ] No hay botones de deshacer/rehacer en la cabecera.
- [ ] Gráficas de progreso y de peso.
- [ ] Mantener la pantalla encendida: activado, la pantalla no se apaga sola; desactivado, sí.
- [ ] Vibración al terminar el descanso.

## 9. Batería (si el aviso falla con la pantalla apagada)
- [ ] Sigue las instrucciones de tu marca en Ajustes → Pantalla y avisos → 🔋 y repite el punto 5.
