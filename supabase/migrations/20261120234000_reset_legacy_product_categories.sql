-- Limpieza solicitada de todas las categorías históricas de productos.
-- Se conserva respaldo PRIVADO para revertir; no se cambia family, kind ni is_kitchen_set.
create table if not exists public.catalog_category_reset_archive (
 product_id text primary key references public.products(id) on delete cascade,
 legacy_category text not null,
 archived_at timestamptz not null default now()
);
alter table public.catalog_category_reset_archive enable row level security;
revoke all on public.catalog_category_reset_archive from public,anon,authenticated;
grant all on public.catalog_category_reset_archive to service_role;
insert into public.catalog_category_reset_archive(product_id,legacy_category)
 select id,category from public.products where category<>''
 on conflict(product_id) do nothing;
-- Si hubo nuevas asignaciones por ID en el ínterin, no se modifican.
update public.products set category='' where category<>'';
