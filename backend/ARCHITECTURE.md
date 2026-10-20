# Arquitectura vigente

- Marca BOXPANEL en todos los paneles web. La app entregada puede llevar la identidad del reseller.
- Reseller: ADS y DNS. Propietario: gestión global de resellers y productos.
- Páginas y API en el mismo Worker. Access autentica; la API verifica JWT y consulta la cuenta activa en D1.
- Rol/propietario se resuelven en servidor. Solo el propietario puede seleccionar otro reseller.
- Cuotas mediante triggers, auditoría y cambios en un batch transaccional. Imágenes como BLOB privados en D1, sin R2.
- Tablas bp_* aditivas; tablas manuales antiguas preservadas. Importación revisada si existen datos reales.
- Backend todavía no publicado. Las pruebas locales no equivalen a Access/D1 configurados ni a pruebas en un móvil real.
