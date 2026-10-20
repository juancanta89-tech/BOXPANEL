# BOXPANEL — panel maestro y resellers

## Reglas aprobadas
- BOXPANEL es la marca única de todos los paneles web.
- Cada reseller accede mediante cuenta individual a su espacio BOXPANEL.
- Solo la **app entregada** admite nombre y logo personalizados.
- El propietario es el único super_admin; tiene visibilidad y control global.
- Cada reseller solo puede ver sus clientes, apps asignadas, operaciones y saldo.

## Seguridad obligatoria antes del lanzamiento
1. Cloudflare Access valida identidad; la API verifica firma, issuer, audience y expiración de cada JWT.
2. Identidad autenticada se resuelve en panel_accounts en el servidor. **Nunca** confiar en reseller_id o role enviados por navegador.
3. Toda consulta del reseller filtra reseller_id desde la sesión verificada. Los endpoints super_admin se autorizan explícitamente.
4. Los créditos se actualizan en una transacción atómica con registro inmutable de la operación; evitar balances negativos y doble cargo.
5. Registrar modificaciones administrativas en audit_events; nunca guardar contraseñas o tokens en esos registros.
6. La personalización de logo/nombre afecta exclusivamente reseller_apps, no la interfaz de BOXPANEL.
7. Los enlaces y paquetes de aplicaciones requieren revisión de permisos de distribución y controles de subida.
8. Suspensiones, permisos y operaciones sensibles deben ser auditables y comprobados con pruebas de aislamiento.

## Estado
Migración SQL de diseño creada; aún no ejecutada en D1. Endpoints de resellers y panel maestro aún no implementados ni desplegados. No usar en producción hasta completar autenticación, autorización, pruebas y despliegue.
