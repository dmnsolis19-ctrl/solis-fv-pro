# Ubicación, tema e informe PDF · v1.4.0

## Ubicación

Escribe en **Nombre de ubicación** y selecciona una sugerencia con clic o con flechas + Enter. Elegirla actualiza nombre, latitud y longitud juntos. Escribir un nombre por sí solo no mueve el proyecto a una ubicación supuesta.

Hay 56 referencias urbanas aproximadas de Chile que funcionan sin conexión. No representan direcciones, predios ni techos exactos. Puedes ajustar coordenadas WGS84 manualmente o mediante el mapa activable.

Para otras ciudades y direcciones, la aplicación consulta `/api/geocode` después de una pausa de 1 segundo, desde 3 caracteres. El servidor consulta exclusivamente Photon/komoot con filtro de país CL, tiempo límite de 8 segundos y caché de 24 horas. Se envía el texto de búsqueda; no se envían cliente, consumo ni precios. Evita incluir información personal innecesaria en esa búsqueda.

Fuente y documentación: [Photon](https://github.com/komoot/photon), [API](https://github.com/komoot/photon/blob/master/docs/api-v1.md). Usa datos OpenStreetMap. El servidor público es una demostración sin SLA; para tráfico comercial elevado, hospedar Photon o contratar un proveedor con condiciones adecuadas.

Si falla la consulta online, se conservan las sugerencias locales y las coordenadas actuales. Cambiar sitio o plano no reemplaza automáticamente HSP ni perfil horario: vuelve a consultar/importar el recurso solar correspondiente.

La búsqueda local y las API con respuestas controladas se probaron en desarrollo. La consulta real online devolvió 502 desde este entorno; debe verificarse en el dominio Cloudflare publicado. No se presentan respuestas de prueba como geocodificación real.

## Tema

El selector superior ofrece **Sistema**, **Claro** y **Oscuro**. La elección se conserva en el navegador. El modo Sistema sigue la preferencia del dispositivo. El informe mantiene fondo claro para impresión y lectura del PDF.

## PDF

En **Informe y revisiones**, completa empresa, responsable, revisor, código documental, revisión y estado. Puedes incorporar logo PNG/JPEG de hasta 250 KB y observaciones.

**Descargar PDF** genera el archivo en el navegador, con portada, tipografía incorporada, tablas paginadas, gráfico mensual, cantidades, presupuesto neto, proveedores, revisión técnica y procedencia. Incluye cubierta 2D y unifilar cuando están activados. Las figuras se rasterizan con fondo blanco para conservar legibilidad; el texto del informe sigue seleccionable.

Se conserva un enlace **Guardar PDF generado**, útil si el navegador requiere un segundo clic para descargar. Cerrar ese aviso libera el archivo temporal. **Vista previa del informe** y **Imprimir informe** siguen disponibles; la vista HTML y el PDF directo comparten datos, pero tienen paginaciones distintas.

PDF-LIB 1.17.1 y los subconjuntos tipográficos derivados de DejaVu Sans están incluidos localmente con sus licencias en `public/vendor`; no se carga una biblioteca desde CDN. La generación no envía los datos del proyecto a un proveedor de PDF. Nombres en español y símbolos habituales están soportados; caracteres fuera del repertorio latino se sustituyen por `?`.

Los PDF se comprobaron mediante carga independiente, extracción de texto y renderizado. La generación también alcanzó el estado «Informe PDF generado» en el navegador de prueba; la captura automática de su descarga no estuvo disponible en ese navegador. Verifica el enlace de descarga en tu dominio HTTPS después de actualizar. El informe conserva errores y pendientes del proyecto: una apariencia profesional no implica certificación del diseño.
