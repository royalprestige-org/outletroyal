-- Migración aplicada al proyecto outletroyal (2026-11-20).
-- Asociación dirigida para compra de un artículo junto a varios relacionados.
-- A -> B no crea automáticamente B -> A.
create table if not exists public.product_relations (
  product_id text not null references public.products(id) on delete cascade,
  related_product_id text not null references public.products(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  constraint product_relations_pk primary key (product_id, related_product_id),
  constraint product_relations_no_self check (product_id <> related_product_id)
);
create index if not exists product_relations_related_idx
  on public.product_relations (related_product_id);
alter table public.product_relations enable row level security;
revoke all privileges on public.product_relations from public, anon, authenticated;
