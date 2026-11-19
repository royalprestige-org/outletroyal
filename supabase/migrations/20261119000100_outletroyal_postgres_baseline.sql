-- Royal Prestige Outlet · Migración inicial de D1/SQLite a Supabase PostgreSQL.
-- Fuente de referencia: referencia/sites-v13 (commit d51e490cada250d18afea42a733fd21af75557af).
-- El acceso a todas las tablas es exclusivamente servidor; no se concede acceso directo al navegador.
create table public.products (
  id text primary key,
  name text not null check (char_length(name) between 1 and 180),
  family text not null,
  category text not null default '',
  description text not null default '',
  base_price integer not null check (base_price > 0),
  kind text not null default 'individual' check (kind in ('individual','set')),
  is_kitchen_set boolean not null default false,
  completed boolean not null default false,
  updated_at text not null default '',
  warranty_json jsonb not null default '{}'::jsonb
);
create index idx_products_completed_family on public.products(completed,family);
create table public.product_components (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  component_product_id text references public.products(id) on delete set null,
  label text not null check (char_length(label) between 1 and 180),
  quantity integer not null default 1 check (quantity between 1 and 100),
  position integer not null default 0 check (position >= 0)
);
create index idx_components_product on public.product_components(product_id,position);
create table public.product_photos (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  object_key text not null,
  position integer not null default 0 check (position >= 0)
);
create index idx_photos_product on public.product_photos(product_id,position);
create table public.offers (
  id text primary key,
  name text not null,
  description text not null default '',
  special_price integer not null check (special_price > 0),
  active boolean not null default false,
  created_at text not null,
  updated_at text not null
);
create table public.offer_items (
  id text primary key,
  offer_id text not null references public.offers(id) on delete cascade,
  product_id text not null references public.products(id),
  quantity integer not null default 1 check (quantity >= 1)
);
create index idx_offer_items_offer on public.offer_items(offer_id);
create table public.appointments (
  id text primary key,
  kind text not null default 'scheduled',
  status text not null default 'pending',
  date text not null,
  slot text not null,
  expires_at bigint,
  customer_name text not null,
  phone text not null,
  city text not null default '',
  colonia text not null default '',
  address text not null default '',
  source_json text not null default '{}',
  sale_json text not null default '{}',
  notes text not null default '',
  created_at text not null,
  updated_at text not null
);
create index idx_appointments_date_status on public.appointments(date,status);
create table public.appointment_slots (
  key text primary key,
  date text not null,
  slot text not null,
  hold_token text not null,
  appointment_id text references public.appointments(id) on delete set null,
  expires_at bigint not null
);
create index idx_slots_expires on public.appointment_slots(expires_at);
create table public.appointment_referrals (
  id text primary key,
  appointment_id text not null references public.appointments(id) on delete cascade,
  name text not null,
  phone text not null default '',
  age integer,
  married text not null default '',
  work text not null default '',
  health text not null default '',
  notes text not null default ''
);
create index idx_referrals_appointment on public.appointment_referrals(appointment_id);
-- Solo usuarios administrativos reconocidos en Auth podrán ser habilitados por el servidor.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','editor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
-- RLS desde el primer momento: ninguna tabla accesible de forma directa al cliente.
alter table public.products enable row level security;
alter table public.product_components enable row level security;
alter table public.product_photos enable row level security;
alter table public.offers enable row level security;
alter table public.offer_items enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_slots enable row level security;
alter table public.appointment_referrals enable row level security;
alter table public.admin_users enable row level security;
revoke all on public.products, public.product_components, public.product_photos,
 public.offers, public.offer_items, public.appointments, public.appointment_slots,
 public.appointment_referrals, public.admin_users from public, anon, authenticated;
grant all on public.products, public.product_components, public.product_photos,
 public.offers, public.offer_items, public.appointments, public.appointment_slots,
 public.appointment_referrals, public.admin_users to service_role;
