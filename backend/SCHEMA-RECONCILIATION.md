# BOXPANEL — reconciliación de esquema antes de producción

**No ejecutar `schema-v2.sql` ni `schema-ads-dns.sql` directamente sobre la D1 existente sin inspeccionar las columnas.**

La base `boxpanel-db` ya contiene tablas creadas manualmente:
- `resellers`: `id INTEGER PRIMARY KEY`, `name`, `email`, `status`, `created_at`.
- `reseller_ads`: `id INTEGER PRIMARY KEY`, `reseller_id INTEGER`, `title`, `image_key`, `created_at`.
- `reseller_dns`: `id INTEGER PRIMARY KEY`, `reseller_id INTEGER`, `title`, `dns_url`, `created_at`.

El backend usa UUID TEXT y espera `username`, `display_name`, `credit_balance`, `server_url`, `mime_type`, `r2_object_key`. Los `CREATE TABLE IF NOT EXISTS` anteriores **no transforman tablas existentes**.

## Diagnóstico no destructivo (Cloudflare D1 Console)

```sql
SELECT name,sql FROM sqlite_master
WHERE type IN ('table','trigger')
AND name IN ('resellers','reseller_ads','reseller_dns','ads_quota_insert','dns_quota_insert');
```

## Antes de cualquier migración

1. Exportar/copia de seguridad D1.
2. Confirmar si las tablas contienen registros de usuarios reales.
3. Preparar migración transaccional de datos que preserve identificadores y referencias.
4. Verificar claves foráneas, cuotas y consultas del Worker.
5. No desplegar endpoints administrativos sin Cloudflare Access y registro explícito de superadmin.
6. No activar R2 ni otra suscripción de pago por consumo.

El sistema NO está listo para producción hasta cumplir estas condiciones.
