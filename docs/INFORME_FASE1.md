# Mi Rutina — Informe de la Fase 1 (auditoría y estabilización)

Fecha: 23 de octubre de 2026

## Resumen

He leído `ultimo.html` entero y lo he auditado con tres herramientas:

1. **Pruebas automáticas** sobre el código real del HTML. No uso una copia: el script se compila con el mismo Babel 7.23.5 que usa la app en el navegador.
2. **ESLint**, para detectar variables sin definir, claves duplicadas y hooks condicionales.
3. **Revisión manual**, línea a línea.

He corregido 20 problemas. **Cinco podían hacer perder datos al usuario.** El diseño no cambia: mismos colores, tarjetas, tipografías, pestañas y gráficos. Solo hay dos retoques mínimos de tamaño para que nada se salga en pantallas de 360 px.

- **Resultado de las pruebas:** 81 pasan, 0 fallan.
- **Resultado de ESLint:** 0 errores. Quedan 2 avisos de funciones aún sin usar (`mondayOf` y `setsVolume`), que servirán para el calendario de la Fase 3.

## Qué he comprobado de verdad y qué no

**Comprobado (con pruebas automáticas que se pueden repetir con `npm test`):**

- **Arranque y pestañas:** la app arranca y pinta todas las pestañas, secciones y ventanas sin un solo error de consola. En ninguna pantalla aparece "undefined", "NaN" ni "Infinity".
- **Rutina:**
  - Crear, quitar y mover ejercicios.
  - Crear y borrar días.
  - Series de los 5 tipos (incluido añadir tandas y descensos).
  - Guardar registro, récord y sugerir objetivo.
  - Deshacer y rehacer con agrupado de tecleo.
- **Peso:** alta con coma decimal, rangos y gráfico ampliado.
- **Comida:**
  - Agua en litros con decimales (1,5 / 2,5…).
  - Recetas con cantidades que se escalan por ración.
  - Diario.
  - Planificador → lista de la compra.
  - Editor de recetas.
- **Extras:** 1RM (todo en español, sin textos pegados), discos con barra 0 y calculadora nutricional.
- **Ajustes:**
  - Compartir, importar y restaurar.
  - Código corrupto.
  - Exportar .txt, .csv y .doc.
  - Restablecer con copia.
  - Nombre editable.
- **Guardado:** se mantiene al cerrar y reabrir. Hay pruebas con datos dañados y con datos de la versión 6.
- **Temporizador:** cuenta con la hora real, se ve en la cabecera y avisa al terminar.
- **Cálculos:** todas las funciones que pedías tienen pruebas unitarias (lista al final).
- **Recetas:** cada ingrediente de las recetas de serie existe en NUTRI_DB con una unidad válida, y los macros de cada receta salen exactamente de sus cantidades.

**NO comprobado (no tengo móvil ni navegador real en este entorno):**

- **Aspecto visual a 360 px.** He corregido lo que se salía haciendo los cálculos de anchura, pero hay que mirarlo en un móvil.
- **Vibración, pitido, compartir y descarga de archivos** en un móvil real. En las pruebas se simulan.
- **La coma decimal con el teclado de cada fabricante.** Lo he probado en jsdom, que sigue la norma HTML. El campo nuevo ya no depende del teclado, pero conviene probarlo en el móvil.

## Problemas encontrados y arreglados

### A. Riesgo de pérdida de datos (lo más importante)

1. **Migración que sustituía la rutina (el punto a que detectaste).**
   - **Confirmado con una prueba sobre el archivo original:** al subir `APP_VERSION` a 8, un usuario con su rutina editada en la versión 7 volvía a la rutina de fábrica. Con datos de la versión 6 pasaba lo mismo.
   - **Ahora:** `upgradeLegacy` solo se usa con datos sin versión o con versión 5 o menor. De la 6 en adelante hay migraciones incrementales (`MIGRATIONS[7]`, `MIGRATIONS[8]`…) que nunca tocan los días ni los ejercicios del usuario.
   - **Bloque "v6 → v7":** era código muerto y ahora es `MIGRATIONS[7]`, que sí se ejecuta. Respeta el músculo si el usuario lo cambió a mano.
   - **Versión guardada como texto ("7"):** ya no se confunde con la app antigua.
   - **Datos de la app antigua:** los ejercicios sin equivalente se guardan ocultos con su historial, en vez de perderse, y se conserva también la comida.
   - **Pruebas:** hay una que simula subir a la versión 8 y comprueba que la rutina se conserva.
2. **Datos guardados ilegibles se borraban al arrancar.**
   - **Antes:** si lo guardado estaba dañado (JSON roto o sin ejercicios), la app arrancaba con la rutina de fábrica y la escribía encima al instante, sin copia.
   - **Ahora:** antes de escribir nada se hace una **copia de rescate** con el texto original y la app avisa. Las copias (máximo 3) aparecen en **Ajustes → Copias de rescate**, desde donde se pueden descargar. Si no se puede hacer la copia, la app no escribe encima.
   - **Antes de migrar:** también se guarda una copia antes de cada cambio de versión.
3. **Importar "solo la rutina" borraba tus ejercicios propios.** Los ejercicios que no venían en el código desaparecían con todo su historial. Ahora se conservan ocultos.
4. **Fotos que parecían guardadas y no lo estaban.** Si el almacenamiento estaba lleno, la foto se veía pero desaparecía al reabrir la app. Ahora avisa y no la muestra como guardada.
5. **Coma decimal.**
   - **Antes:** los campos eran de tipo número. Escribir "83,4" dejaba el campo vacío y no se registraba nada (comprobado sobre el original).
   - **Ahora:** el campo nuevo acepta "83,4" y "83.4", respeta lo que vas escribiendo ("7,") y muestra siempre coma. Usa el teclado numérico del móvil.

### B. Estabilidad

6. **`commit()` con efectos dentro del actualizador de React (el punto b que detectaste).**
   - **Ahora:** el siguiente estado se calcula fuera, a partir de `stateRef`, y la pila de deshacer se toca una sola vez.
   - **Botones ↩/↪:** se repintan al instante gracias a un contador de estado. Está probado: se activan y desactivan en el momento y el tecleo del mismo campo se deshace de una vez.
   - **Fotos:** tenían el mismo problema (`setFoto` y `delFoto`) y también está corregido.
7. **Avisos (toasts).** Un aviso nuevo se cerraba antes de tiempo por el temporizador del aviso anterior. Además, los mensajes de éxito ("Archivo preparado ✓") salían en amarillo de advertencia.
8. **Compartir y copiar.** Si el usuario cancelaba el menú de compartir quedaba un error sin capturar. Además, "Código copiado" salía aunque la copia fallase. Ahora, si la copia moderna falla, se intenta el método clásico.
9. **Códigos importados con formato raro.** Un código bien firmado pero con datos mal formados (por ejemplo, la lista de ejercicios de un día como texto) colgaba la app. Ahora se rechaza con un mensaje claro.
10. **Enlace del vídeo de movilidad.** Un código importado podía colar un enlace `javascript:`. Ahora solo se abren enlaces http/https, y si el enlace no es válido se avisa.
11. **Datos raros dentro de un estado válido.** Ahora se reparan sin perder lo demás:
    - ejercicios nulos;
    - días que apuntan a ejercicios que no existen;
    - pesos no numéricos;
    - recetas con un tipo desconocido (antes rompían la pantalla de la receta).
12. **Pitido del descanso.** En los móviles, el audio creado fuera de un toque no suena. Ahora se prepara al pulsar "empezar". No está verificado en un móvil.
13. **División por cero** en las barras del diario cuando el objetivo de hidratos es 0 g.

### C. Textos y formato

14. **Decimales con punto en vez de coma** en varios sitios: discos ("2.5 kg"), peso actual, diferencia de 30 días, registros y objetivo sugerido ("112.5 kg"). Ahora todos salen con coma.
15. **Calculadora de discos.** Decía "sobran X kg" cuando en realidad faltaban. Ahora dice "te quedas en X kg (faltan Y kg)".
16. **1RM.** Ya estaba en español. He verificado que no hay textos pegados tipo "Epley215" y la he pasado a una función con pruebas. Sigue mostrando un único 1RM, el rango y la tabla.
17. **CSV.** Excel convertía "8/7" (tandas de rest-pause o descensos) en la fecha 8 de julio. Ahora esas cifras se separan con " · ". Se mantienen el BOM, el ";" y la coma decimal.
18. **Pantallas de 360 px.**
    - La cabecera con el temporizador en marcha medía unos 350 px y solo caben 332, así que se salía. Ahora el título se adapta.
    - Las cabeceras de las tarjetas de peso y del diario pasan a otra línea si no caben.
19. **Agua.** Con un total muy alto se dibujaban decenas de botellas. Ahora se muestran como máximo 12, y la cifra sigue siendo exacta.
20. **Recetas editadas.** Al cambiar los ingredientes de una receta de serie los macros no se recalculaban, pero la ficha seguía diciendo que "salen de las cantidades exactas".
    - **Ahora:** hay un botón **"🧮 Calcular macros con los ingredientes"** que avisa de los ingredientes que no están en la tabla.
    - **La nota:** ya no aparece en las recetas editadas.

## Dudas para que decidas tú

- **🏆 en la tarjeta del ejercicio.** Muestra el **último** peso de la serie 1, no el mejor. En cambio, "cuánto me falta" y "sugerir objetivo" usan el **mejor**. No lo he cambiado. ¿Quieres que el trofeo muestre el mejor?
- **Guardar registro vacía la pila de deshacer.** Estaba hecho a propósito en el código. ¿Lo mantengo?
- **Hay 31 recetas, no 30.** No he quitado ninguna.
- **Ejercicios ocultos.** Los que quedan fuera al importar una rutina o al migrar de la app antigua no salen en ningún día, pero conservan su historial y van en las copias de seguridad. Si te molesta, en la Fase 2 puedo añadir una pantalla para verlos y recuperarlos.
- **Códigos antiguos.** Los códigos de compartir creados antes de este cambio no llevan número de versión. Los nuevos sí (`appVersion`), para poder migrarlos en el futuro.
- **Contrato de `Native.loadState`.** Ahora lanza un error con el texto original si lo guardado está dañado, en vez de devolver `null`. La capa nativa de la Fase 2 respetará este contrato.

## Pruebas incluidas (81)

- **`tests/logic.test.js` (30):**
  - effectiveCount y weeklySets;
  - muscleProgress;
  - calcBMRInfo, calcPlan y macroSplit;
  - gastoReal;
  - ingMacros y macros de las 31 recetas;
  - listaCompra;
  - normalizeAgua (vasos → litros);
  - 1RM y discos;
  - coma decimal;
  - fechas locales (incluido el cambio de hora);
  - enlaces seguros.
- **`tests/migration.test.js` (15):**
  - versiones antigua, 6, 7 y una simulada 8;
  - datos rotos;
  - idempotencia;
  - copias de rescate al arrancar.
- **`tests/share.test.js` (14):**
  - códigos GYMR1: ida y vuelta, corrupto, incompleto, con saltos de línea y con rutina rota;
  - applyImport en los dos modos;
  - CSV (BOM, ";", coma decimal, " · ");
  - .txt y .doc.
- **`tests/ui.test.jsx` (22):** la app real montada, recorriendo todos los flujos. Cualquier error de consola o texto roto hace fallar la prueba.

Para repetirlas: `npm install` y `npm test`. Para pasar ESLint: `npm run lint`.

## Repositorio y siguientes pasos

- **Acceso:** el repositorio `nripolles10-cpu/mi-rutina` ya está creado. La app de Claude está instalada solo en ese repositorio, y Jaime es colaborador.
- **Dónde está el trabajo:** lo he subido a la rama **`fase-1-auditoria`** para que puedas revisarlo. Es la única rama por ahora; la rama `main` con el proyecto Android la crearé en la Fase 2. La rama contiene `ultimo.html` corregido, `ultimo.original.html`, las pruebas y este informe.
- **Siguiente fase:** cuando des el visto bueno respondiendo a este correo, empiezo la **Fase 2**: proyecto Android con Capacitor, capa nativa, firma con un keystore propio y compilación en GitHub Actions. Usaré como base el `ultimo.html` corregido.
