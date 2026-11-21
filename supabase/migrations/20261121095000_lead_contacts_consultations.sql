-- CRM de prospectos: contacto estable + historial ilimitado de consultas.
-- Cada clic en enviar consulta crea un registro independiente, sin asumir entrega en WhatsApp.
CREATE TABLE IF NOT EXISTS public.lead_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 phone text NOT NULL UNIQUE CHECK (phone ~ '^[0-9]{10}$'),
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 180),
 city text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_contacts_name_idx ON public.lead_contacts (lower(name));

CREATE TABLE IF NOT EXISTS public.lead_consultations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contact_id uuid NOT NULL REFERENCES public.lead_contacts(id) ON DELETE RESTRICT,
 customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) BETWEEN 2 AND 180),
 phone text NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
 city text NOT NULL DEFAULT '',
 purchase_mode text NOT NULL CHECK (purchase_mode IN ('normal','outlet')),
 primary_product_id text NOT NULL,
 primary_product_name text NOT NULL,
 items jsonb NOT NULL CHECK (jsonb_typeof(items)='array'),
 gift_product_id text,
 gift_name text,
 additional_product_id text,
 additional_name text,
 payment_preference text,
 estimated_total numeric(14,2) CHECK (estimated_total IS NULL OR estimated_total >= 0),
 whatsapp_message text NOT NULL CHECK (char_length(whatsapp_message) BETWEEN 20 AND 8000),
 whatsapp_status text NOT NULL DEFAULT 'prepared' CHECK (whatsapp_status IN ('prepared','sent_confirmed')),
 visit_folio text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_consultations_contact_date_idx ON public.lead_consultations(contact_id,created_at DESC);
CREATE INDEX IF NOT EXISTS lead_consultations_date_idx ON public.lead_consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS lead_consultations_primary_idx ON public.lead_consultations(primary_product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS lead_consultations_gift_idx ON public.lead_consultations(gift_product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS lead_consultations_additional_idx ON public.lead_consultations(additional_product_id,created_at DESC);
ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_consultations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_contacts,public.lead_consultations FROM public,anon,authenticated;
GRANT ALL ON public.lead_contacts,public.lead_consultations TO service_role;
