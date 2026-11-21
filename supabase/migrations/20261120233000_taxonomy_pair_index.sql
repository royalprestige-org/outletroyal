-- Índice compuesto para la FK que verifica que la subcategoría pertenezca a su categoría.
create index if not exists products_category_subcategory_idx on public.products(category_id,subcategory_id);
