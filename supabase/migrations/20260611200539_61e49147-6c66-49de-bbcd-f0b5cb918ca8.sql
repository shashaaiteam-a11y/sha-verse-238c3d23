-- =========================================================
-- 1. Hide books.file_hash from anon/authenticated (column-level)
--    Table-level SELECT covers all columns, so we revoke table SELECT
--    and re-grant SELECT on every column EXCEPT file_hash.
-- =========================================================
REVOKE SELECT ON public.books FROM anon, authenticated;

GRANT SELECT (
  id, channel_id, title, author, description, cover_url, book_url, pages,
  views_count, likes_count, comments_count, created_at, category, language,
  tags, visibility, age_restriction, comments_enabled, ratings_enabled,
  downloads_count, rating_avg, rating_count
) ON public.books TO anon, authenticated;

-- service_role keeps full access (already granted), used by edge functions / admin

-- =========================================================
-- 2. Enforce group post approval at INSERT (prevents moderation bypass)
-- =========================================================
CREATE OR REPLACE FUNCTION public.enforce_group_post_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _requires_approval boolean;
  _caller uuid := auth.uid();
BEGIN
  SELECT require_post_approval INTO _requires_approval
    FROM public.groups WHERE id = NEW.group_id;

  IF COALESCE(_requires_approval, false)
     AND NOT (public.get_group_role(_caller, NEW.group_id) IN ('admin','moderator'))
     AND NOT EXISTS (SELECT 1 FROM public.groups WHERE id = NEW.group_id AND creator_id = _caller)
     AND NOT public.has_role(_caller, 'admin'::public.app_role)
  THEN
    NEW.approval_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_group_post_approval_trg ON public.group_posts;
CREATE TRIGGER enforce_group_post_approval_trg
  BEFORE INSERT ON public.group_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_post_approval();

-- =========================================================
-- 3. Tighten realtime.messages authorization with explicit allowlist
--    Removes broad public:% and postgres_changes% wildcards,
--    keeps explicit allowlist for the two known in-use public topics.
-- =========================================================
DROP POLICY IF EXISTS "Realtime scoped subscribe" ON realtime.messages;
DROP POLICY IF EXISTS "Realtime scoped broadcast" ON realtime.messages;

CREATE POLICY "Realtime scoped subscribe"
ON realtime.messages FOR SELECT TO authenticated
USING (
  (realtime.topic() ~~ ('user:' || (auth.uid())::text || '%'))
  OR (realtime.topic() ~~ 'conversation:%' AND is_conversation_member(auth.uid(), (NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid))
  OR (realtime.topic() ~~ 'group:%' AND is_group_member(auth.uid(), (NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid))
  OR (realtime.topic() ~~ 'realtime:%')
  -- explicit allowlist for known public topics still in use
  OR (realtime.topic() = 'public:subscriptions')
  OR (realtime.topic() ~~ 'public:channels:%')
);

CREATE POLICY "Realtime scoped broadcast"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  (realtime.topic() ~~ ('user:' || (auth.uid())::text || '%'))
  OR (realtime.topic() ~~ 'conversation:%' AND is_conversation_member(auth.uid(), (NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid))
  OR (realtime.topic() ~~ 'group:%' AND is_group_member(auth.uid(), (NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid))
  OR (realtime.topic() ~~ 'realtime:%')
  OR (realtime.topic() = 'public:subscriptions')
  OR (realtime.topic() ~~ 'public:channels:%')
);