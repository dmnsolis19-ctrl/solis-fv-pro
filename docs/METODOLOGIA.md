# Ampliaciones en v1.2

Cubierta rectangular 2D, patrones vertical/horizontal uniformes, retiros y exclusiones por intersección con obstáculos y resguardos. La geometría limita la viabilidad cuando se activa, sin reducir automáticamente los módulos. El ajuste explícito conserva el consumo y disminuye la cobertura objetivo, respetando strings y límites de entrada. Ver [CUBIERTA_2D.md](CUBIERTA_2D.md) para fórmulas, coordenadas y límites. No determina rutas eléctricas ni sombras o estructura.

# Ampliaciones en v1.1

Recurso PVGIS: HSP mes = H(i)_m / días del mes, con plano solicitado y procedencia. El motor aplica su propio PR y potencia; E_m de PVGIS no es la energía final de SOLIS. Ver CATALOGO_Y_RECURSO.md. Si el recurso deja de coincidir con sitio/plano/HSP se avisa y se consideran valores manuales.

Corriente AC de diseño = máximo entre P/(V×cosφ), o P/(√3×VLL×cosφ), y la corriente máxima AC de ficha ingresada.

Comparación: escenarios aislados con el mismo sitio, tarifas y criterios. Sin perfil horario no se presume mayor autoconsumo por batería. Historial local de emisiones resumidas, no copia completa restaurable. Informe A4 con referencias y parámetros documentados.

# Memoria metodológica v1.0

Las fórmulas son de predimensionamiento y no implementan automáticamente la normativa chilena.

## Conversión y demanda

- Consumo diario × 365; consumo mensual × 12; consumo anual sin conversión.
- Sin perfil horario: demanda repartida uniformemente por día en un año no bisiesto.
- Con perfil horario: suma de `load_kwh`; se usan los días y horas reales del año importado.

## Tamaño del generador

`rendimiento específico = Σ HSP × días × PR`.

`kWp objetivo = demanda anual × cobertura / rendimiento específico`.

`módulos objetivo = ceil(kWp objetivo × 1000 / potencia módulo)`.

Con perfil, se usa la suma de POA/1000 como irradiación anual. El tamaño inicial sigue usando PR. La simulación posterior puede cambiar la cobertura; el programa avisa si el objetivo queda por debajo del margen admitido. No itera automáticamente la selección para alcanzar una energía AC exacta después de clipping.

Superficie = módulos × área individual × factor de ocupación. No se evalúan polígonos, retiros, pasillos, orientación, cargas ni sombras entre filas.

## Strings

Los coeficientes se ingresan como %/°C y se dividen entre 100. STC de referencia: 25 °C de célula.

- `Voc frío = Voc STC × (1 + βVoc × (Tmin − 25))`.
- `Vmp frío/calor = Vmp STC × (1 + βVmp × (Tmin/max − 25))`.
- `Voc caliente = Voc STC × (1 + βVoc × (Tmax − 25))`.
- Serie mínima: máximo entre umbral MPPT en Vmp caliente y arranque en Voc caliente.
- Serie máxima: menor de límites de tensión DC absoluta (estricto) y MPPT en Vmp frío.
- Se busca el menor número total igual o superior al objetivo, con todos los strings del mismo largo.
- Se distribuyen strings equilibradamente entre MPPT; se verifica máximo de entradas físicas, corriente de operación y `Isc × factor FV` por MPPT.
- El máximo de potencia FV se comprueba solo si se ingresa distinto de cero.

La comprobación de arranque es estática; no modela arranque a irradiancia baja. No hay múltiples orientaciones por MPPT ni módulos de distinta ficha en un mismo proyecto.

La potencia automática de inversor se elige entre escalones, usando `kWp instalados / ratio DC/AC objetivo`. Todos los límites de entrada son parámetros manuales independientes: **el modelo propuesto por potencia debe comprobarse contra una ficha real**.

## Cables

Corriente AC monofásica: `P / (V × cos φ)`. Trifásica: `P / (√3 × VLL × cos φ)`.

Respaldo: salida monofásica; en una red trifásica se toma `VLN = VLL / √3`.

Resistividad de cobre: `ρT = 0,0175 × [1 + 0,00393 × (Tconductor − 20)]`, Ω·mm²/m.

- DC: caída `2 × L × I × ρT / S`.
- AC monofásica: `2 × L × I × ρT × cos φ / S`.
- AC trifásica: `√3 × L × I × ρT × cos φ / S`.
- Factor térmico: `Iz base × Ftemperatura × Fagrupamiento`.

Se elige la primera sección comercial que satisfaga la caída porcentual, `Iz corregida ≥ I`, y el mínimo de diseño. Tabla comercial de 1,5 a 120 mm². Si no hay solución, no se incorpora ese conductor a materiales.

FV por string, antes de combinación: `I diseño = Isc × factor FV`, caída a Vmp caliente; mínimo inicial 4 mm². No se dimensionan salidas de cajas combinadoras.

La tabla Iz inicial es **ilustrativa y no certificada**. El usuario debe reemplazarla. Los mínimos iniciales de empalme, AC y respaldo son 6, 4 y 2,5 mm², respectivamente, como supuestos editables del modelo; no se presentan como mínimos de norma.

La selección no contempla reactancia, corto, capacidad de ruptura, protección contra sobrecarga, coordinación, armónicos, neutrales desequilibrados, PE, caída acumulada, terminales ni otros factores particulares. No se selecciona una protección nominal por cada cable.

## Simulación de una hora

1. Potencia DC = kWp × POA/1000 × máximo(0, 1 + coeficiente potencia × (Tcélula − 25)) × factores DC.
2. Potencia potencial AC = DC × eficiencia inversor constante.
3. Potencia AC limitada a kW nominales del inversor y reducida por pérdida AC.
4. Autoconsumo directo = mínimo entre AC y demanda.
5. Excedente a carga de batería hasta límites de potencia y energía; remanente exportado.
6. Déficit cubierto con descarga hasta límites de potencia y energía; remanente comprado a red.

Intervalo fijo de una hora: kW medios se convierten en kWh multiplicando por una hora. Capacidad utilizable = nominal × DoD; eficiencia por sentido = raíz de la eficiencia de ciclo. SOC inicial vacío. No se incorpora energía final almacenada a ahorro. No incluye degradación cíclica, temperatura de batería, límites de tensión DC, eficiencia parcial ni reserva de emergencia; es un equivalente AC simplificado.

El factor de sombras es uniforme. No hay trazado geométrico, bypass ni pérdidas por orientación (POA ya debe reflejarla). No se modelan irradiancia bifacial, espectro, respuesta angular ni inversor por curva.

## Lista de materiales

Metraje = ceil(ruta de ida × conductores × circuitos × 1,10).

- Empalme y circuito AC: 3 conductores monofásicos o 5 trifásicos, incluido PE presupuestario.
- Respaldo monofásico: 3 conductores.
- FV: 2 conductores por string, sin conductor de equipotencialidad incluido.
- Conectores: 2 pares por string, supuesto de extremos, sujeto a diseño de montaje.
- Estructuras: un kit presupuestario por módulo, sin cálculo mecánico.

## Economía

Autoconsumo sin perfil: `min(producción × porcentaje, demanda anual)`; con perfil: suma de coincidencias y batería. Ahorro bruto = kWh autoconsumidos × tarifa de compra + kWh exportados × tarifa de venta. Ahorro neto = bruto − mantención.

Inversión = suma exacta de cantidades × precios por partida. El precio individual de materiales prevalece sobre el costo base de referencia.

Cada año aplica degradación de energía y variación de tarifas. Con perfil horario se conservan las proporciones de autoconsumo/exportación del primer año y se escalan por degradación, sin repetir el despacho. VAN con tasa anual ingresada. El retorno simple interpola el primer flujo acumulado no negativo.

No incluye impuestos, deuda, reemplazo de batería/inversor, incertidumbre meteorológica, P50/P90, escalamiento de mantención ni detalle por horario tarifario.

## Trazabilidad

JSON con esquema `solis-fv-project/v1`, versión del motor, fecha de exportación, entradas y perfil completo si existe. Excel con resumen, materiales, conductores, meses, flujo de caja, parámetros y alertas. El informe imprimible incluye entradas y estado de validación, pero no 8760 filas; el JSON conserva ese detalle. Fórmulas disponibles también dentro de la aplicación.
