-- Índices de claves foráneas detectadas en la auditoría inicial de Supabase.
create index if not exists idx_product_components_component_product on public.product_components(component_product_id);
create index if not exists idx_offer_items_product on public.offer_items(product_id);
create index if not exists idx_appointment_slots_appointment on public.appointment_slots(appointment_id);
