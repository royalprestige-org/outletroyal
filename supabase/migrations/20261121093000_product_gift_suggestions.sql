-- Regalos sugeridos por producto: asociación dirigida A -> regalo R.
-- No implica que R esté autorizado para regalar; también debe tener is_gift_eligible=true
-- y cumplir las reglas comerciales vigentes en el cotizador.
CREATE TABLE IF NOT EXISTS public.product_gift_suggestions (
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  gift_product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_gift_suggestions_pk PRIMARY KEY(product_id,gift_product_id),
  CONSTRAINT product_gift_suggestions_no_self CHECK(product_id <> gift_product_id)
);
CREATE INDEX IF NOT EXISTS product_gift_suggestions_gift_idx
 ON public.product_gift_suggestions(gift_product_id);
CREATE INDEX IF NOT EXISTS product_gift_suggestions_order_idx
 ON public.product_gift_suggestions(product_id,position,gift_product_id);
ALTER TABLE public.product_gift_suggestions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_gift_suggestions FROM public,anon,authenticated;
GRANT ALL ON public.product_gift_suggestions TO service_role;
