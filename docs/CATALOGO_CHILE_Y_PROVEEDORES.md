# Catálogo Chile y cotizaciones · v1.4.0

La lista inicial contiene 16 referencias con enlaces de fabricante y comercialización en Chile revisados el 27-10-2026. Es una selección inicial, no un inventario completo del mercado ni garantía de stock, precio o autorización SEC. La ficha y la revisión del equipo entregado prevalecen.

| Categoría | Referencias | Aplicación actual |
| --- | --- | --- |
| Solis | S6-EH1P5K/6K/8K-L-PLUS | Parámetros de manual EUR ESP V1.0 (2024), separados de revisiones de 21 A. Cálculo y presupuesto. |
| Módulo | Canadian Solar CS6W-550MS | Parámetros STC y dimensiones de ficha CSJ V2.3. Confirmar revisión local. Beta Vmp permanece como supuesto editable. |
| Módulo | Jinko JKM550M-72HL4-V | Referencia comercial y presupuesto; ficha eléctrica exacta pendiente. No usa valores de un Jinko N-BDV distinto. |
| Victron | MultiPlus-II, MultiPlus-II GX y EasySolar-II GX de 5000 VA | Referencias y partidas adicionales. El motor no dimensiona automáticamente sus reguladores ni el bus de batería. VA no equivale a W. |
| Reguladores Victron | SmartSolar 100/30, 150/35 y 250/100 VE.Can | Referencia y costo adicional; sin cálculo automático de arquitectura externa. Corriente de carga no equivale a corriente de entrada FV. |
| Cable solar | TOPSOLAR H1Z2Z2-K de 4, 6 y 10 mm² | Precio por metro de conductor, aplicable si coincide con sección calculada. No valida la tabla térmica. |
| Cable AC | POWERFLEX RV-K 2 × 1,5 mm² y referencia RV-K 3 × 4 mm² | Precio por metro de cable completo; exige coincidencia con sección y conductores del circuito. Marca del 3 × 4 por confirmar. |

Cada tarjeta enlaza la fuente técnica/familia y la referencia comercial. El registro 150/35 se observó sin stock; confirmar disponibilidad. Los antiguos registros Jinko N-BDV/GoodWe siguen siendo compatibles con JSON anteriores; la interfaz actual muestra el catálogo Chile.

## Registrar y aplicar precios

1. En **Catálogo técnico**, filtra por marca, modelo o categoría. Aplica primero los parámetros documentados del módulo/inversor que vas a usar.
2. Abre **Proveedores y precios**. Añade uno o varios proveedores, precio por presentación, cantidad de unidades o metros, moneda, impuesto, fecha, vigencia y enlace.
3. Un rollo de 100 m se divide por 100. Si el precio incluye el impuesto indicado, se divide también por `1 + impuesto/100`. El 19 % inicial es editable, no una determinación tributaria del proyecto.
4. Compara precios netos en la misma moneda. No se convierten divisas automáticamente. La tarjeta muestra el menor neto vigente de tus registros; no el precio de mercado actualizado.
5. **Usar precio** conserva una copia dentro del proyecto. Para equipos documentados debe coincidir la ficha actual. Para cables debe coincidir sección y número de conductores. No se aplica una cotización vencida ni de otra moneda.
6. Un cable de 3 conductores se cuenta por metro de cable completo; el DC unipolar mantiene los metros de cada polaridad y string. Se conserva el 10 % adicional. El precio manual de una partida tiene prioridad; aplicar una nueva cotización elimina esa sobreescritura para esa partida.
7. Los equipos de referencia pueden añadirse como **Partida adicional · solo presupuesto**. Su costo se suma explícitamente, sin sustituir ni dimensionar los equipos calculados. Evita duplicar inversores o reguladores en una propuesta final.

Editar la base no cambia silenciosamente proyectos anteriores. Si se modifica un equipo, sección o moneda, el motor avisa y deja de usar la selección incompatible. Una cotización que vence después de aplicarla conserva su costo histórico con advertencia. El presupuesto es neto y preliminar; confirmar stock, logística, impuestos y condiciones antes de comprar.

## Almacenamiento y respaldo

La base de cotizaciones es local a cada navegador/dispositivo, en `solis-fv-suppliers-v1`, con hasta 1000 registros. No hay base D1 compartida ni usuarios en esta entrega. Los proyectos conservan hasta 6 selecciones de partidas y 50 adicionales.

**Respaldar proveedores JSON** exporta la base completa. **Importar proveedores JSON** la reemplaza después de validar estructura, cantidades, fechas, monedas y enlaces. Cada edición conserva un respaldo anterior; **Restaurar respaldo anterior** permite volver a él. No es un historial completo. Los datos ilegibles no se reemplazan silenciosamente.

El JSON del proyecto conserva las copias aplicadas, no toda la base. Excel agrega la hoja **Proveedores** cuando existe una selección; el PDF incluye las cotizaciones, fechas, proveedor y estado de aplicación. Mantén respaldos de ambos JSON.

## Próximas mejoras recomendadas

- Base compartida con cuentas, roles, copias de seguridad y registro de cambios de cotizaciones.
- Editor de productos propios, importación masiva validada y control de revisión de ficha/certificación por SKU.
- Arquitectura Victron completa: reguladores, bus DC, rango de batería, corriente de carga, potencia real, BMS y conductores de batería.
- Impuestos y margen comercial por propuesta, gastos de transporte y validez de oferta.
- Simulación horaria con clima validado, sombras 3D y comparación de escenarios reales de almacenamiento.
