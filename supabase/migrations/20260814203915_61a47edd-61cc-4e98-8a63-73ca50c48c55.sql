
-- 1) profiles: block self-verification
CREATE OR REPLACE FUNCTION public.protect_profile_trust_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.is_verified := OLD.is_verified;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_trust_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_trust_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_trust_fields();

-- 2) generic metric protection helpers
CREATE OR REPLACE FUNCTION public.protect_post_metrics()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  NEW.likes_count := OLD.likes_count;
  NEW.comments_count := OLD.comments_count;
  NEW.shares_count := OLD.shares_count;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_post_metrics ON public.posts;
CREATE TRIGGER trg_protect_post_metrics BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.protect_post_metrics();

CREATE OR REPLACE FUNCTION public.protect_video_metrics()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  NEW.likes_count := OLD.likes_count;
  NEW.comments_count := OLD.comments_count;
  NEW.views_count := OLD.views_count;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_video_metrics ON public.videos;
CREATE TRIGGER trg_protect_video_metrics BEFORE UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.protect_video_metrics();

CREATE OR REPLACE FUNCTION public.protect_channel_metrics()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  NEW.subscribers_count := OLD.subscribers_count;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_channel_metrics ON public.channels;
CREATE TRIGGER trg_protect_channel_metrics BEFORE UPDATE ON public.channels
FOR EACH ROW EXECUTE FUNCTION public.protect_channel_metrics();

CREATE OR REPLACE FUNCTION public.protect_book_metrics()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  NEW.likes_count := OLD.likes_count;
  NEW.comments_count := OLD.comments_count;
  NEW.views_count := OLD.views_count;
  NEW.downloads_count := OLD.downloads_count;
  NEW.rating_avg := OLD.rating_avg;
  NEW.rating_count := OLD.rating_count;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_book_metrics ON public.books;
CREATE TRIGGER trg_protect_book_metrics BEFORE UPDATE ON public.books
FOR EACH ROW EXECUTE FUNCTION public.protect_book_metrics();

CREATE OR REPLACE FUNCTION public.protect_poll_option_metrics()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  NEW.vote_count := OLD.vote_count;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_poll_option_metrics ON public.poll_options;
CREATE TRIGGER trg_protect_poll_option_metrics BEFORE UPDATE ON public.poll_options
FOR EACH ROW EXECUTE FUNCTION public.protect_poll_option_metrics();

CREATE OR REPLACE FUNCTION public.protect_creator_badge_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.badge_level := OLD.badge_level;
  NEW.verified_at := OLD.verified_at;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_creator_badge_fields ON public.creator_badges;
CREATE TRIGGER trg_protect_creator_badge_fields BEFORE UPDATE ON public.creator_badges
FOR EACH ROW EXECUTE FUNCTION public.protect_creator_badge_fields();

REVOKE EXECUTE ON FUNCTION public.protect_profile_trust_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_post_metrics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_video_metrics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_channel_metrics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_book_metrics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_poll_option_metrics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_creator_badge_fields() FROM anon, authenticated;
