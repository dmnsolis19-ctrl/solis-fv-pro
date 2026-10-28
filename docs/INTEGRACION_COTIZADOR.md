# SOLIS FV Pro → SOLIS Cotizador

Requiere calculadora v1.5.0 y cotizador con la integración v3.9.0. Es una transferencia revisada mediante archivo, sin claves, CORS o acceso directo a la base del cotizador.

1. Revise el diseño FV y sus alertas. Exporte **Cotizador SOLIS · diseño y materiales** desde el menú superior. Para bombeo use su botón de exportación independiente.
2. En el cotizador abra o cree una cotización **Borrador** editable. Seleccione la misma moneda (CLP o USD).
3. En **Listas de materiales y partidas globales**, pulse **Seleccionar archivo FV**. Revise proyecto, revisión, cantidades anteriores/nuevas, retiros y advertencias. Confirme la casilla y agregue o reemplace la lista.
4. Vincule cada material a un costo de la biblioteca compatible en unidad y moneda, o introduzca un costo. Revise equivalencia técnica y proveedor. Todos los precios importados quedan pendientes de confirmación.
5. Complete materiales, instalación y alcance comercial; guarde el borrador y use la revisión/aprobación habitual. El listado interno genera una partida comercial global, como las listas existentes.

No cambia automáticamente cliente, encabezado o moneda de la cotización. No transmite precios de proveedor, margen, impuestos, batería o resultados de otro estudio. El presupuesto comercial es responsabilidad del cotizador. Guarde el JSON completo y PDF técnico del proyecto FV por separado.

El primer archivo recibe un ID de diseño persistente; guarde/exporte después el JSON completo del proyecto para conservarlo en otro navegador. Las exportaciones siguientes del mismo ID reemplazan su lista vinculada. La versión de bombeo usa un ID relacionado pero distinto y puede coexistir. «Nuevo proyecto» recibe otro ID. Para crear una copia comercial independiente, duplique la lista en el cotizador: la copia pierde el vínculo de actualización.

Un resumen SHA-256 canónico detecta el mismo contenido aunque cambie fecha u orden de materiales. Se conservan costos y vínculos solamente si código, descripción, unidad y especificación siguen idénticos; todos vuelven a pendientes. Los materiales nuevos o modificados comienzan en cero. No es una firma digital ni acredita autoría de un archivo: el origen es una declaración del documento.

Contrato `solis-fv-quote/v1`: JSON máximo 300 KB, 1–200 materiales, códigos únicos, cantidades positivas hasta 1.000.000 con seis decimales como máximo, unidades `un`, `m`, `par`, `kit` o `gl`. Se rechazan campos de precio desconocidos, otros esquemas y moneda distinta. El ejemplo `examples/diseno-cotizador-demo.json` es un archivo de demostración generado por esta calculadora.

Sincronización por API, sesión común, catálogo compartido en nube y actualización automática de inventario quedan para una siguiente integración. No se incorporan en este flujo de archivo.
