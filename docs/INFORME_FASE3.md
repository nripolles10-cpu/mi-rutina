# Mi Rutina — Informe de la Fase 3 (funciones adicionales)

Fecha: 27 de octubre de 2026

## Resumen corto

- **Hecho:** todas las funciones de la lista de la Fase 3 del encargo. Todo funciona sin internet, en español y
  con el mismo estilo visual.
- **Tus datos:**
  - No he cambiado ninguna clave de almacenamiento.
  - La versión de datos pasa de 8 a 9 con una migración que solo **añade** campos nuevos con valores por defecto:
    registro diario, medidas, fotos de progreso y preferencias. Tu rutina, tus registros, tus alternos y tus
    músculos no se tocan.
  - Como en cada actualización, antes de convertir los datos la app guarda una copia de rescate.
- **Firma:** la misma de siempre (tus Secrets). El número de versión sube solo.
- **Pruebas automáticas:** 183, todas pasan. Antes había 157. ESLint: 0 errores. La web se construye sin errores.
- **Qué NO he metido:** nada de lo que el encargo prohíbe (base de datos de alimentos por internet, cuentas, nube,
  IA dentro de la app) ni podómetro en segundo plano. "Mantener la pantalla encendida" ya estaba desde la Fase 2.

## Qué hay de nuevo

### Rutina
- **▶ Empezar entreno en vivo** (botón debajo del nombre del día):
  - Pantalla simplificada con el ejercicio y la serie actuales en grande.
  - Botones grandes de peso (±2,5 y ±1,25 kg) y de repeticiones (±1). También se puede escribir el número.
  - Debajo de la serie se ve lo que hiciste la última vez.
  - Rest-pause muestra cada tanda; dropset muestra cada descenso.
  - **Al marcar "✓ Serie hecha" arranca el descanso.** Usa el temporizador de siempre, así que en Android avisa
    aunque bloquees el móvil. El tiempo de descanso se elige en Ajustes → Entreno (por defecto, 1:30).
  - Al marcar la última serie de un ejercicio se guarda su registro de hoy (lo mismo que el botón "Guardar
    registro de hoy") y pasa al siguiente.
  - Con alternos, sale el que toca esta semana.
  - Mientras estás en esta pantalla, la pantalla del móvil no se apaga.
  - Al terminar, un resumen con el volumen del día.
- **Sugerencia de progresión** (💡) en cada ejercicio y en el modo en vivo:
  - Usa la "doble progresión" con un rango de 6–10 repeticiones:
    - Si llegas a 10, sugiere subir peso (≈ +2,5 %, redondeado a 1,25 kg).
    - Entre 6 y 9, mantener el peso y buscar una repetición más.
    - Dos sesiones por debajo de 6, bajar un 10 %.
  - Avisa si llevas dos sesiones seguidas bajando.
  - **Nunca cambia nada sola:** solo aplica el peso si tocas el botón.
- **📈 Historial, récords y 1RM** de cada ejercicio:
  - Mejor peso, mejor 1RM estimado (media de Epley y Brzycki), mayor volumen y récords conseguidos.
  - Gráfica (1RM, peso o volumen) y la lista de todos los registros, con los récords marcados.
- **Duplicar** (en modo edición):
  - **⧉ Duplicar este día:** copia sus ejercicios, también los alternos.
  - **⧉ Duplicar este ejercicio.**
  - Las copias empiezan sin historial; el original no cambia. Se puede ↩ Deshacer.
- **Aviso de semana de descarga** arriba de la rutina, si lo activas en Ajustes → Entreno.

### Progreso (ahora con cuatro apartados arriba)
- **📊 Progreso:** lo de siempre.
- **📅 Calendario:**
  - **Racha de semanas** cumpliendo tu objetivo de días por semana, que se elige en Ajustes. La semana en curso
    no rompe la racha mientras no haya terminado.
  - Días esta semana y días seguidos.
  - **Calendario del mes:** cuanto más intenso el color, más volumen. Al tocar un día se ven sus ejercicios y kilos.
  - **Resumen de la semana** comparado con la anterior: días, volumen, series efectivas, récords, peso medio,
    pasos, sueño y energía.
  - **Volumen de las últimas 8 semanas.**
- **📏 Cuerpo:**
  - **Tu día:** pasos (apuntados a mano, con tu objetivo de Ajustes y una barra de progreso), sueño y energía
    del 1 al 5, y la tabla de los últimos 7 días.
  - **Medidas corporales:** cintura, cadera, pecho, brazo, muslo, gemelo, cuello y % de grasa. Gráfica como la
    del peso (Mes / 3 meses / 6 meses / Todo); al tocar un punto se edita o se borra.
  - **Fotos de progreso** desde la cámara o la galería, con una nota.
    - Con dos o más aparece el **comparador antes / después**: las dos fotos superpuestas con una barra para
      deslizar, y eliges qué dos fotos comparar.
    - Se guardan más grandes que las de los ejercicios (900 px) para poder compararlas.
- **🏅 Logros:** 20 logros calculados con tus datos.
  - Entrenos, rachas, récords y volumen.
  - Objetivo de peso, sueño y energía, pasos, primera foto y primera medida.
  - Los que te faltan muestran una barra de progreso.

### Extras
- **📖 Glosario de técnicas:** top set, back-off, rest-pause, dropset, calentamiento, series efectivas,
  fallo técnico, RIR, sobrecarga progresiva, doble progresión, 1RM, semana de descarga, volumen y alternos.

### Ajustes
- **🔔 Recordatorios de entrenamiento:** eliges los días y la hora y te llega un aviso aunque la app esté cerrada.
- **🏋️ Entreno:**
  - Descanso del modo en vivo.
  - Días por semana para la racha.
  - **Semana de descarga:** cada cuántas semanas (de 3 a 12; la última del ciclo es la de descarga) y desde
    cuándo empieza el ciclo.
- **🎨 Apariencia:**
  - **Color de la app:** Cian (el de siempre), Violeta, Verde o Fuego.
  - **Tamaño de letra:** Pequeña, Normal, Grande o Muy grande.

## Decisiones que he tomado yo

1. **Recordatorios con avisos sueltos, no con uno "que se repite".** He leído el código del plugin de
   notificaciones: los avisos que se repiten se reprograman después de sonar sin permiso para despertar al móvil.
   Con el móvil en reposo podrían llegar tarde. Por eso programo avisos sueltos a fecha y hora exactas, con el
   mismo permiso que el aviso del descanso, para las próximas 8 semanas, y se renuevan cada vez que abres la app.
   Si no abres la app en 8 semanas, dejan de llegar.
2. **Racha por semanas, no por días seguidos.** En el gimnasio no se entrena todos los días; una racha de días
   seguidos se rompería con cada descanso. La racha principal cuenta semanas cumpliendo tu objetivo de días, y
   también enseño los días seguidos.
3. **Un día cuenta como entrenado** cuando guardas el registro de algún ejercicio. No hace falta nada nuevo: el
   calendario se calcula con tus registros de siempre, así que **tu historial anterior ya aparece**. Si guardas el
   mismo ejercicio dos veces el mismo día, cuenta el último para no duplicar el volumen.
4. **Logros calculados, no guardados.** Se calculan con tus datos cada vez que se abren. No ocupan espacio y no
   se pueden "perder".
5. **Tema de color:** cambia el color de acento (botones, resaltados, gráficas). A propósito **no** cambian los
   colores con significado: los de cada músculo, los de los tipos de serie y los de fuerte/intermedio/débil. Así
   nada confunde.
6. **Tamaño de letra:** escala toda la pantalla a la vez (textos, botones y separaciones), para que nada se
   descuadre. Lo he comprobado a 360 px con "Muy grande": no se sale nada por los lados.
7. **Copia de seguridad:** ahora lleva también el registro diario, las medidas, las fotos de progreso (si marcas
   "incluir las fotos") y las preferencias. Al restaurarla en otro móvil, los recordatorios se vuelven a programar
   allí. `defaultData.json` (para tus amigos) **nunca** lleva nada de esto.

## Qué está verificado y qué no

**Verificado aquí:**

- **Pruebas automáticas (183, todas en verde):**
  - Sesiones y calendario: un registro por día, sin contar el de partida.
  - Rachas: también la semana en curso.
  - Récords y 1RM, también en rest-pause y dropset, y sin contar los calentamientos.
  - Sugerencias: subir, mantener, bajar y el aviso de cansancio, sin cambiar nada sola.
  - Resumen semanal, logros y semana de descarga.
  - Duplicar, con alternos.
  - Fechas de los recordatorios.
  - Migración de la 8 a la 9, y reparación de datos raros.
  - Copias con los datos nuevos, y que `defaultData.json` no los lleve.
- **Interfaz (montada en jsdom):**
  - Modo en vivo: botones, descanso y guardado.
  - Historial y sugerencia.
  - Duplicar con Deshacer.
  - Calendario y logros tras guardar.
  - Pasos, sueño y energía, y medidas (apuntar, editar y borrar).
  - Comparador de fotos.
  - Tema y tamaño de letra.
  - Descarga, recordatorios en la web y glosario.
- **Capa nativa con los plugins simulados:** programar los recordatorios (canal, hora exacta y reposo), cancelar
  y que sin permiso no se programe nada.
- **Revisión visual en Chromium a 360 px** con datos de 6 semanas, en tamaño Normal y Muy grande: nada se sale
  y no hay errores de consola.

**NO verificado (hay que probarlo en el móvil, `docs/PRUEBAS_MOVIL.md`, apartado "Fase 3"):**

- Que los recordatorios lleguen con la app cerrada en tu móvil y con el ahorro de batería de tu marca.
- La cámara y la galería para las fotos de progreso, y que el comparador se vea bien con fotos reales.
- El tamaño de letra en tu móvil.

## Problemas probables

| Problema | Solución |
|---|---|
| El recordatorio no llega | Permiso de notificaciones y ahorro de batería (Ajustes → Pantalla y avisos → 🔋). Abre la app de vez en cuando: se renuevan solos |
| La racha no cuenta un día | Solo cuenta si guardaste el registro de algún ejercicio ese día |
| Las fotos de progreso ocupan mucho en la copia de seguridad | Marca "incluir las fotos" solo cuando haga falta (por ejemplo, al cambiar de móvil) |
| En la versión web, error al guardar una foto | El navegador tiene poco espacio para las webs. En Android no pasa (las fotos van a archivos) |
| Algo raro tras actualizar | Ajustes → Copias de rescate → la copia "premigracion_v8" tiene tus datos tal como estaban |
