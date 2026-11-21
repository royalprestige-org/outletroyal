-- One assistance slot per date at 20:30 BCS time, shared by demonstrations and maintenance.
-- Existing quote appointments are preserved separately.
CREATE TABLE IF NOT EXISTS public.service_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_request_id uuid NOT NULL UNIQUE,
 contact_id uuid NOT NULL REFERENCES public.lead_contacts(id) ON DELETE RESTRICT,
 customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) BETWEEN 2 AND 180),
 phone text NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
 service_type text NOT NULL CHECK(service_type IN ('demonstration','maintenance')),
 is_existing_client boolean NOT NULL,
 requested_date date NOT NULL,
 requested_time time without time zone NOT NULL DEFAULT TIME '20:30',
 note text NOT NULL DEFAULT '' CHECK (char_length(note)<=1500),
 interest_product_id text,
 interest_product_name text,
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','confirmed','cancelled','rescheduled')),
 whatsapp_message text NOT NULL CHECK(char_length(whatsapp_message)<=5000),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT service_request_fixed_time CHECK(requested_time=TIME '20:30')
);
-- Partial uniqueness makes cancel/reschedule atomic: cancelled dates are immediately available,
-- while pending/confirmed/rescheduled still block regardless of service type.
CREATE UNIQUE INDEX IF NOT EXISTS service_requests_active_date_key
 ON public.service_requests(requested_date)
 WHERE status IN ('scheduled','confirmed','rescheduled');
CREATE INDEX IF NOT EXISTS service_requests_contact_time_idx
 ON public.service_requests(contact_id,created_at DESC);
CREATE INDEX IF NOT EXISTS service_requests_type_status_idx
 ON public.service_requests(service_type,status,requested_date);
CREATE TABLE IF NOT EXISTS public.service_request_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
 action text NOT NULL,
 previous_status text,
 new_status text NOT NULL,
 previous_date date,
 new_date date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_request_events_date_idx ON public.service_request_events(request_id,created_at);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_requests,public.service_request_events FROM public,anon,authenticated;
GRANT ALL ON public.service_requests,public.service_request_events TO service_role;
