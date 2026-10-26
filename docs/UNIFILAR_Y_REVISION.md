# Unifilar y revisión técnica · v1.3

## Uso

1. Completa las entradas del proyecto y revisa sus errores en Dimensionamiento y Diseño eléctrico.
2. Abre **Unifilar y revisión**. El diagrama agrupa el generador por strings y representa inversor, seccionamiento/protecciones pendientes, conexión de red, tablero general y los ramales de batería/EPS aplicables.
3. Introduce responsable y nota del plano; pulsa **Aplicar datos del plano** antes de exportar. El responsable de revisión es independiente del responsable/revisor documental del informe.
4. Descarga SVG para llevarlo a una herramienta vectorial. El informe PDF incluye el unifilar por defecto; puedes desmarcarlo y aplicar los datos. El registro de revisión se mantiene en el informe.
5. En cada punto, pulsa **Registrar revisión**. «Revisado por usuario» y «No aplica» exigen responsable y referencia/justificación. «Pendiente» reabre la revisión y retira la declaración actual.
6. Guarda el proyecto y exporta JSON. El Excel incluye estados, referencias y datos de circuitos; el JSON conserva también el contexto técnico de cada declaración.

## Alcance del dibujo

- **C1:** corriente, sección y ruta DC por string, antes de combinar. La línea agrupada no prescribe unir todas las entradas MPPT.
- **C2:** circuito AC del inversor al punto de conexión.
- **C3:** empalme al punto de conexión; sin definir la protección general de la instalación.
- **C4:** salida EPS monofásica a cargas críticas, cuando existe. En red trifásica utiliza la tensión de respaldo calculada por el motor. No se conecta directamente a las cargas generales.
- El banco se muestra si hay baterías dimensionadas. Su corriente, tensión, cable, protección y BMS **no** se deducen del almacenamiento en kWh.
- Cada bloque de protección es una reserva conceptual, no un equipo seleccionado. No representa bornes, estados de contactos, neutro, PE, tierra o conmutación. La transferencia y el aislamiento de red deben diseñarse y verificarse con el fabricante.
- Si el motor tiene errores, el dibujo conserva el aviso. Un esquema visible no demuestra que el sistema sea ejecutable.

La simbología es funcional y propia de esta herramienta; no se declara una representación normalizada IEC ni un plano apto para instalación o presentación regulatoria. Completar mediante ingeniería de detalle.

## Revisiones y vigencia

La lista orientativa incluye DC, AC, residual, sobretensión/arco, tierra, térmica/canalización, interfaz, EPS, batería y ensayos/documentación. No es exhaustiva ni una automatización normativa. Consulta la normativa vigente del país, la distribuidora y las fichas aplicables. Como referencia para Chile: [SEC · instructivos de generación distribuida](https://www.sec.cl/gda/norma-tecnica-e-instructivos/). No se incluyen ratings por defecto para protecciones.

Cada declaración contiene estado, responsable, fecha ISO, referencia y un contexto de entradas/resultados relacionados. El contexto no es una firma digital ni evita la manipulación de un archivo JSON.

- Cambiar parámetros relacionados marca **Revisar por cambios**. La declaración anterior sigue visible para poder revisarla.
- Precios, notas y revisión documental no invalidan una revisión eléctrica por sí solos.
- Si se recuperan exactamente los parámetros previos, el contexto vuelve a coincidir. No es una garantía de que el sitio físico no haya cambiado.
- EPS y batería quedan fuera del conteo si se retiran del sistema; sus registros se conservan como referencia. Volver a activarlos vuelve a evaluar la coincidencia de contexto.
- No existe historial completo por ítem: actualizarlo sustituye su declaración actual. Conserva un JSON por revisión si necesitas conservar todas las declaraciones anteriores.
- Registrar todos los puntos no elimina alertas ni modifica materiales, energía o presupuesto. «Revisado» es una declaración de una persona, no un resultado de inspección automática.

## Publicación con validaciones

`npm run build` verifica sintaxis de módulos y ejecuta la suite antes de generar `dist/`. La misma instrucción sirve en Cloudflare Workers Builds y en GitHub Actions. Si falla, el proceso devuelve error y no genera una nueva compilación; Cloudflare no debe continuar a su comando de despliegue. Un `dist/` previo puede permanecer en el entorno local, pero no constituye una nueva compilación validada.

Esto detecta regresiones cubiertas por las pruebas. No sustituye comprobar la aplicación publicada, `/api/solar`, formularios, exportaciones y fuentes reales después del despliegue.
