-- =========================================================
-- 1. Prevent self-granting NovaChat Pro / writing Stripe IDs
-- =========================================================
CREATE OR REPLACE FUNCTION public.protect_novachat_pro_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role (billing backend) and site admins may set protected fields
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_pro := false;
    NEW.pro_expires_at := NULL;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.is_pro := OLD.is_pro;
    NEW.pro_expires_at := OLD.pro_expires_at;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_novachat_pro_fields_trg ON public.novachat_settings;
CREATE TRIGGER protect_novachat_pro_fields_trg
  BEFORE INSERT OR UPDATE ON public.novachat_settings
  FOR EACH ROW EXECUTE FUNCTION public.protect_novachat_pro_fields();

-- =========================================================
-- 2. Hide pending group posts from regular members
-- =========================================================
DROP POLICY IF EXISTS "Group posts are viewable by group members" ON public.group_posts;
CREATE POLICY "Group posts are viewable by group members"
ON public.group_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_posts.group_id
      AND group_members.user_id = auth.uid()
  )
  AND (
    COALESCE(approval_status, 'approved') = 'approved'
    OR user_id = auth.uid()
    OR public.get_group_role(auth.uid(), group_id) IN ('admin','moderator')
    OR EXISTS (SELECT 1 FROM public.groups WHERE id = group_posts.group_id AND creator_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- =========================================================
-- 3. Require valid email format for anonymous login attempts
-- =========================================================
DROP POLICY IF EXISTS "Anyone can record their own login attempt" ON public.login_attempts;
CREATE POLICY "Anyone can record their own login attempt"
ON public.login_attempts FOR INSERT
TO authenticated, anon
WITH CHECK (
  ((auth.uid() IS NOT NULL) AND (identifier = (auth.jwt() ->> 'email')))
  OR (
    (auth.uid() IS NULL)
    AND (identifier IS NOT NULL)
    AND (length(identifier) <= 320)
    AND (identifier ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  )
);