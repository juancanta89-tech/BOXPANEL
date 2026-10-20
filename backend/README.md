# BOXPANEL API — preparación

Backend real con Cloudflare Worker + D1 y verificación criptográfica del JWT de Cloudflare Access.

## Configuración (no desplegado)
1. Crear base D1 `boxpanel-db` en Cloudflare y ejecutar `schema.sql`.
2. Sustituir `database_id` en `wrangler.toml`.
3. Configurar aplicación Cloudflare Access para proteger la API administrativa y restringir acceso a las identidades autorizadas.
4. Establecer `ACCESS_TEAM_DOMAIN` y `ACCESS_AUD` con los valores reales de Access.
5. Desplegar el Worker mediante Cloudflare y configurar su ruta.
6. Comprobar que /api/admin/products devuelve 401 sin token, que un usuario autorizado puede editar y que /api/products solo devuelve productos publicados.

**Importante:** GitHub Pages no protege rutas privadas. El panel definitivo debe servirse detrás de Cloudflare Access en un dominio protegido, no como formulario público con contraseña en JavaScript. No almacenar secretos en GitHub. No activar en producción hasta completar la configuración y las pruebas de permisos.
