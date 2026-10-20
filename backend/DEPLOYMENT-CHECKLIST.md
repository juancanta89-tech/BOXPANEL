# BOXPANEL — activación todavía pendiente

## Bloqueadores observados el 20/10/2026

- La conexión Cloudflare disponible es de solo lectura. `boxpanel-api` no figura entre los Workers publicados.
- GitHub Actions run `39490749901` falló por formato inválido de `BOXPANEL_CLOUDFLARE_API_TOKEN` en el entorno `boxpanel-production`. El diagnóstico no llegó a consultar las tablas. No se ha leído ni modificado ese secreto.
- `ACCESS_TEAM_DOMAIN` y `ACCESS_AUD` siguen con placeholders.
- La D1 existe, pero no se ha verificado su esquema/contenido actual mediante consulta. El contador de tablas en una lista de bases no prueba que esté vacía.
- Falta registrar al propietario verificado, revisar datos antiguos y probar en producción y celular.

## Procedimiento de activación

1. Corregir el secreto en GitHub Settings → Environments → boxpanel-production. Debe contener solo el token generado por Cloudflare, sin `Bearer`, JSON, comillas ni espacios. No enviarlo por conversación. Mantener objetivos restringidos al Worker `boxpanel-api`, la cuenta y D1 fijas del contrato de seguridad.
2. Ejecutar el diagnóstico de solo lectura y exportar D1 antes de cualquier cambio. Inspeccionar definiciones/recuentos sin publicar datos personales.
3. Revisar `migrations/0001_boxpanel.sql`. Es aditiva y conserva tablas antiguas, pero no importa sus registros. Si existen datos reales, preparar y comprobar una importación explícita conservando relaciones e identificadores. No ejecutar los antiguos `schema*.sql` o `reseller-limits.sql` como instalación.
4. Tras la revisión/autorización de la migración, aplicar con Wrangler D1 migrations exclusivamente sobre la base fijada.
5. Configurar Cloudflare Access en el hostname de BOXPANEL para `/api/*`. Para catálogo público, usar una excepción exacta para `/api/products`, nunca para rutas administrativas. Autorizar únicamente identidades previstas, impedir eludir Access por otro hostname y configurar equipo/audiencia reales en Wrangler. La API también verifica cada JWT.
6. Iniciar sesión y consultar `/api/identity`. Verificar que su subject corresponde al propietario. Generar SQL con `node scripts/owner-sql.mjs '<sub-verificado>'`, revisarlo y ejecutarlo sobre la D1 correcta. No usar email como sustituto del subject. La base admite un único superadministrador.
7. Comprobar el plan gratuito real de Workers y D1 y el consumo/capacidad de la cuenta antes de habilitar `ADS_STORAGE_ENABLED=true`. No activar R2 ni planes de pago. Mantener `ALLOW_HTTP_DNS=false` salvo autorización explícita de servidores HTTP.
8. Ejecutar checks, pruebas y empaquetado. El workflow de producción sigue bloqueado por los placeholders y por la falta de `.production-ready`. No crear ese marcador solo para silenciar controles: registrar primero migración, Access, identidad y plan verificados. Ejecutar únicamente el despliegue manual revisado de BOXPANEL.
9. Probar en el hostname del servicio: login/cierre, propietario y dos resellers, suspensión, acceso cruzado denegado, octavo/noveno anuncio, tercer/cuarto DNS, edición/eliminación y persistencia tras recargar. En Samsung Android verificar navegación, regreso sin guardar, selección/compresión de imágenes y recuperación de errores.
10. Registrar commit desplegado, respaldo, Access y resultados remotos. Solo entonces abrir a clientes.

Durante la recuperación no se publicaron Workers, modificaron secretos, ejecutaron migraciones remotas ni alteró SNAPTVNOW.
