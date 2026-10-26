# SOLIS FV Pro 1.3.0

Plataforma web en español para predimensionamiento fotovoltaico y simulación horaria con datos importados. Lista para GitHub y Cloudflare Pages/Workers, con unifilar conceptual, revisión técnica, cubierta 2D, consulta solar por servidor, catálogo técnico, comparación de diseños e informe con identidad y revisión documental.

## Cambios de esta versión

- **Unifilar conceptual:** topología actualizada desde el motor, circuitos DC/AC/empalme, EPS separado y banco de baterías cuando corresponde. Descarga SVG y página opcional en el informe PDF.
- **Revisión técnica:** 10 puntos orientativos con responsable, fecha y referencia/justificación. Estados pendiente, revisado por usuario, no aplica justificado y revisar por cambios. No certifica ni sustituye la ingeniería.
- **Contexto técnico:** los cambios relacionados dejan los registros anteriores pendientes de nueva revisión; modificar precios o notas documentales no los invalida. Conserva el registro anterior y su contexto en JSON.
- **Excel:** hoja de revisión técnica y circuitos. 8 hojas generales, 9 con cubierta activa.
- **Publicación controlada:** `npm run build` verifica sintaxis y ejecuta las 55 pruebas antes de generar `dist`. Un fallo detiene la compilación para que Cloudflare no continúe al despliegue.
- **Workers:** guía actualizada para conservar `npx wrangler deploy --config wrangler.worker.jsonc`, el flujo que usa el proyecto desplegado.

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
- **Informe:** portada, logo PNG/JPEG, cliente, responsable, revisor, código, revisión y estado. Balance mensual, strings, conductores, alertas, presupuesto, alternativas y procedencia. Vista previa e impresión a PDF A4.
- **Emisiones:** historial local de hasta 20 resúmenes por proyecto, fecha, revisión, versión del motor y campos modificados. No sustituye el JSON completo de cada revisión.
- **Cable AC:** usa el mayor valor entre la corriente calculada y la corriente AC máxima ingresada de ficha.
- **Compatibilidad:** abre proyectos/JSON v1.0 manteniendo el esquema existente y agregando valores por defecto.

## Ejecución local

Node.js 22 o superior. Sin dependencias de ejecución:

```bash
npm run dev
```

Abre http://localhost:5173. Los módulos requieren HTTP; no abras index.html con doble clic.

```bash
npm run check
npm test
npm run build
```

La compilación comprueba la sintaxis y ejecuta las pruebas antes de generar `dist/`. Se necesitan también las carpetas `tests` y `scripts` en GitHub. Un fallo detiene la publicación. El servidor local también sirve `/api/solar`; el acceso a PVGIS depende de la red del equipo y del servicio externo.

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

La carga de un ZIP estático por el panel conserva cálculos manuales y catálogos, pero **no configura la consulta por servidor**. Se recomienda Git + Pages Functions para esta versión. No hay secretos, D1 ni R2.

## Funciones conservadas

Consumo en kWh/día, mes o año; cobertura; módulos y superficie; inversor automático/manual; strings iguales y MPPT; Voc frío y Vmp caliente; cables Cu de empalme, AC, EPS y por string DC; autonomía y baterías; CSV anual UTC 8760/8784 h; clipping, pérdidas y batería equivalente AC; materiales con precios individuales; finanzas; Excel real de 8 hojas (9 con cubierta activa), CSV, JSON e impresión a PDF; proyectos y borrador locales.

## Uso recomendado

1. Sitio: introduce coordenadas/plano y consulta el recurso. Verifica que la fuente corresponda al proyecto.
2. Demanda: reemplaza consumo, empalme, red y superficie de ejemplo.
3. Catálogo: elige equipos o introduce fichas manualmente. Revisa todos los avisos y las temperaturas de célula.
4. Cubierta: configura dimensiones y retiros, añade obstáculos y activa la verificación. Si no cabe, modifica el plano o aplica un objetivo menor. [Guía de cubierta](docs/CUBIERTA_2D.md).
5. Electricidad: ingresa rutas y criterios; sustituye la tabla térmica ilustrativa por datos del método de instalación real.
6. Si hay datos horarios, importa el CSV anual y revisa pérdidas. Este perfil prevalece sobre demanda y HSP mensuales.
7. Materiales: ajusta precios y partidas. No son cotizaciones del fabricante.
8. Comparación: revisa alternativas y alertas; sin perfil horario la batería no mejora automáticamente el autoconsumo supuesto.
9. Unifilar y revisión: registra referencias técnicas verificadas por el responsable. Revisa cualquier estado invalidado por cambios.
10. Informe: completa identidad y revisión; guarda emisión y exporta JSON de respaldo. Genera PDF desde la vista previa.

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

55 pruebas automáticas: topología grid/híbrida, EPS, revisiones requeridas, invalidación por cambios, estados inactivos, independencia de los errores, esquema importado y exportación, además de geometría, retiros y separaciones, obstáculos/resguardos, unión de áreas, exclusiones, límites, ajuste de cobertura, coherencia de BOM, SVG/Excel/informe y migración; además del motor original, conversión de azimut, transformación de irradiación a HSP, procedencia, rechazo de coordenadas/plano incorrectos, API y caché, errores externos, catálogo, corrientes AC de ficha, incompatibilidades, comparación aislada, compatibilidad JSON, emisiones, informe y seguridad del texto, logo en Excel, y proyección cartográfica. Incluye 200 escenarios deterministas de strings y 120 de geometría dentro de la suite.

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
