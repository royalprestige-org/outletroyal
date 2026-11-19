# Royal Prestige Outlet — Estado de migración (2026-11-19)

## Destinos confirmados
- GitHub: royalprestige-org/outletroyal.
- Producción actual (NO modificar sin QA): rama main (contiene README; no fuente funcional).
- Referencia inmutable: referencia/sites-v13 @ d51e490cada250d18afea42a733fd21af75557af.
- Candidata: migracion/vercel-supabase-20261119.
- Supabase: fctfjwsbdwyyyguiaowe, organización ipmeqoctwlstruexyacm, us-west-1.
- URL indicada por propietario: https://outletroyal.vercel.app/. No verificada desde la cuenta Vercel tmmxbs.

## Base de datos
- Tablas: products, product_components, product_photos, offers, offer_items, appointments,
  appointment_slots, appointment_referrals, admin_users.
- 140 productos, 149 componentes, 140 garantías y 1 referencia fotográfica importados.
- Ofertas y citas: vacías, sin datos operativos que migrar en este repositorio.
- Policies RLS: tablas privadas, sin permiso directo a anon/authenticated. Acceso de servidor mediante DATABASE_URL.
- Bucket Storage privado: product-photos. Es obligatorio configurar SUPABASE_SECRET_KEY solo en entorno servidor.
- Los avisos RLS habilitado sin política son intencionales en esta arquitectura server-only.
- Indices FK añadidos tras revisión de performance.

## Riesgos encontrados y remediaciones
1. Sites v13 usaba D1 SQLite y Cloudflare R2. Se construyó un adaptador para PostgreSQL y Storage.
2. Sites v13 usaba encabezados de sesión exclusivos de Sites. Ahora las rutas admin exigen sesión Supabase Auth verificada y un registro activo en public.admin_users.
3. La referencia /chef-assist.webp no venía dentro del árbol GitHub. Su metadato se conserva; la imagen real está pendiente.
4. La campaña Outlet tiene vigencia de 17 de noviembre al 1 de diciembre de 2026 (fin exclusivo 2 de diciembre). No extender automáticamente.
5. Los cálculos originales de precio, regalos y financiamiento deben validarse con pruebas E2E antes del release.
6. El código de referencia no contenía lockfile. Generar y fijar uno con pnpm durante la validación del build.
7. Publicar app en main antes de completar QA sería prematuro.

## Configuración pendiente en Vercel
- Vincular la cuenta Vercel propietaria al entorno de trabajo.
- Confirmar que GitHub source sea royalprestige-org/outletroyal, rama de producción main.
- Configurar DATABASE_URL como secreto en Vercel (pooler de Supabase, TLS).
- Configurar NEXT_PUBLIC_SUPABASE_URL: https://fctfjwsbdwyyyguiaowe.supabase.co
- Configurar NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (clave publicable).
- Configurar SUPABASE_SECRET_KEY (clave secreta, jamás NEXT_PUBLIC).
- Crear en Auth un usuario administrativo verificado e insertar su UUID en public.admin_users con role=admin.
- Revisar pnpm install, typecheck, lint, next build y E2E en una preview.
- No realizar merge a main ni promover a producción hasta completar lo anterior.

## Operación
- npm/pnpm script db:seed importa SOLO si products está vacía. NO se ejecuta en cada arranque.
- La DB actual ya fue poblada y verificada desde los datos originales, por lo que NO debe ejecutarse de nuevo.
- No hay datos de citas ni descuentos personalizados importados desde una base externa de Sites; solo existe snapshot fuente del catálogo.

## QA previo al release
- Vitrina: carga 140 artículos, búsquedas, familias y modal.
- Modos Normal/Outlet: diferencias de precio y exclusión de regalos.
- Citas: mantener apartados y exclusión por horario bajo concurrencia.
- Fotos: carga/consulta/borrado con Storage privado (JPG, PNG, WebP, 8 MB, hasta 5 por SKU).
- Administrador: usuarios no autorizados reciben 401 en API y no acceden a panel.
- Eliminar URLs y credenciales exclusivas de Sites. Revisar enlaces rotos.
