-- Jerarquía de categorías administrable (aplicada a Supabase como catalog_taxonomy_v1_20261120).
-- Mantiene family y kind/is_kitchen_set de los productos existentes.
create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 90),
  created_at timestamptz not null default now()
);
create unique index if not exists catalog_categories_name_uniq on public.catalog_categories (lower(btrim(name)));
create table if not exists public.catalog_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.catalog_categories(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 90),
  created_at timestamptz not null default now(),
  constraint catalog_subcategories_category_id_id_unique unique(category_id,id)
);
create unique index if not exists catalog_subcategories_name_uniq on public.catalog_subcategories (category_id,lower(btrim(name)));
create index if not exists catalog_subcategories_category_idx on public.catalog_subcategories(category_id);
alter table public.products
 add column if not exists category_id uuid references public.catalog_categories(id) on delete set null,
 add column if not exists subcategory_id uuid references public.catalog_subcategories(id) on delete set null;
alter table public.products add constraint products_subcategory_requires_category check(subcategory_id is null or category_id is not null);
alter table public.products add constraint products_subcategory_belongs_to_category foreign key(category_id,subcategory_id)
 references public.catalog_subcategories(category_id,id) on delete set null (subcategory_id);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_subcategory_id_idx on public.products(subcategory_id);
alter table public.catalog_categories enable row level security;
alter table public.catalog_subcategories enable row level security;
revoke all on public.catalog_categories, public.catalog_subcategories from public,anon,authenticated;
grant all on public.catalog_categories, public.catalog_subcategories to service_role;
-- Única lista inicial recibida: Filtración (Agua, Aire).
insert into public.catalog_categories(name) values ('Filtración') on conflict do nothing;
insert into public.catalog_subcategories(category_id,name)
 select id,'Agua' from public.catalog_categories where name='Filtración' on conflict do nothing;
insert into public.catalog_subcategories(category_id,name)
 select id,'Aire' from public.catalog_categories where name='Filtración' on conflict do nothing;
