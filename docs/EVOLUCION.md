# Evolución hacia una suite de simulación FV

La versión 1.3 añade unifilar conceptual, registros de revisión y validaciones antes de publicar. La versión 1.2 añadió cubierta rectangular 2D con obstáculos, pasillos, exclusiones, comprobación de capacidad y exportaciones. La versión 1.1 incorporó consulta PVGIS por servidor, catálogo inicial con fichas oficiales, comparación e informe. El acceso externo real debe verificarse al publicar. Sigue siendo un motor de predimensionamiento con modelo horario importado. Para acercarse a una suite como PV*SOL se necesita desarrollar y validar etapas adicionales:

| Etapa | Alcance | Datos y verificación necesarios |
| --- | --- | --- |
| 1 · Recurso por coordenadas (consulta implementada en 1.1) | Fuente meteorológica, histórico de procedencia, inclinación, azimut y transposición a POA; modelo de temperatura de célula | API autorizada, cobertura regional, licencias, límites de uso y comparación con datos de referencia |
| 2 · Catálogo técnico (selección inicial en 1.1) | Módulos e inversores reales, curvas, certificaciones y batería/BMS | Fichas verificadas y versionadas; no rellenar catálogos con datos inventados |
| 3 · Diseño de cubierta (base 2D rectangular en 1.2) | Pendiente: polígonos, múltiples aguas/orientaciones, mezcla de módulos y optimización global | Geometría, dimensiones, coordenadas y criterios constructivos |
| 4 · Sombras | Horizonte, sombras cercanas 3D, filas, bypass y asignación por MPPT | Motor geométrico y comparación de pérdidas con casos patrón |
| 5 · Modelo eléctrico detallado | Curvas I–V, inversor por carga, limitación de inyección, varios MPPT con subcampos distintos | Bibliotecas físicas y validación contra medición y fichas |
| 6 · Ingeniería eléctrica (unifilar conceptual y revisión en 1.3) | Tabla térmica por método, corto, protecciones y selectividad, PE y unifilar editable | Normativa vigente, esquemas de tierra, Icc de red y revisión de instalador competente |
| 7 · Plataforma multiusuario | Usuarios, empresas, roles, sincronización y respaldos | Cloudflare Workers + D1/R2, autenticación, aislamiento por empresa y política de recuperación |
| 8 · Finanzas avanzadas | Tarifas horarias, reposición, impuestos, financiamiento y sensibilidades | Modelo de negocio, tarifas verificadas, datos de costos y pruebas de escenarios |

Orden recomendado: recurso meteorológico y catálogo técnico primero, luego geometría/sombras y modelo eléctrico detallado. La sincronización de proyectos se puede desarrollar en paralelo si el negocio requiere varios usuarios. Esta versión ya permite reemplazar el motor sin rehacer toda la interfaz gracias a su separación de módulos.


Prioridades para robustez operativa: copias completas restaurables por revisión; detección de pérdida/corrupción del guardado; pruebas del recurso solar tras publicar; autenticación y aislamiento por empresa solo cuando exista necesidad multiusuario. El historial actual sigue siendo resumido, no un archivo de revisiones completas recuperables.
