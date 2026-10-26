# Cubierta 2D · versión 1.2

## Alcance

Una cubierta rectangular y coplanar. Ancho y largo medidos **sobre el plano del techo**, no sobre su proyección horizontal. La inclinación y el azimut del sitio corresponden a este mismo plano; no rotan el dibujo. Origen superior izquierdo, X a la derecha, Y hacia abajo. No se incluyen sombras, estructura ni distancias normativas automáticas.

La cubierta está desactivada por defecto para conservar los cálculos de proyectos anteriores. Puedes preparar un plano en vista previa. Al activar **Usar esta cubierta en el cálculo**, la geometría reemplaza la comprobación aproximada de superficie disponible. El consumo y los paneles requeridos se conservan.

Incluye `examples/cubierta-demo.json`: importa ese archivo desde la aplicación para probar un caso ficticio con catálogo, lucernario y pasillo lateral. Las HSP y precios son supuestos de ejemplo.

## Procedimiento

1. Configura consumo, módulo, inversor y extremos de temperatura. Revisa las fichas eléctricas.
2. Introduce ancho/largo reales de cubierta y retiro perimetral. El mismo retiro se aplica a sus cuatro bordes.
3. Introduce ancho/largo exteriores del módulo. Aplicar una ficha del catálogo actualiza estas dimensiones. Los proyectos importados antiguos reciben dimensiones de ejemplo: compruébalas.
4. Configura separaciones lateral y entre filas en el plano del techo. No son el resultado de un estudio de sombras.
5. Elige vertical, horizontal o automática. Automática compara solo dos patrones uniformes anclados al retiro superior izquierdo y elige el de mayor capacidad. Un empate favorece vertical.
6. Añade obstáculos o pasillos rectangulares. Introduce su posición y medidas, y el resguardo alrededor del objeto. Puedes arrastrarlos y afinar las coordenadas en la tabla. Un pasillo se trata como zona excluida: su ancho es manual.
7. Haz clic en una celda para excluirla/restaurarla. Con teclado: Tab y Enter/Espacio. La primera exclusión en modo automático fija la orientación actual, para evitar que cambie de patrón al editar.
8. Activa la verificación. Si no cabe, cambia la geometría o pulsa **Reducir objetivo para que quepa**. Este botón disminuye la cobertura objetivo; conserva el consumo y recalcula cantidad, potencia DC, inversor automático cuando proceda, materiales, cables y finanzas. No resuelve incompatibilidades ajenas a la cubierta.
9. Exporta SVG y Excel de posiciones. El informe incluye una página geométrica y el Excel general una hoja adicional cuando la cubierta está activa. Exporta JSON para conservar todas las entradas.

## Cálculo

Para cada orientación, el área interior es `(ancho − 2 × retiro) × (largo − 2 × retiro)`.

```text
columnas = floor((ancho interior + separación lateral) / (ancho módulo orientado + separación lateral))
filas = floor((largo interior + separación filas) / (largo módulo orientado + separación filas))
```

Cada celda se descarta si se solapa con un obstáculo o su resguardo. Tocar exactamente un borde no se considera solapamiento; tolerancia numérica de 10⁻⁹ m. El área de objetos con resguardo se recorta al interior y se calcula por unión para no contar dos veces los solapamientos.

La capacidad es la cantidad de celdas válidas tras obstáculos y exclusiones. El plano coloca hasta esa capacidad, en orden por filas. Si el proyecto exige más módulos, muestra solo los que caben y marca **No cabe**. Los resultados energéticos y el presupuesto conservan la cantidad requerida, señalada como incompatible, hasta un ajuste explícito.

El ajuste busca la mayor cantidad compatible con strings iguales, ventana térmica MPPT, corriente, entradas y potencia DC declaradas que quepa en el patrón. Convierte esa cantidad en un objetivo menor de cobertura mediante el rendimiento específico utilizado en el dimensionamiento. Con perfil horario, el objetivo se sigue dimensionando con PR; la cobertura real puede diferir y mantiene sus alertas.

## Edición y conservación

- Deshacer cubre las últimas 20 acciones de obstáculos/exclusiones en la sesión; no revierte cambios generales del formulario ni el ajuste de cobertura. Si el parámetro afectado cambió fuera de ese historial, se invalida para evitar sobrescribir otra edición.
- Las exclusiones se identifican por orientación, posición y tamaño de celda. Cambiar medidas puede dejarlas sin coincidencia; se informa cuántas hay. Limpiar exclusiones permite eliminarlas. Volver a las medidas originales las recupera mientras no las limpies.
- SVG e informe etiquetan los colores por string conceptual. No representan un recorrido eléctrico. Las longitudes AC/DC/EPS siguen siendo las entradas manuales del módulo eléctrico.
- La cantidad de estructura es por módulo; anclajes, perfilería y resistencia mecánica no se deducen del plano.
- JSON y proyectos locales guardan geometría, obstáculos y exclusiones. El esquema JSON sigue siendo `solis-fv-project/v1`; no abrir un proyecto con cubierta en una versión anterior si necesitas conservar sus campos nuevos.

## Límites

Máximo 500 × 500 m de cubierta, 50 objetos, 5.000 exclusiones y 20.000 celdas por patrón. Si un patrón no puede evaluarse por ese límite, no se declara una capacidad alternativa como óptima. Vista e informe muestran las primeras 500 celdas; SVG y Excel exportan todas las evaluadas.

No busca un máximo global, no desplaza el patrón para optimizar, no mezcla orientaciones y no admite polígonos ni varias aguas. Para varias superficies, crea escenarios/proyectos separados y revisa el sistema combinado mediante ingeniería. Un plano que cabe no demuestra ausencia de sombras, cumplimiento de pasillos/retiros, aptitud estructural ni viabilidad de conexión.
