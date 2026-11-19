-- Private product image bucket. All objects are accessed through authenticated server routes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
