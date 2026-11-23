# Chopper Beauty · Documentación técnica

Chopper Beauty es una aplicación web de colorimetría personal. La persona compara dos pares de cualidades —cálido o frío, claro o profundo— y recibe una o más paletas de maquillaje y ropa. Puede completar todo el recorrido manualmente. Si activa la cámara, la aplicación mide el color de pequeñas regiones del rostro para sugerir una opción en cada paso. La elección que se confirma determina el resultado.

**Versión documentada.** Código local de `C:/Visual Studio/AppWeb/react/chopper-beauty/`, revisado el 23 de noviembre de 2026. La interfaz está en inglés, por lo que esta guía conserva los nombres de los botones para que puedas localizarlos. La recomendación de colores de cabello es una mejora solicitada y pendiente de integrar en este proyecto.

## Índice

1. [Instalación y ejecución](#instalacion)
2. [Organización del proyecto](#organizacion)
3. [Recorrido y reglas de decisión](#recorrido)
4. [Componentes, estado y eventos](#componentes)
5. [Procesamiento de imagen y color](#procesamiento)
6. [Catálogo de recomendaciones y descarga](#catalogo)
7. [Interfaz y accesibilidad](#interfaz)
8. [Pruebas y diagnóstico](#pruebas)
9. [Compilación y despliegue](#variantes)
10. [Guía de mantenimiento](#mantenimiento)

<a id="instalacion"></a>
## 1. Instalación y ejecución

Abre una terminal en la carpeta que contiene `package.json`, `pnpm-lock.yaml` y `src/`. El flujo de despliegue del repositorio utiliza Node.js 24 y pnpm 10. Puedes usar esas mismas versiones para reproducir ese entorno.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre la dirección local que imprima Vite. Selecciona **Start color analysis**. Para probar sin cámara, elige un color y pulsa **Continue**. En la segunda comparación, elige otro color y pulsa **See my season**.

| Comando | Para qué sirve |
| --- | --- |
| `pnpm dev` | Inicia Vite con actualización de la interfaz durante el desarrollo. |
| `pnpm test` | Ejecuta Vitest una vez. |
| `pnpm lint` | Ejecuta ESLint sobre el proyecto. |
| `pnpm build` | Genera los archivos estáticos de producción en `dist/`. |
| `pnpm preview` | Sirve la compilación localmente después de ejecutar `build`. |

La aplicación utiliza React y React DOM (rango declarado `^19.3.1`), Vite (`^8.3.6`) y MediaPipe Tasks Vision (`0.10.14`). Para usar la cámara hacen falta permiso del navegador, una cámara disponible y acceso a los recursos externos del modelo en su primera carga. Para desarrollo con cámara, usa la dirección de localhost de Vite o un sitio servido por HTTPS.

<a id="organizacion"></a>
## 2. Organización del proyecto

| Archivo o carpeta | Responsabilidad en la aplicación |
| --- | --- |
| `index.html` | Define título, idioma, icono y contenedor `#root`. Carga `/src/main.jsx`. |
| `src/main.jsx` | Importa los estilos globales y monta `App` mediante `createRoot`, dentro de `StrictMode`. |
| `src/App.jsx` | Contiene el catálogo estacional, los pares de comparación, los componentes y la coordinación de la cámara. Es el punto de partida para entender el flujo. |
| `src/constants/config.js` | Agrupa las direcciones del modelo y de WebAssembly, índices faciales, pesos, umbrales y mensajes. Algunos ajustes tienen valores locales en `App.jsx`. |
| `src/utils/skinSampler.js` | Convierte puntos faciales en rectángulos y promedia sus píxeles. |
| `src/utils/color.js` | Convierte RGB a CIELAB, calcula el ángulo de tono, clasifica el subtono, suaviza lecturas y detecta luminosidad extrema. |
| `src/utils/savePalette.js` | Dibuja una paleta en un lienzo y genera la descarga PNG. |
| `src/utils/color.test.js`, `skinSampler.test.js` | Prueban las operaciones de color y muestreo con entradas controladas. Ambos están en `src/utils/`. |
| `src/index.css`, `src/App.css` | Aplican el modelo de caja global, quitan el margen del documento y definen la distribución, los colores y los estados visuales. |
| `src/assets/`, `public/` | El encabezado importa `src/assets/logo.jpg`. El HTML referencia el favicon de `public/`. También hay recursos de plantilla, como los SVG de React y Vite. |
| `package.json`, `pnpm-lock.yaml` | Declaran scripts y dependencias, y fijan la resolución de paquetes. |
| `vite.config.js`, `eslint.config.js` | Habilitan el complemento React de Vite y las reglas de JavaScript, JSX, Hooks y React Refresh. ESLint excluye `dist`. |

`BITACORA_IA.md` registra solicitudes de desarrollo. `README.md` presenta el proyecto y `.github/workflows/deploy-pages.yml` configura su publicación.

<a id="recorrido"></a>
## 3. Recorrido y reglas de decisión

1. **Inicio.** `App` presenta la marca, una explicación desplegable y el botón de entrada. Al entrar, monta `Analysis`.
2. **Temperatura.** Se compara durazno cálido con rosa frío, o dorado con plateado. **First pair** y **Second pair** cambian las muestras. Se puede confirmar una elección o pulsar **I'm not sure**.
3. **Profundidad.** El par que se muestra depende de la temperatura anterior. Para cálido se ofrecen durazno/terracota o amarillo mantequilla/ocre. Para frío, lila/ciruela o azul hielo/cobalto. Si la temperatura quedó abierta, se comparan dos rosas o dos azules. Cada par representa las mismas dos decisiones internas, `light` y `deep`.
4. **Resultados.** La app detiene la cámara y filtra el catálogo por las elecciones confirmadas. **Previous step** permite revisar la profundidad. **Start comparisons again** borra las dos elecciones. **Exit studio** vuelve al inicio.

| Temperatura confirmada | Claro (`light`) | Profundo (`deep`) | Sin decidir (`unsure`) |
| --- | --- | --- | --- |
| Cálida (`warm`) | Spring | Autumn | Spring y Autumn |
| Fría (`cool`) | Summer | Winter | Summer y Winter |
| Sin decidir (`unsure`) | Spring y Summer | Autumn y Winter | Las cuatro estaciones |

**Ejemplo.** Si la cámara sugiere cálido pero la persona selecciona rosa frío y confirma, queda guardado `cool`. Si después confirma profundo, el filtro devuelve `SEASONS.cool.deep`, correspondiente a Winter. Un subtono medido como `neutral` y la respuesta `unsure` son conceptos distintos. El primero es una lectura de color y el segundo es una decisión de mantener abierto un filtro.

<a id="componentes"></a>
## 4. Componentes, estado y eventos

| Componente | Entradas y responsabilidad |
| --- | --- |
| `App()` | Mantiene `inStudio`, muestra el encabezado y alterna bienvenida y estudio. `returnHome()` devuelve el foco al botón de inicio en el siguiente cuadro de animación. |
| `Analysis({ onExit })` | Coordina las comparaciones, la sesión de cámara y el resultado. Usa `onExit` al retroceder desde el primer paso. |
| `ResultPalette({ title, colors })` | Recibe un título y una lista de pares `[hexadecimal, nombre]`. Genera una lista de muestras y comunica su longitud al CSS mediante `--swatch-count`. |

**Estado del estudio.** `temperature` y `depth` guardan las decisiones confirmadas. El componente deduce `step` de ellas. `null` significa que falta responder. `manualChoice` contiene la selección provisional y `pairIndex` identifica el par visible. La elección efectiva es `manualChoice ?? cameraSuggestion`. Por eso, una medición nueva respeta la elección manual. `confirmComparison()` confirma, restablece el par a cero y descarta la captura. `goBack()` recupera la decisión anterior como selección provisional, salvo cuando era `unsure`.

**Estado de cámara.** `started` evita volver a arrancar desde el botón mientras hay una solicitud. `cameraReady` habilita los controles en vivo. `status` explica carga, permisos, ausencia de rostro o error. `result` conserva la última estimación visible, `frozen` controla su actualización, `aspect` ajusta la vista al video y `comparisonFrame` contiene una captura temporal.

**Referencias.** Los elementos de video y lienzo, el detector, el flujo de cámara y el identificador de animación se guardan en `useRef`. Otras referencias conservan la lectura suavizada, los tiempos de video e interfaz y las banderas de ejecución y congelación. Así, el bucle puede consultar valores actuales sin solicitar un render por cada dato intermedio.

<a id="procesamiento"></a>
## 5. Procesamiento de imagen y color

### Desde la cámara hasta una sugerencia

1. `start()` carga WebAssembly desde jsDelivr y el modelo `face_landmarker.task` desde Google Cloud Storage. Configura `FaceLandmarker` para GPU, video y un rostro. Solicita cámara frontal con tamaño ideal de 960 × 720 y audio desactivado. Ajusta los lienzos a las dimensiones reales recibidas.
2. `loop(frameTime)` se agenda con `requestAnimationFrame`. Si ha cambiado `video.currentTime`, ejecuta `detectForVideo` y limpia el lienzo superpuesto. Con un rostro detectado llama a `analyze()`. Sin rostro, muestra la indicación de centrar la cara.
3. `analyze()` copia el cuadro a un lienzo auxiliar, obtiene los rectángulos faciales y calcula el RGB medio. El lienzo visible dibuja los rectángulos blancos que indican dónde se muestrea. Si faltan píxeles válidos, termina el procesamiento de ese cuadro.
4. El color medio se suaviza entre cuadros. Si la lectura está activa y han pasado más de 100 ms desde la última actualización visible, `describeSkinColor()` produce el nuevo resultado. La detección puede continuar entre actualizaciones de la interfaz.
5. Para sugerir una respuesta, debe existir una lectura sin aviso de exposición y cumplirse que la lectura esté congelada o que el estado de cámara no indique un problema. En temperatura, un resultado neutral deja la elección abierta. En profundidad, se usa la luminosidad de la muestra.

### Contratos de las funciones

| Función | Entrada, salida y criterio |
| --- | --- |
| `getSamplePatches(landmarks, width, height)` | Recibe puntos normalizados y dimensiones en píxeles. Estima el ancho facial con la distancia entre los índices 234 y 454. Para los índices 50, 280, 205, 425 y 151 genera rectángulos `{x, y, width, height}` en mejillas y frente. El semilado es el mayor entre 3 píxeles y el 2.5 % del ancho facial redondeado. Ajusta los rectángulos a la imagen y elimina los de área vacía. |
| `averagePatchesColor(context, patches)` | Lee RGBA con `getImageData`, omite alfa y divide la suma de cada canal entre el total de píxeles. Devuelve `[r, g, b]` o `null` si el total es cero. Un parche de mayor área aporta más píxeles al promedio. |
| `smoothColor(previousColor, currentColor, previousWeight)` | La primera muestra se devuelve directamente. Después, cada canal toma por defecto el 90 % de la lectura suavizada anterior y el 10 % de la actual. |
| `rgbToLab([r, g, b])` | Linealiza los canales sRGB de 0 a 255 con el auxiliar `toLinear`, aplica la transformación a XYZ y la curva `labCurve` con blanco D65. Devuelve `[L*, a*, b*]`. |
| `getHueAngle(labA, labB)` | Devuelve `atan2(b*, a*) × 180 / π` en grados. El código conserva el signo del ángulo. |
| `classifyUndertone(hueAngle)` | Asigna `cool` por debajo de 50°, `warm` por encima de 58° y `neutral` desde 50° hasta 58°, incluidos ambos extremos. |
| `describeSkinColor(rgb)` | Compone las operaciones anteriores y devuelve un objeto con `undertone`, `hueAngle`, `lightness` y `rgb`. |
| `getLightingWarning(lightness)` | Devuelve un aviso si L* es menor que 30 o mayor que 88. En el intervalo cerrado [30, 88] devuelve una cadena vacía. |

El umbral de profundidad es **L* ≥ 60 para claro** y **L* < 60 para profundo**, siempre que la lectura sea utilizable. MediaPipe localiza puntos faciales. La clasificación cromática usa las reglas anteriores, y la estación proviene del catálogo. La iluminación, el maquillaje y la exposición de la cámara pueden cambiar los píxeles de entrada y, con ellos, la sugerencia.

### Congelar, capturar y salir

- **Freeze estimate** llama a `toggleFreeze()` y conserva el resultado visible. El video, la detección y el promedio suavizado continúan. **Resume estimate** permite publicar de nuevo la lectura.
- **Capture comparison** llama a `captureComparison()`. Con video disponible, sin mensaje de estado y con un resultado en la interfaz, captura un JPEG en memoria, con calidad 0.85, ancho máximo de 640 píxeles y proporción original. Las dos vistas usan exactamente esa misma imagen junto a diferentes muestras de color.
- **See my season** llama a `stopCamera()` al confirmar el segundo paso. Detiene las pistas, cancela la animación, desconecta el video, cierra el detector y reinicia las lecturas. Al desmontar el estudio, el efecto de limpieza también libera los recursos. Un `AbortController` marca solicitudes pendientes para descartar resultados tardíos y liberar las pistas o el detector si llegan después de salir.
- **Datos.** El código procesa el video en el navegador. Las solicitudes externas cargan el motor y el modelo. La captura permanece en el estado del componente hasta que se reemplaza, se cambia de paso o se sale. El PNG descargado contiene las recomendaciones de la estación.

<a id="catalogo"></a>
## 6. Catálogo de recomendaciones y descarga

`SEASONS[temperatura][profundidad]` contiene un objeto con cinco campos. `name` identifica la estación, `description` la describe y `outfit` propone un conjunto. `makeup` contiene tres muestras de maquillaje y `colors` contiene cuatro de ropa. Cada muestra almacena el código hexadecimal y la etiqueta visible. Estas son las etiquetas que encontrarás en la interfaz.

| Estación | Maquillaje | Ropa |
| --- | --- | --- |
| Spring | Peach blush, Coral lip, Champagne shadow | Peach, Coral, Butter, Apple green |
| Autumn | Terracotta blush, Brick-red lip, Bronze shadow | Rust, Ochre, Olive, Chestnut |
| Summer | Cool rose blush, Soft mauve lip, Lilac-taupe shadow | Dusty rose, Lavender, Mist blue, Cool sage |
| Winter | Cool pink blush, Berry lip, Plum shadow | Berry, Royal blue, Pine, Plum |

**Exportación.** `savePalette(season)` crea un Canvas 2D de **900 × 1120 píxeles**. Dibuja la marca, la estación y su descripción. El auxiliar interno `drawSwatches(title, swatches, top)` reparte el ancho disponible entre las muestras de cada fila, dibuja sus rectángulos y añade sus nombres. La última sección incluye `outfit`. La función convierte el lienzo a PNG y activa la descarga mediante un enlace temporal. Para Winter, el nombre generado es `chopper-beauty-winter-palette.png`.

<a id="interfaz"></a>
## 7. Interfaz y accesibilidad

En escritorio, `.studio` distribuye las instrucciones y la cámara en dos columnas. Hasta 740 px, las apila. Al llegar a resultados, `Analysis` deja de renderizar la cámara, añade la clase `.studio-results` y muestra la guía en una sola columna. Dentro de cada estación, `.result-palettes` distribuye las tarjetas según el ancho disponible.

El progreso se representa mediante una lista ordenada con `aria-current="step"`. Los botones de comparación exponen su selección con `aria-pressed`, y el estado de la cámara usa `role="status"`. Cada muestra tiene un nombre visible además del color. Al cambiar de paso, el foco pasa al encabezado. El CSS señala el foco de teclado.

<a id="pruebas"></a>
## 8. Pruebas y diagnóstico

| Archivo principal | Qué comprueba |
| --- | --- |
| `src/utils/color.test.js` | Conversión de blanco, negro y rojo, ángulo de 45°, límites inclusivos de neutralidad, muestras cálida y fría, contenido del resultado, suavizado y avisos de iluminación. |
| `src/utils/skinSampler.test.js` | Cantidad de parches, ajuste al borde del cuadro, promedio de dos píxeles conocidos y resultado vacío. Usa puntos faciales y un contexto de lienzo simulados. |

Las dos suites contienen 19 casos en conjunto. En la carpeta de Visual Studio, Vitest no pudo iniciar porque el entorno impidió crear sus archivos temporales. Los siguientes recorridos son comprobaciones manuales reproducibles.

| Acción o síntoma | Resultado esperado o explicación |
| --- | --- |
| Sin cámara, elegir frío y profundo | Aparece Winter con dos grupos de muestras. **Save palette** genera el PNG de Winter. |
| Pulsar **I'm not sure** en ambos pasos | Se muestran cuatro estaciones, cada una con su propia descarga. |
| Cambiar de par tras capturar una comparación | Se conserva la misma imagen en ambos lados y cambian los colores de comparación. Confirmar o retroceder descarta la captura. |
| La cámara no inicia | Ante `NotAllowedError`, se muestra un mensaje de permiso denegado. Para otros fallos de inicio, la interfaz sugiere revisar cámara y conexión, y permite reintentar. |
| Hay imagen, pero falta una sugerencia | Revisar el mensaje de rostro, el aviso de luminosidad y, en el primer paso, si la lectura es neutral. Se puede elegir manualmente. |
| Regresar desde resultados | Se vuelve a profundidad y se recupera la elección anterior si era definida. La cámara queda disponible para iniciarla otra vez. |

<a id="variantes"></a>
## 9. Compilación y despliegue

`vite.config.js` configura el complemento React y la ruta base `/chopperBeauty/`. Vite usa ese prefijo en las rutas de los recursos de producción. Para revisar la salida antes de publicarla, ejecuta `pnpm build`, después `pnpm preview` y abre la dirección indicada por Vite.

**GitHub Pages.** El archivo `.github/workflows/deploy-pages.yml` se activa al enviar cambios a `main` o al ejecutarlo manualmente. El trabajo de compilación prepara Node.js 24 y pnpm 10, instala con el archivo de bloqueo, ejecuta `pnpm run build` y sube `dist` como artefacto. Después, el trabajo de despliegue publica ese artefacto en el entorno `github-pages`.

<a id="mantenimiento"></a>
## 10. Guía de mantenimiento

| Cambio deseado | Dónde intervenir | Cómo comprobarlo |
| --- | --- | --- |
| Cambiar una recomendación de maquillaje o ropa | Editar el par de código y nombre en `SEASONS`, dentro de `src/App.jsx`. | Elegir la estación correspondiente y descargarla. La tarjeta y el PNG leen el mismo arreglo. |
| Cambiar las telas de comparación | Editar `DRAPE_PAIRS` en `App.jsx`. Mantener las claves que representan temperatura y profundidad. | Alternar **First pair** y **Second pair**, confirmar y verificar la estación. |
| Ajustar la clasificación o la exposición | Revisar `HUE_COOL_BELOW`, `HUE_WARM_ABOVE`, `LOW_LIGHT_LIMIT` y `HIGH_LIGHT_LIMIT` en `config.js`. El corte de profundidad `LIGHT_DRAPE_THRESHOLD` está en `App.jsx`. | Probar valores inferiores, iguales y superiores al umbral modificado. |
| Ajustar los puntos y la estabilidad del muestreo | Revisar índices, tamaño mínimo, proporción y peso de suavizado en `config.js`, junto con `skinSampler.js` y `color.js`. | Ejecutar las pruebas y observar los rectángulos sobre el rostro con la cámara. |
| Cambiar resolución, intervalo de actualización o proporción inicial | Revisar los valores usados directamente en `Analysis`: 960 × 720 ideales, más de 100 ms entre resultados y proporción inicial `16 / 10`. `config.js` también declara ajustes para estos conceptos. | Confirmar qué valor consume el componente activo y probar el arranque y la salida de cámara. |
| Cambiar el diseño o la descarga | Para la pantalla, editar `src/App.css`. Para la imagen descargada, editar posiciones, tipografía y medidas de `src/utils/savePalette.js`. | Comparar escritorio, móvil y PNG. Los estilos de la página y el dibujo en Canvas se actualizan por separado. |
