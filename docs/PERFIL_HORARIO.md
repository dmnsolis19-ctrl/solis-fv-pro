# Perfil horario de energía y recurso

El CSV debe tener exactamente este encabezado y un año calendario completo UTC. Se admiten 8760 horas para un año común y 8784 para un año bisiesto.

```csv
timestamp,poa_wm2,cell_temp_c,load_kwh
2025-01-01T00:00:00.000Z,0,18,0.3
2025-01-01T01:00:00.000Z,0,17,0.25
```

El fragmento anterior solo muestra el formato y no es un perfil completo importable.

| Columna | Unidad y significado | Validación |
| --- | --- | --- |
| timestamp | Inicio del intervalo de una hora, en UTC | ISO 8601 terminado en `Z`, continuo desde 1 enero 00:00 hasta 31 diciembre 23:00 |
| poa_wm2 | Irradiancia media del intervalo en el plano del módulo, W/m² | 0–1600 |
| cell_temp_c | Temperatura media de célula del intervalo, °C | −70–100 |
| load_kwh | Energía consumida durante el intervalo de una hora, kWh | 0–1.000.000 |

El archivo debe tener consumo e irradiancia anuales positivos. No se aceptan vacíos, duplicados, saltos de hora, NaN ni Infinity. Tamaño máximo: 3 MB. Se admite `;` como separador con coma decimal. No se admiten zonas horarias locales ni cambios de horario de verano: conviértelos a UTC antes de importar.

**POA no es irradiancia horizontal.** Debe provenir de una fuente o cálculo que ya considere ubicación, inclinación, azimut y transposición al plano elegido. **Temperatura de célula no es temperatura ambiente.** Esta versión no realiza esa conversión térmica. El método de obtención de ambos debe registrarse en la documentación del proyecto.

El consumo anual mostrado y el recurso para dimensionar provienen del CSV cuando existe un perfil importado. El PR continúa usándose solo para calcular el tamaño inicial. La simulación usa por separado la temperatura y las pérdidas desglosadas, evitando multiplicar de nuevo por PR.

El banco se dimensiona a partir de la carga crítica, autonomía y capacidad nominal por módulo. El despacho horario representa una batería equivalente acoplada en AC, con autoconsumo prioritario, potencia simétrica y SOC inicial vacío. No es un modelo validado del híbrido de una marca.

Balances comprobados por pruebas:

- Demanda = autoconsumo directo y desde batería + compras a red.
- Producción AC = autoconsumo + excedentes + pérdidas de batería + energía final almacenada.
- Producción potencial AC = producción AC + clipping.

La plantilla descargable tiene irradiancia y consumo en cero: complétala con datos válidos. No es un año meteorológico de referencia ni un ejemplo de generación real.
