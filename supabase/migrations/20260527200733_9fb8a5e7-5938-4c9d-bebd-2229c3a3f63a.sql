
CREATE TABLE public.app_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  media_url text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT 'image',
  caption text,
  background_color text,
  text_content text,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  views_count int NOT NULL DEFAULT 0
);

GRANT SELECT ON public.app_promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_promotions TO authenticated;
GRANT ALL ON public.app_promotions TO service_role;

ALTER TABLE public.app_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active promotions readable by all"
ON public.app_promotions FOR SELECT
USING (expires_at > now());

CREATE POLICY "Admins can read all promotions"
ON public.app_promotions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert promotions"
ON public.app_promotions FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

CREATE POLICY "Only admins can update promotions"
ON public.app_promotions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete promotions"
ON public.app_promotions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_app_promotions_expires_at ON public.app_promotions(expires_at DESC);

-- Views table
CREATE TABLE public.app_promotion_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.app_promotions(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(promotion_id, viewer_id)
);

GRANT SELECT, INSERT ON public.app_promotion_views TO authenticated;
GRANT ALL ON public.app_promotion_views TO service_role;

ALTER TABLE public.app_promotion_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own view"
ON public.app_promotion_views FOR INSERT
TO authenticated
WITH CHECK (viewer_id = auth.uid());

CREATE POLICY "Admins read all views"
ON public.app_promotion_views FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own view rows"
ON public.app_promotion_views FOR SELECT
TO authenticated
USING (viewer_id = auth.uid());

CREATE INDEX idx_app_promotion_views_promotion ON public.app_promotion_views(promotion_id);

-- Auto-increment trigger
CREATE OR REPLACE FUNCTION public.increment_app_promotion_views()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.app_promotions
  SET views_count = views_count + 1
  WHERE id = NEW.promotion_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_app_promotion_views
AFTER INSERT ON public.app_promotion_views
FOR EACH ROW EXECUTE FUNCTION public.increment_app_promotion_views();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_promotions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_promotion_views;
ALTER TABLE public.app_promotions REPLICA IDENTITY FULL;
ALTER TABLE public.app_promotion_views REPLICA IDENTITY FULL;
