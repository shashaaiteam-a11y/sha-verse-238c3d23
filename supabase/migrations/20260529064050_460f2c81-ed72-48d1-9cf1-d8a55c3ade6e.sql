-- Promotions: user-submitted paid "Promote with Us" requests (dual-currency)
CREATE TABLE public.promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  business_name text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  type text NOT NULL DEFAULT 'story',
  duration integer NOT NULL,
  amount integer NOT NULL,            -- smallest unit: paise (INR) or cents (USD)
  currency text NOT NULL DEFAULT 'INR',
  payment_gateway text NOT NULL DEFAULT 'MOCK', -- RAZORPAY | STRIPE | MOCK
  payment_id text,
  payment_status text NOT NULL DEFAULT 'PENDING', -- PENDING | PAID | FAILED
  status text NOT NULL DEFAULT 'PENDING',         -- PENDING | APPROVED | REJECTED | LIVE | EXPIRED
  country text,
  media_url text NOT NULL,
  media_type text NOT NULL,
  caption text,
  target_link text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promotions_duration_chk CHECK (duration BETWEEN 1 AND 24),
  CONSTRAINT promotions_currency_chk CHECK (currency IN ('INR','USD')),
  CONSTRAINT promotions_type_chk CHECK (type IN ('story','feed_banner'))
);

-- Grants (auth-only table: every policy scopes to auth.uid() or admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Users can view their own promotions; admins can view all
CREATE POLICY "Users view own promotions"
ON public.promotions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Users can create their own promotions
CREATE POLICY "Users create own promotions"
ON public.promotions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own promotions (admins can update any, e.g. review)
CREATE POLICY "Users update own promotions"
ON public.promotions FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Users can delete their own promotions; admins can delete any
CREATE POLICY "Users delete own promotions"
ON public.promotions FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Protect server-controlled payment/status fields from client tampering.
-- Non-admin clients cannot change payment_status, status, amount, payment_id,
-- payment_gateway, currency, or admin_notes after insert.
CREATE OR REPLACE FUNCTION public.protect_promotion_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    -- Mock flow: clients may mark their own mock payment as PAID, but cannot
    -- self-approve. Real gateway flows will set these server-side via webhooks.
    NEW.status := 'PENDING';
    NEW.admin_notes := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.payment_status := OLD.payment_status;
    NEW.status := OLD.status;
    NEW.amount := OLD.amount;
    NEW.payment_id := OLD.payment_id;
    NEW.payment_gateway := OLD.payment_gateway;
    NEW.currency := OLD.currency;
    NEW.admin_notes := OLD.admin_notes;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_promotion_fields_trg
BEFORE INSERT OR UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.protect_promotion_fields();

CREATE TRIGGER promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_promotions_user ON public.promotions(user_id, created_at DESC);
CREATE INDEX idx_promotions_status ON public.promotions(status, created_at DESC);