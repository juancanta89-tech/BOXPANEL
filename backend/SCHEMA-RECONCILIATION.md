# Conservación del esquema y los datos existentes

La versión previa documentó tablas manuales con IDs INTEGER y columnas `name`, `dns_url` o `image_key`. Otros scripts asumían IDs TEXT y otras columnas. `CREATE TABLE IF NOT EXISTS` no resuelve esa diferencia.

La API recuperada usa `bp_resellers`, `bp_panel_accounts`, `bp_dns`, `bp_ads`, `bp_storage`, `bp_products` y `bp_audit_events`. La migración `migrations/0001_boxpanel.sql` crea ese espacio sin tocar las tablas antiguas. Una prueba local confirma que las tablas incompatibles y sus filas se conservan.

**No es una importación automática.** Antes de activar el panel, exportar la D1 y obtener definiciones/recuentos. Si hay datos reales, preparar la importación en una copia, conservar IDs como TEXT o mediante correspondencias, comprobar todas las relaciones, contenidos y propietarios. Una ruta de imagen antigua sin bytes no equivale a un anuncio recuperado. Vincular únicamente subjects Access verificados; no inventarlos a partir de nombres o correos.

Aplicar únicamente la importación revisada y verificarla remotamente antes de abrir a clientes. La API nueva no muestra registros de las tablas antiguas. Los scripts `schema*.sql` y `reseller-limits.sql` quedan como antecedentes y no se ejecutan como instalación de esta API.
