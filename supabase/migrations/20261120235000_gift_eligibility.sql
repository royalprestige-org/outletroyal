-- Control explícito de elegibilidad para regalos en las cotizaciones.
-- Desactivado por defecto: el administrador autoriza cada producto individualmente.
-- Las reglas vigentes de precio y modalidad de compra siguen siendo obligatorias.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_gift_eligible boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.products.is_gift_eligible IS
  'Autorización administrativa para aparecer como regalo, adicional a las reglas comerciales vigentes.';
