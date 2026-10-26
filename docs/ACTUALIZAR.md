# Actualizar a SOLIS FV Pro 1.2.0

## Desde GitHub Desktop

1. Antes de actualizar, exporta tus proyectos en JSON desde la aplicación.
2. Descomprime el nuevo ZIP. Dentro encontrarás `solis-fv-pro`.
3. En GitHub Desktop selecciona el repositorio existente y **Repository → Show in Explorer**.
4. Copia el contenido de la nueva carpeta `solis-fv-pro` dentro de tu repositorio. Reemplaza los archivos con el mismo nombre. Conserva la carpeta `.git` de tu repositorio.
5. Comprueba que `package.json`, `public`, `server`, `functions` y `wrangler.jsonc` estén directamente en la raíz, sin otra carpeta intermedia.
6. En **Changes**, escribe `Actualizar SOLIS FV Pro a 1.2.0`, pulsa **Commit to main** y después **Push origin**.

No crees otro repositorio si ya subiste la versión anterior. No copies el ZIP como sustituto del código.

## Cloudflare Pages desde GitHub

| Campo | Valor |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Vacío si el código está en la raíz |
| Rama de producción | `main` |
| Node | 22 o superior |

La carpeta `functions/api/solar.js` expone `/api/solar`. Importa el manejador compartido de `server`. Deben subirse **ambas carpetas**; no basta con publicar `dist`.

`wrangler.jsonc` es la configuración de Pages. `wrangler.worker.jsonc` es la configuración alternativa de Workers, con Static Assets y binding `ASSETS`. No los intercambies.

Para Workers, la secuencia alternativa es:

```bash
npm run build
npx wrangler deploy --config wrangler.worker.jsonc
```

No uses `npx wrangler deploy` sin indicar esa configuración al elegir Workers. No necesitas D1/R2 ni secretos para esta actualización.

## Validación después de publicar

1. Confirma que la interfaz muestre **v1.2.0**.
2. Abre **Ubicación y recurso**, verifica las coordenadas del sitio, inclinación y azimut y pulsa **Consultar recurso PVGIS**.
3. Una respuesta correcta mostrará PVGIS-ERA5, período disponible, fecha de consulta y 12 HSP mensuales. La cobertura de cada coordenada la determina el proveedor.
4. Selecciona un módulo e inversor desde **Catálogo técnico** y revisa las alertas.
5. Abre **Cubierta 2D**, comprueba las dimensiones reales y activa la verificación. Añade un obstáculo, edita su posición, excluye/restaura una celda y exporta SVG/Excel. Confirma que la cantidad del plano y materiales coincida tras un ajuste explícito de cobertura.
6. Abre **Comparar diseños** y comprueba cada alternativa.
7. En **Informe y revisiones**, completa empresa, responsable, revisor, código y revisión; carga el logo, guarda y abre la vista previa.
8. En imprimir, selecciona **Guardar como PDF**, papel A4 y activa gráficos de fondo si quieres conservar los colores. El informe usa orientación vertical.

## Si PVGIS no responde

La consulta está implementada mediante servidor y comprobada con respuestas controladas. El acceso real al proveedor no pudo verificarse desde el entorno de desarrollo porque su salida de red está restringida. Verifica esta función después de publicar.

- **404 o HTML en `/api/solar`:** revisa que subiste `functions` y `server`, y que desplegaste mediante Git/Pages Functions o la configuración Worker indicada.
- **502:** el proveedor no respondió, rechazó la solicitud o devolvió datos no compatibles. Se conservan las HSP anteriores. No se genera meteorología de sustitución.
- **429:** espera y vuelve a consultar; no hay bucle automático de reintentos.
- **Respuesta válida de otro sitio/plano:** se rechaza. Repite la solicitud con los parámetros actuales.

Alternativa manual: **Abrir solicitud PVGIS**, guardar su JSON y usar **Importar respuesta JSON PVGIS**. Debe ser la respuesta original de la solicitud mostrada. El programa comprueba ubicación y plano; no convierte cualquier JSON meteorológico.

## Compatibilidad y datos

Se conservan las claves de almacenamiento local de v1.0 y el esquema JSON `solis-fv-project/v1`. Las entradas antiguas reciben los nuevos valores por defecto al abrirlas. Mantén el mismo dominio y navegador para conservar los proyectos locales.

El historial registra **emisiones resumidas**, no copias completas restaurables. Para conservar cada revisión completa, exporta un JSON por revisión. El programa no incorpora usuarios, sincronización ni firma digital.
