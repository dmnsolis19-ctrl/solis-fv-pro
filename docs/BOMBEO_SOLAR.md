# Bombeo solar · v1.5.0

Estudio hidráulico estacionario y predimensionamiento energético. Se activa en **Bombeo solar → Activar estudio de bombeo en informes**. Es independiente del consumo, inversor, batería y presupuesto residencial. Comparte módulo FV y temperaturas de célula, editables en Dimensionamiento. HSP de bombeo es un dato manual propio: usar el mes crítico del proyecto.

## Datos y método

1. Volumen diario y horas equivalentes a caudal de diseño: `Q = V / t`, en m³/h. Las horas de funcionamiento no equivalen a HSP.
2. Desnivel desde el nivel dinámico del agua hasta destino; incluir abatimiento. La profundidad total del pozo no equivale a altura estática.
3. Una tubería de diámetro INTERIOR constante, longitud real, rugosidad absoluta y suma de K. Agua limpia a 20 °C: densidad 998,2 kg/m³, viscosidad cinemática 1,004 × 10⁻⁶ m²/s, gravedad 9,80665 m/s².
4. `H = desnivel + Δp/(ρg) + (f L/D + ΣK) v²/(2g)`. Presión terminal diferencial entre fronteras de baja velocidad. Incluir entrada/salida en K; no repetir desnivel ni presión.
5. Darcy-Weisbach: `Re = vD/ν`; `f = 64/Re` en régimen laminar. Colebrook iterativo desde Re 4000. Entre 2300 y 4000 se interpola y se avisa que requiere revisión.
6. Potencia hidráulica `ρgQH / 1000` en kW, con Q en m³/s (`Q m³/h / 3600`); al eje dividida por rendimiento de bomba; entrada del VFD dividida además por rendimientos de motor y variador. El rendimiento MPPT no es rendimiento de conversión.
7. Energía diaria = potencia de entrada × horas declaradas. FV por energía = energía / (HSP × factor FV) × (1 + reserva). El factor FV excluye las eficiencias ya aplicadas. Esta aproximación no simula el arranque, irradiancia horaria o funcionamiento a frecuencia variable.

## Curva Q-H y comprobaciones

Pegue 2–50 filas `Q m³/h;H m`, sin encabezado, con punto decimal, caudal estrictamente creciente y altura no creciente. Debe corresponder a la velocidad y rodete reales. Se interpola por tramos y se encuentra la intersección con la curva del sistema mediante bisección; no se extrapola.

Con una intersección válida, potencia y energía se calculan en ese punto, aunque su caudal sea mayor que el objetivo. La reserva y los rendimientos deben verificarse allí. Un caudal inferior al objetivo genera error. Sin curva se calcula el objetivo y se informa que el punto no está validado. La curva mostrada no constituye una base de bombas del fabricante.

Se contrastan potencia mecánica y corriente de placa con límites del VFD y factor de reducción manual, tensión/fases nominales, margen NPSHa − NPSHr declarado y PN de tubería con altura equivalente del punto y máximo documentado de la curva. Esta comparación PN es orientativa: no calcula el perfil de presión ni transitorios. NPSHa no se calcula desde la instalación: ambos valores deben justificarse para el punto real.

## Variadores con referencia de venta en Chile

| Modelo | Salida nominal | Motor nominal | Referencia comercial |
| --- | --- | --- | --- |
| INVT GD100-0R7G-SS2-PV | 0,75 kW / 7,2 A | 220 V, 1 fase | [Enertik Chile](https://enertik.com/cl/tienda/bombeo-solar/drivers-solares-vfd/inversor-de-bombeo-solar-invt-linea-gd100-750w/) |
| INVT GD100-004G-4-PV | 4 kW / 9,5 A | 380 V, 3 fases | [Enertik Chile](https://enertik.com/cl/tienda/bombeo-solar/drivers-solares-vfd/inversor-de-bombeo-solar-invt-linea-gd100-trifasico-4000w/) |
| INVT GD100-030G-4-PV | 30 kW / 60 A | 380 V, 3 fases | [Solares Chile](https://www.solares.cl/tienda/variadores-de-frecuencia/inversor-variador-de-frecuencia-para-bomba-solar-30kw-trifasico-380v-invt) |

Fuente nominal: [INVT GD100-PV Catalog V3.0](https://www.invt.com/uploads/file1/20250604/GD100-PV%20Catalog-V3.0.pdf). Referencias revisadas el 28-10-2026; no son garantía de stock, autorización SEC o precio. El comercio de 0,75 kW recomienda motor de hasta 1/2 HP: confirmar la combinación exacta con el proveedor, aunque el VFD tenga esa potencia nominal. IP20 exige montaje protegido.

La familia tiene revisiones con límites DC diferentes (440/500 V y 800/900 V). La aplicación parte del menor valor y exige confirmar la unidad real. Los límites de operación DC, Isc admisible y potencia FV máxima comienzan pendientes. **No se confunde corriente de entrada AC con corriente FV**. Altitud y ambiente generan avisos; el derrateo se ingresa según ficha, no se inventa una curva.

## Generador FV y exportación

Se corrigen Voc y Vmp en ambos extremos de temperatura. Se exige Voc frío estrictamente inferior al máximo DC, Vmp frío dentro del rango superior recomendado, arranque con Voc caliente y Vmp caliente por encima del mayor entre mínimo recomendado y `√2 × tensión del motor`. Esta última es una cota ideal del bus DC: revisar modulación, tensión efectiva bajo carga y cualquier booster específico. No se simula un elevador.

Se buscan series iguales y hasta 100 ramas en paralelo, respetando límites DC declarados, Isc por factor del proyecto y potencia FV máxima. Se elige la solución de menor cantidad de paneles que cubra la energía; la tensión puede exigir más módulos que el mínimo energético. Si no existe combinación, se muestra **sin solución**. El módulo de 550 W de ejemplo y un límite de 800 V pueden resultar incompatibles a los extremos térmicos iniciales: no aumente el límite del equipo sin documentación.

La exportación dedicada a SOLIS Cotizador exige estudio activo, ausencia de errores calculados y tres límites DC completados. Incluye paneles, VFD, bomba **por seleccionar** y tubería hidráulica; conserva advertencias. Se completa en el cotizador con cables, filtros, protecciones, PE, estructura, sensores, válvulas y trabajo. No mezcla las cantidades residenciales. El resumen técnico conserva producción anual y batería en cero porque no se estiman para bombeo.

La memoria aparece en Excel propio y como anexo del Excel, HTML y PDF generales. El presupuesto general corresponde al sistema residencial; el anexo de bombeo no lo modifica. Puede registrar precios de los VFD como adicionales de proveedor, sin atribuirles dimensionamiento residencial.

## Ingeniería pendiente

No incluye golpe de ariete, presión distribuida en varias tuberías, selección completa de bomba por curvas de rendimiento/NPSH, aforo, almacenamiento de agua, simulación horaria de bombeo, pérdidas y calentamiento de cables VFD, dV/dt, filtros, armónicos, arranque, protecciones, cortocircuito, selectividad, PE, estructura o certificación normativa. Estos son los siguientes módulos recomendados para un expediente de ejecución. La plataforma no equivale a PV*SOL ni entrega «toda la ingeniería» certificada.

Método hidráulico: [Hydraulic Institute · curvas de sistema](https://datatool.pumps.org/pump-fundamentals/sys-curves).
