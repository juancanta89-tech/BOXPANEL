# BOXPANEL

Panel maestro y panel reseller, con marca BOXPANEL compartida. El espacio reseller contiene únicamente **anuncios (máximo 8)** y **DNS (máximo 3)**. El propietario puede crear/suspender resellers, vincular identidades y gestionar el catálogo.

## Estado real — 20 de octubre de 2026

Código preparado para Cloudflare Workers + D1, con interfaz conectada a la API. **Todavía no activado en producción.** El Worker `boxpanel-api` no aparece entre los Workers publicados. La conexión disponible de Cloudflare es de solo lectura. El diagnóstico remoto de GitHub más reciente falló porque el secreto tiene formato inválido; no llegó a leer las tablas.

Los cambios de esta versión eliminan el uso de datos demo en los paneles principales. No se han cambiado datos remotos, creado suscripciones, activado R2 ni modificado otros proyectos.

## Uso previsto

- `index.html`: catálogo de productos publicados, sin ejemplos fingidos cuando falla la API.
- `master.html`: resellers, accesos y productos; el servidor exige superadministrador.
- `reseller.html`: anuncios y DNS del reseller autenticado. El administrador puede seleccionar un reseller.
- `conexion.html`: configuración, inicio de sesión y consulta del identificador verificado.
- Los formularios tienen **Regresar sin guardar**. Las escrituras se envían únicamente al confirmar.

El panel y la API se empaquetan en el mismo Worker para evitar depender de cookies de terceros. El catálogo público existente de GitHub Pages puede mantenerse, pero necesita una API configurada para consultar datos. Los paneles locales requieren un servidor HTTP y una API activa; abrir el HTML como archivo no establece una sesión de Cloudflare Access.

## Validación

Node >=22.13:

```sh
cd backend
npm ci
npm run check
npm test
npm run assets
npx wrangler deploy --dry-run --outdir /tmp/boxpanel-build
```

Las 19 pruebas principales usan JWT RSA firmados y SQLite real detrás de un adaptador D1. Una prueba de integración adicional ejecuta el Worker empaquetado en workerd/Miniflare con D1 local y verifica sesión, imágenes BLOB, cuotas y rollback. Se comprueban permisos, aislamiento, almacenamiento, auditoría y publicación de productos. No sustituyen las pruebas de Access/D1 publicados ni las de navegación y subida de imágenes en un celular real.

Consultar [backend/DEPLOYMENT-CHECKLIST.md](backend/DEPLOYMENT-CHECKLIST.md) para activar el sistema. No se debe marcar como listo para clientes hasta completar ese procedimiento.
