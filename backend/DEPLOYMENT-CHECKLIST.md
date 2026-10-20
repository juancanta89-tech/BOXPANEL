# BOXPANEL: despliegue seguro (pendiente)

El código está en GitHub, pero **NO** se ha desplegado el Worker, D1 ni R2.

## Requisitos
- Cloudflare Workers y D1 en la cuenta del propietario.
- R2 bucket privado `boxpanel-ads`.
- Cloudflare Zero Trust Access configurado para proteger el Worker y emitir JWT.
- Dominio de equipo y audiencia de Access correctos en `wrangler.toml`.
- Sustituir `REPLACE_WITH_D1_DATABASE_ID` por el ID real de D1.
- Configurar el origen público permitido, sin comodín `*`.

## Orden de migraciones
1. `backend/schema.sql`
2. `backend/schema-v2.sql`
3. `backend/reseller-limits.sql`

No ejecutar estas migraciones sobre datos existentes sin una copia de seguridad y revisión previa.

## Identidades
La tabla `panel_accounts` requiere registros asociados a `access_identity` (claim `sub` de un JWT **verificado**). La cuenta superadministradora debe asignarse explícitamente después de comprobar la identidad del propietario. No habilitar creación pública de administradores ni incluir tokens de acceso en GitHub.

## Pruebas obligatorias antes de abrir a clientes
- Sin JWT válido: HTTP 401.
- Reseller que intenta consultar otro `reseller_id`: HTTP 403.
- Reseller suspendido: HTTP 403.
- Reseller que accede a rutas `/api/master/`: HTTP 403.
- Superadmin que accede a rutas `/api/master/`: éxito.
- Noveno ADS y cuarto DNS: rechazo desde D1.
- Imagen de más de 5 MB o firma falsa: rechazo.
- R2 no debe tener acceso público sin controles.
- Probar creación y eliminación de anuncios, DNS, y limpieza de objetos R2.
- Revisar que la API responda con CORS solo al origen autorizado.

## Bloqueadores conocidos
- El conector Cloudflare actual solo tiene permisos de lectura; no permite crear D1, R2 ni desplegar Worker.
- Las interfaces HTML todavía funcionan como demos locales y no consumen esta API.
- Falta implementar el flujo de inicio de sesión del navegador con Access y validar el esquema completo mediante pruebas reales.
- No anunciar el sistema como listo para producción antes de verificar los controles.
