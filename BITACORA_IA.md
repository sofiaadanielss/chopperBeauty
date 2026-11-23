# Bitácora de IA de Chopper Beauty

**Danna Sofía García Daniels · Herramienta utilizada:** Codex.

Registro de 12 de 16 solicitudes del proyecto, seleccionadas al azar y presentadas en el orden en que ocurrieron. Las solicitudes están resumidas en español.

## 1. Aplicación del rediseño inicial

Pedí aplicar el rediseño directamente a la app. Codex comprobó que el parche ya coincidía con los archivos de la copia de OneDrive y que la compilación existente contenía la interfaz nueva. En ese momento quedó pendiente ejecutar una compilación nueva porque la restauración de dependencias no terminó.

## 2. Ajuste visual de la interfaz

Pedí mejorar la presentación y conservar la tipografía minimalista. Codex ajustó la paleta a tonos marfil y ciruela, rediseñó la vista previa de la cámara y simplificó la tarjeta de resultados. Se revisó la interfaz en escritorio y en un ancho móvil de 390 píxeles. La compilación, el lint y las 19 pruebas existentes pasaron.

## 3. Rediseño a partir de bocetos y traducción

Compartí bocetos para una pantalla de inicio y un estudio con instrucciones a la izquierda y cámara a la derecha. Pedí conservar el morado, usar el nombre Chopper Beauty y pasar la interfaz y el código a inglés, con los comentarios en minúsculas. Codex aplicó el diseño y revisó los textos y comentarios de la aplicación.

## 4. Análisis de color inspirado en el método coreano

Pedí que el análisis empezara con una cara limpia bajo luz neutra y siguiera dos comparaciones: cálido o frío, y claro o profundo. El estudio combina las respuestas para sugerir Primavera, Verano, Otoño o Invierno. Se probaron las cuatro rutas en el navegador sin conceder acceso a la cámara.

## 5. Corrección de la copia del proyecto

Mostré una captura de VS Code porque todavía veía comentarios en español. Codex descubrió que había editado la copia de OneDrive mientras mi editor tenía abierta la de Visual Studio. Revisó los archivos de destino, trasladó los cambios a la copia correcta y volvió a ejecutar la compilación, el lint y las 19 pruebas. Aprendí a comprobar la ruta del repositorio antes de dar por aplicado un cambio.

## 6. Incorporación del logotipo

Compartí la imagen del loto y pedí guardarla con el nombre «logo». Codex la agregó como [logo.jpg](src/assets/logo.jpg) y la colocó junto a Chopper Beauty en el encabezado. La compilación incluyó la imagen.

## 7. Diagnóstico de la página en blanco de GitHub Pages

Mostré que la ejecución de Pages decía «Success», aunque el navegador presentaba una página blanca. Codex comprobó que el HTML publicado solicitaba `/src/main.jsx` y que esa URL devolvía un 404. Se preparó un flujo para publicar el contenido compilado de `dist` y se verificó que sus rutas incluyeran `/chopperBeauty/`. Esa verificación se hizo sobre la compilación local.

## 8. Sugerencias preseleccionadas

Pedí que el estudio destacara una opción automáticamente y permitiera cambiarla antes de continuar. Codex añadió un paso de confirmación y usó el subtono estimado para la primera comparación y la luminosidad de la muestra como orientación para la segunda. La primera versión también incluía valores predeterminados cuando faltaba una lectura.

## 9. Eliminación de valores predeterminados sin lectura

Pedí que la opción se preseleccionara solo después de detectar mi cara. Codex quitó las selecciones de inicio y dejó el botón de avance deshabilitado hasta que hubiera una elección manual o una sugerencia utilizable de la cámara. Cuando el subtono estimado es neutro, la primera decisión queda abierta. Este ajuste evita presentar una sugerencia inicial como si ya hubiera una lectura.

## 10. Pantalla de resultados

Pedí un apartado de resultados con sugerencias para maquillaje y ropa, sin el panel de cámara. Codex agregó una pantalla que muestra la temporada, los tonos de rubor, labios y sombras, y una paleta de ropa. También añadió código para detener la cámara al entrar en Resultados. La compilación, el lint y las pruebas pasaron. El apagado con una webcam física quedó sin verificar.

## 11. Mejoras para entender y usar el análisis

Aprobé añadir una guía sobre qué observar, la etiqueta «Camera pick», una comparación de dos colores con la misma captura, la opción «I’m not sure» y una tarjeta de paleta descargable. Se verificaron los resultados de una, dos y cuatro temporadas, el diseño móvil y la descarga del PNG en el navegador. La captura con una webcam física quedó sin verificar.

## 12. Despliegue en Cloudflare Pages

Pedí publicar la app en Cloudflare y configurar las herramientas oficiales para Codex. Codex compiló el sitio para la raíz del dominio y desplegó los archivos estáticos con Wrangler. Verificó que la página pública y sus archivos JavaScript y CSS respondieran correctamente. La conexión MCP de Codex requería una autorización independiente del despliegue. [Proyecto desplegado](https://chopper-beauty.pages.dev/).
