# Catálogo y recurso solar · v1.1.0

## Recurso

Consulta: PVGIS API v5.3, herramienta `PVcalc`, base `PVGIS-ERA5`, horizonte topográfico habilitado. La llamada usa 1 kWp y loss=0 únicamente para obtener `H(i)_m` en el plano elegido. **La energía PVGIS `E_m` no se utiliza como la producción final de SOLIS.** Se aplican el tamaño instalado, días y PR del motor propio.

La interfaz expresa azimut como brújula: 0° norte, 90° este, 180° sur y 270° oeste. Se convierte a la convención PVGIS: sur 0°, este −90° y oeste +90°. La inclinación se mide desde el plano horizontal.

Cada respuesta válida conserva fuente, versión de API, base, período informado, fecha y parámetros de consulta, URL original y HSP mensuales. La app avisa si esos datos ya no coinciden con coordenadas, plano o HSP actuales.

El mapa se activa solo por acción del usuario. Usa mosaicos visibles de OpenStreetMap con atribución y caché normal del navegador, sin descargas masivas. La disponibilidad depende del proveedor. No hace geocodificación de direcciones; las ciudades son centros aproximados, no ubicaciones de instalaciones.

La consulta no simula sombras cercanas ni geometría 3D. Un perfil horario previamente importado tiene prioridad sobre las HSP mensuales. Cambiar el plano no transforma ese perfil: el usuario debe sustituirlo si no corresponde al nuevo generador.

## Equipos incluidos

| Marca / familia | Modelos | Referencia |
| --- | --- | --- |
| Jinko Solar Tiger Neo | JKM550N, JKM560N y JKM570N-72HL4-BDV | F1 EN, IEC 2016, página 2 |
| GoodWe ES Uniq | GW5000-ES-C10 y GW6000-ES-C10 | EN V2.1, 20 octubre 2026, página 2 |
| GoodWe EH | GW5000-EH | Ficha EN consultada 26 octubre 2026, página 2 |

Las entradas contienen únicamente una selección de datos de fichas oficiales. Conservan URL, revisión y fecha de consulta. No constituyen una lista de equipos aprobados por SEC ni una comprobación de disponibilidad comercial.

**Módulos:** se usan características frontales STC, área, coeficiente Voc y coeficiente de potencia. No se incluye ganancia bifacial. βVmp no aparece en las fichas elegidas y sigue siendo un supuesto editable, marcado como pendiente de verificación.

**ES Uniq:** dos MPPT, una entrada por MPPT en los modelos incluidos. Eficiencia europea 96,2 % como aproximación constante; no curva de rendimiento. Se registra corriente AC máxima de ficha para el cálculo del cable AC. El modo entre 580 y 600 V es standby y la ventana MPPT a potencia nominal debe revisarse con el manual. En Chile la potencia AC máxima está limitada a la nominal según la nota de esa ficha. Baterías LV y BMS requieren compatibilidad específica.

**EH:** los límites de corriente son menores y pueden excluir paneles modernos. Es una advertencia útil de compatibilidad, no un error del catálogo. Eficiencia y corriente AC máxima deben completarse para la variante instalada. Batería HV y habilitación de respaldo a revisar.

Al aplicar una ficha se reemplazan los campos que esa entrada documenta. Cambiar manualmente esos valores hace que la aplicación avise que ya no coincide con la ficha. Otros parámetros de diseño, como temperatura mínima/máxima de célula, no vienen determinados por el catálogo.

## Referencias primarias

- https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en
- https://www.jinkosolar.com/uploads/619f40ec/JKM550-570N-72HL4-BDV-F1-EN.pdf
- https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ES-Uniq_Datasheet-EN.pdf
- https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_EH_Datasheet-EN.pdf
- https://operations.osmfoundation.org/policies/tiles/
