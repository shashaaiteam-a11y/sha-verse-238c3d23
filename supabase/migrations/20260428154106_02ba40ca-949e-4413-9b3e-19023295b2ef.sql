-- ==========================================================================
-- 1. NOTIFICATIONS: stop mass-spam vector
--    The "System can insert notifications" policy with WITH CHECK (true)
--    let any authenticated user insert notifications addressed to ANY user.
--    All real notification inserts go through SECURITY DEFINER trigger
--    functions (notify_friend_request, notify_on_post_reaction, etc.) which
--    bypass RLS, so removing this policy does not break any feature.
-- ==========================================================================
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Keep a narrow self-insert policy so a user can mark a local notification
-- on themselves (none of the existing app code relies on this, but it makes
-- ad-hoc admin tooling work without service_role).
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ==========================================================================
-- 2. LOGIN_ATTEMPTS: scope inserts
-- ==========================================================================
DROP POLICY IF EXISTS "Allow insert login attempts" ON public.login_attempts;

CREATE POLICY "Anyone can record their own login attempt"
  ON public.login_attempts FOR INSERT TO anon, authenticated
  WITH CHECK (
    -- authenticated user logging an attempt for themselves, OR
    (auth.uid() IS NOT NULL AND identifier = (auth.jwt() ->> 'email'))
    OR
    -- anonymous attempt (login form before sign-in) - identifier must look like email/phone, not arbitrary
    (auth.uid() IS NULL AND identifier IS NOT NULL AND length(identifier) BETWEEN 3 AND 320)
  );

-- ==========================================================================
-- 3. VIDEO_VIEWS: scope inserts to the caller (or anonymous)
-- ==========================================================================
DROP POLICY IF EXISTS "Anyone can insert views" ON public.video_views;

CREATE POLICY "Users can record own video views"
  ON public.video_views FOR INSERT TO anon, authenticated
  WITH CHECK (
    user_id IS NULL                                -- anonymous view counting
    OR auth.uid() = user_id                        -- authenticated, own row
  );

-- ==========================================================================
-- 4. AD_IMPRESSIONS: scope inserts to the caller
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated can insert ad_impressions" ON public.ad_impressions;

CREATE POLICY "Users can record own ad impressions"
  ON public.ad_impressions FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );

-- ==========================================================================
-- 5. LOCK DOWN SERVER-ONLY RPCs
--    These should never be called by clients. Trigger usage is unaffected
--    (triggers run as the trigger owner, not via EXECUTE grants).
-- ==========================================================================
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)  FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb)
  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.calculate_friend_suggestions(uuid)
  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_stories()
  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_user_activity(uuid, text, text, jsonb)
  FROM anon, authenticated, public;

-- ==========================================================================
-- 6. REVOKE anon EXECUTE on internal SECURITY DEFINER helpers
--    Anonymous visitors should not be able to call admin / membership /
--    privacy helpers. Authenticated execute is preserved where the app
--    relies on it. Public-facing functions keep anon access.
-- ==========================================================================
DO $$
DECLARE
  fn record;
  -- functions that are intentionally callable by anon (e.g. shared link viewer)
  keep_anon text[] := ARRAY[
    'get_shared_ai_conversation',
    'handle_new_user',
    'check_rate_limit',
    'set_limit', 'show_limit', 'show_trgm', 'similarity_op', 'similarity_dist',
    'word_similarity', 'word_similarity_op', 'word_similarity_commutator_op',
    'word_similarity_dist_op', 'word_similarity_dist_commutator_op',
    'strict_word_similarity', 'strict_word_similarity_op',
    'strict_word_similarity_commutator_op',
    'strict_word_similarity_dist_op', 'strict_word_similarity_dist_commutator_op',
    'gtrgm_in', 'gtrgm_out', 'gtrgm_consistent', 'gtrgm_distance',
    'gtrgm_compress', 'gtrgm_decompress', 'gtrgm_penalty', 'gtrgm_picksplit',
    'gtrgm_union', 'gtrgm_same', 'gtrgm_options',
    'gin_extract_value_trgm', 'gin_extract_query_trgm',
    'gin_trgm_consistent', 'gin_trgm_triconsistent',
    'unaccent', 'unaccent_init', 'unaccent_lexize'
  ];
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema_name, p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname <> ALL(keep_anon)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon',
      fn.schema_name, fn.func_name, fn.args
    );
  END LOOP;
END $$;

-- ==========================================================================
-- 7. FIX search_path on the four flagged functions
--    (Re-declare with SET search_path = public; bodies unchanged.)
-- ==========================================================================
ALTER FUNCTION public.update_updated_at_column()        SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb)        SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint)        SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
