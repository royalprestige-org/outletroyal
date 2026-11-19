# Outlet Royal

Migración de Cocina Outlet a Next.js, Vercel y Supabase.

Estado: preparación; aún no conectado a Vercel ni Supabase. El sitio de Sites sigue siendo producción.

Origen: Site appgprj_6ab8cf59305c8191beca00586c9eaba7, versión 13, commit 191d9cfdf4debfd63fcdc876005bb99d33e32291.

No importar datos de clientes, citas, referidos, secretos ni respaldos a este repositorio público.

## Pendientes de infraestructura

Conectar las cuentas dedicadas de Supabase y Vercel de tmmxbs@gmail.com. Definir el proyecto Supabase y equipo Vercel antes de provisionar recursos.

## Plan de migración

1. Conservar una base de código de Sites en una rama de referencia, excluyendo secretos y datos privados.
2. Adaptar la aplicación a Next.js y sustituir D1/R2 por Postgres/Storage.
3. Sustituir la identidad de Sites por Supabase Auth y autorización de administrador.
4. Migrar el catálogo vivo, componentes, fotografías y ofertas; verificar precios y cantidades contra origen.
5. Migrar citas y referencias por un canal privado, sin GitHub.
6. Probar modo normal/Outlet, regalos, pagos, WhatsApp, reservas de 60 minutos y carga de fotos.
7. Desplegar, validar y entregar el nuevo enlace; conservar Sites como retorno mientras se comprueba la migración.
