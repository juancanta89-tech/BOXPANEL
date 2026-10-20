# BOXPANEL API 1.0 — código preparado, pendiente de activación

Worker ESM + D1, con páginas y API en el mismo origen. Cloudflare Access autentica; la API verifica firma RSA, issuer, audiencia, fechas y subject. La cuenta, rol y reseller se resuelven en el servidor mediante `bp_panel_accounts`.

## Rutas

| Ruta | Permiso |
|---|---|
| GET /health | Disponibilidad del Worker; no prueba la base |
| GET /api/products | Solo productos publicados |
| GET /api/identity | Subject verificado; no crea una cuenta |
| GET /api/session, /api/login | Cuenta activa; login redirige según rol |
| GET/POST /api/master/resellers | Propietario |
| PUT /api/master/resellers/:id/status o /account | Propietario |
| GET/POST/PUT/DELETE /api/admin/products[/id] | Propietario |
| GET/POST/PUT/DELETE /api/reseller/dns[/id] | Reseller propio; propietario con reseller_id |
| GET/POST/DELETE /api/reseller/ads[/id] | Reseller propio; propietario con reseller_id |

Las escrituras requieren `X-Boxpanel-Request: 1` y un origen permitido. Los cambios y la auditoría se guardan juntos mediante batch transaccional de D1. Las cuotas se aplican en la base, incluso si se omite la interfaz.

## Imágenes sin R2

El móvil admite imágenes originales JPG/PNG/WebP de hasta 5 MiB y las optimiza antes de enviarlas. La API recibe un máximo de 256 KiB por imagen, valida tipo, firma y tamaño, y guarda un BLOB privado en D1. Un contador transaccional limita el conjunto de imágenes a 128 MiB. Borrar libera los bytes en la misma operación.

`ADS_STORAGE_ENABLED=false` inicialmente. Antes de habilitar, comprobar el plan gratuito real y el consumo total de la cuenta. Estos límites no cambian un plan de pago ni garantizan ausencia de cargos si la cuenta ya es de pago. No se activa R2 ni ninguna suscripción.

Se verifican firmas de contenedor, no se anuncia transcodificación o análisis antivirus del lado del servidor. No se acepta SVG/HTML y las respuestas llevan `nosniff`.

## Esquema

`migrations/0001_boxpanel.sql` es la única migración vigente de esta API. Crea tablas `bp_*` sin tocar tablas antiguas incompatibles. Los scripts `schema*.sql` y `reseller-limits.sql` son históricos. Si hay registros reales antiguos, necesitan una importación revisada antes del lanzamiento: no aparecen automáticamente en el panel nuevo.

El alcance reseller aprobado es ADS y DNS. No se implementan cobros, créditos, creación de clientes ni generación de APK en esta versión. El saldo reservado en el esquema no es un sistema de cobro.

Leer [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) antes de activar.
