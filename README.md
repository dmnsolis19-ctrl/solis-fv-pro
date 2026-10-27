# SOLIS FV Pro 1.4.0

Plataforma web en español para predimensionamiento fotovoltaico y simulación horaria con datos importados. Lista para GitHub y Cloudflare Pages/Workers, con unifilar conceptual, revisión técnica, cubierta 2D, consulta solar por servidor, catálogo técnico, comparación de diseños e informe con identidad y revisión documental.

## Cambios de esta versión

- **Tema claro, oscuro y sistema**, con preferencia persistente.
- **Ubicación:** sugerencias locales de 56 ciudades/comunas chilenas, selección que actualiza coordenadas y búsqueda online por Photon a través de `/api/geocode`, con mensajes claros de error.
- **Catálogo Chile:** 16 referencias Solis, Victron Energy, Canadian Solar, Jinko y cables DC/AC. Fuente técnica y referencia comercial visibles. Solo los 4 registros con parámetros documentados alimentan directamente el cálculo.
- **Proveedores:** múltiples cotizaciones por producto, presentaciones/rollos, precios netos o con impuesto, fechas, vigencia y moneda. Copias estables en cada proyecto, compatibilidad con partidas y metros de cable multiconductor.
- **Respaldo de precios:** JSON de base, restauración anterior y Excel. Almacenamiento local; no hay aún una base compartida en nube.
- **PDF descargable:** tipografía incorporada, gráfico mensual, tablas con continuación, logo, cubierta/unifilar opcionales, presupuesto, cotizaciones y trazabilidad. Vista previa HTML e impresión conservadas.
- **Publicación:** sintaxis y 68 pruebas antes de generar `dist`. Se conserva el Worker y el comando de despliegue existente.

Guías: [catálogo y proveedores](docs/CATALOGO_CHILE_Y_PROVEEDORES.md), [ubicación, tema y PDF](docs/UBICACION_Y_PDF.md), [actualización](docs/ACTUALIZAR.md).

## Funciones de v1.3 conservadas

Unifilar conceptual, circuitos DC/AC/empalme, EPS separado y banco de baterías; descarga SVG y página opcional de informe. Registro de 10 revisiones orientativas con responsable, fecha y referencia, que quedan pendientes cuando cambia su contexto técnico. Excel de revisión y controles previos al despliegue. No certifica ni sustituye la ingeniería.

## Funciones de v1.2 conservadas

- **Cubierta 2D:** techo rectangular coplanar, retiros, dimensiones reales del módulo, separación lateral y de filas. Compara patrones regulares vertical/horizontal.
- **Edición:** obstáculos y pasillos rectangulares con resguardo, arrastre, coordenadas editables, exclusión de celdas y deshacer las últimas 20 ediciones del plano.
- **Viabilidad:** comprueba la cantidad requerida por energía y strings. No reduce módulos automáticamente. El botón explícito de ajuste disminuye el objetivo de cobertura y recalcula el proyecto, conservando el consumo.
- **Entrega:** plano SVG, Excel de coordenadas, octava hoja de cubierta cuando está activa y página geométrica en el informe imprimible. JSON conserva el plano completo.
- **Compatibilidad:** proyectos v1.0/v1.1 se abren con cubierta desactivada. Dimensiones documentadas del módulo se cargan al aplicar una ficha del catálogo.

## Funciones de v1.1 conservadas

- **Sitio y recurso solar:** coordenadas WGS84, mapa activable, ciudades de referencia, inclinación y azimut. Consulta PVGIS v5.3/ERA5 con fuente, período y fecha. Importación del JSON original como alternativa.
- **Catálogo:** 3 módulos Jinko Solar y 3 inversores GoodWe iniciales, con fuentes oficiales. Carga de campos documentados y aviso si los editas. Los parámetros no documentados permanecen señalados como supuestos.
- **Comparación:** diseño actual, sin almacenamiento, cobertura 80 % y cobertura 120 %. Generación, costos, autoconsumo, ahorro, VAN y alertas. Aplicar una alternativa y exportar comparación a Excel.
- **Informe:** portada, logo PNG/JPEG, cliente, responsable, revisor, código, revisión y estado. Balance mensual, strings, conductores, alertas, presupuesto, alternativas y procedencia. Vista previa HTML e impresión A4; descarga directa de PDF desde v1.4.
- **Emisiones:** historial local de hasta 20 resúmenes por proyecto, fecha, revisión, versión del motor y campos modificados. No sustituye el JSON completo de cada revisión.
- **Cable AC:** usa el mayor valor entre la corriente calculada y la corriente AC máxima ingresada de ficha.
- **Compatibilidad:** abre proyectos/JSON v1.0 manteniendo el esquema existente y agregando valores por defecto.

## Ejecución local

Node.js 22 o superior. Sin paquetes que instalar para ejecutar; biblioteca PDF y fuentes incluidas con licencias:

```bash
npm run dev
```

Abre http://localhost:5173. Los módulos requieren HTTP; no abras index.html con doble clic.

```bash
npm run check
npm test
npm run build
```

La compilación comprueba la sintaxis y ejecuta las pruebas antes de generar `dist/`. Se necesitan también las carpetas `tests` y `scripts` en GitHub. Un fallo detiene la publicación. El servidor local sirve `/api/solar` y `/api/geocode`; el acceso a proveedores depende de la red y del servicio externo.

## Actualizar y publicar

Lee **[docs/ACTUALIZAR.md](docs/ACTUALIZAR.md)** para copiar los archivos al repositorio existente y publicar mediante GitHub Desktop.

Para **Cloudflare Pages conectado a GitHub**:

| Campo | Valor |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Output | `dist` |
| Root | Vacío si el proyecto está en la raíz |
| Node | 22+ |

Sube `functions/` y `server/` además del frontend. `wrangler.jsonc` configura Pages. La ruta `/api/solar` es una Pages Function; subir solamente archivos estáticos no la crea.

Para **Cloudflare Workers** usa la configuración alternativa:

```bash
npm run build
npx wrangler deploy --config wrangler.worker.jsonc
```

La carga de un ZIP estático por el panel conserva cálculos manuales y catálogos, pero **no configura la consulta por servidor**. Conserva el flujo Workers si ya lo tienes funcionando. No hay secretos, D1 ni R2.

## Funciones conservadas

Consumo en kWh/día, mes o año; cobertura; módulos y superficie; inversor automático/manual; strings iguales y MPPT; Voc frío y Vmp caliente; cables Cu de empalme, AC, EPS y por string DC; autonomía y baterías; CSV anual UTC 8760/8784 h; clipping, pérdidas y batería equivalente AC; materiales con precios individuales; finanzas; Excel real de 8 hojas generales más Cubierta/Proveedores cuando corresponden, CSV, JSON y PDF directo; proyectos y borrador locales.

## Uso recomendado

1. Sitio: introduce coordenadas/plano y consulta el recurso. Verifica que la fuente corresponda al proyecto.
2. Demanda: reemplaza consumo, empalme, red y superficie de ejemplo.
3. Catálogo: elige fichas documentadas o introduce parámetros manualmente; añade cotizaciones de proveedores. Revisa todos los avisos y las temperaturas de célula.
4. Cubierta: configura dimensiones y retiros, añade obstáculos y activa la verificación. Si no cabe, modifica el plano o aplica un objetivo menor. [Guía de cubierta](docs/CUBIERTA_2D.md).
5. Electricidad: ingresa rutas y criterios; sustituye la tabla térmica ilustrativa por datos del método de instalación real.
6. Si hay datos horarios, importa el CSV anual y revisa pérdidas. Este perfil prevalece sobre demanda y HSP mensuales.
7. Materiales: ajusta precios y partidas. No son cotizaciones del fabricante.
8. Comparación: revisa alternativas y alertas; sin perfil horario la batería no mejora automáticamente el autoconsumo supuesto.
9. Unifilar y revisión: registra referencias técnicas verificadas por el responsable. Revisa cualquier estado invalidado por cambios.
10. Informe: completa identidad y revisión; guarda emisión y exporta JSON de respaldo. Genera y descarga el PDF.

## Límites que debes conocer

- Cubierta 2D: un rectángulo coplanar, patrón uniforme anclado al retiro superior izquierdo. No admite polígonos, mezcla de orientaciones, varias aguas ni optimización global. Las medidas son sobre el plano inclinado. Retiros y resguardos manuales; sin comprobación normativa automática.
- Los colores de strings no calculan rutas ni longitudes de cable. Vista e informe limitados a las primeras 500 celdas; SVG/Excel completos. Límite de cálculo de 20.000 celdas por patrón, 50 obstáculos y 5.000 exclusiones.
- Predimensionamiento para revisión profesional; no certifica cumplimiento normativo ni equivale a PV*SOL. Sin sombras 3D ni cálculo estructural.
- Tabla térmica inicial ilustrativa y sin validar. No se seleccionan automáticamente protecciones, PE ni canalizaciones; faltan corto, coordinación y selectividad.
- βVmp del catálogo de módulos sigue siendo un supuesto, explícitamente marcado. El catálogo no acredita autorización SEC ni disponibilidad comercial.
- Recurso PVGIS: se usa irradiación en plano con PR propio, no su energía de salida. No se incluyen sombras cercanas. No se sustituyen errores externos por meteorología inventada.
- El acceso real a PVGIS quedó **sin verificación desde el entorno de desarrollo por restricción de red**. Conversión, validación, ruta y manejo de errores se comprobaron con respuestas controladas. Validar después de desplegar.
- Simulación horaria simplificada: eficiencia constante, batería equivalente AC y SOC inicial vacío; no representa un híbrido por curvas de fabricante.
- Historial resumido, sin rollback ni firma digital. Proyectos locales, sin usuarios/sincronización; exporta JSON y conserva una copia por revisión.
- Finanzas indicativas, sin impuestos, financiación ni reposiciones de batería/inversor.

## Validación

68 pruebas automáticas: proveedores (impuestos, presentaciones, compatibilidad, snapshots y respaldo), geocodificación y PDF, además de topología grid/híbrida, EPS, revisiones requeridas, invalidación por cambios, estados inactivos, independencia de los errores, esquema importado y exportación, además de geometría, retiros y separaciones, obstáculos/resguardos, unión de áreas, exclusiones, límites, ajuste de cobertura, coherencia de BOM, SVG/Excel/informe y migración; además del motor original, conversión de azimut, transformación de irradiación a HSP, procedencia, rechazo de coordenadas/plano incorrectos, API y caché, errores externos, catálogo, corrientes AC de ficha, incompatibilidades, comparación aislada, compatibilidad JSON, emisiones, informe y seguridad del texto, logo en Excel, y proyección cartográfica. Incluye 200 escenarios deterministas de strings y 120 de geometría dentro de la suite.

## Código

- `public/schematic.js`, `schematic-ui.js`, `review.js`: topología, editor de revisión y contexto técnico.
- `scripts/release.mjs`: validaciones obligatorias antes de compilar.
- `public/roof.js`, `roof-svg.js`, `roof-ui.js`: geometría, render de plano y editor.
- `public/engine.js`: motor determinista y validación.
- `public/solar.js`: contrato PVGIS y procedencia.
- `public/catalog.js`: equipos y fuentes oficiales.
- `public/comparison.js`: alternativas aisladas.
- `public/report.js`: informe HTML imprimible.
- `public/advanced-ui.js`, `site-map.js`: módulos nuevos de interfaz.
- `public/app.js`, `persistence.js`, `exports.js`: interfaz principal, proyectos/emisiones y archivos.
- `server/solar-handler.js`: consulta fija a PVGIS con validación, timeout y caché de un día.
- `functions/api/solar.js`: ruta para Pages.
- `server/worker.js`: alternativa Workers + assets.

## Documentación

- [Actualización y despliegue](docs/ACTUALIZAR.md)
- [Catálogo, recurso y fuentes](docs/CATALOGO_Y_RECURSO.md)
- [Fórmulas del motor](docs/METODOLOGIA.md)
- [Unifilar y revisión técnica](docs/UNIFILAR_Y_REVISION.md)
- [Cubierta 2D y criterios](docs/CUBIERTA_2D.md)
- [CSV horario](docs/PERFIL_HORARIO.md)
- [Evolución pendiente](docs/EVOLUCION.md)

Aplicación independiente de PV*SOL y de los fabricantes citados. No se publicó en cuentas externas durante esta entrega.
