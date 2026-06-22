-- ============================================================
-- 1. PROFILES: column-level protection for sensitive PII
--    (phone, phone_number, birthdate, gender, relationship_status)
--    Sensitive fields are exposed only via get_profile_private_fields RPC.
-- ============================================================
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, username, display_name, bio, avatar_url, cover_url, location, website,
  created_at, updated_at, work, education, hometown, current_city,
  facebook_url, instagram_url, twitter_url, hobbies, about_me, privacy,
  provider, last_login, is_verified, is_deactivated, deactivated_at
) ON public.profiles TO authenticated;

-- ============================================================
-- 2. NOVACHAT_SETTINGS: hide Stripe identifiers from client
-- ============================================================
REVOKE SELECT ON public.novachat_settings FROM anon, authenticated;
GRANT SELECT (
  id, user_id, preferred_model, custom_system_prompt, memory_facts,
  voice_enabled, show_reasoning, created_at, updated_at, is_pro, pro_expires_at
) ON public.novachat_settings TO authenticated;

-- ============================================================
-- 3. NOTIFICATION TRIGGERS: per-user flood throttling
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_new_video()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  channel_info RECORD;
  subscriber RECORD;
BEGIN
  SELECT c.id, c.name, c.user_id INTO channel_info
  FROM channels c WHERE c.id = NEW.channel_id;

  IF channel_info.name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Throttle: skip fan-out if this channel uploaded more than 3 videos in the last minute
  IF (SELECT count(*) FROM videos
        WHERE channel_id = NEW.channel_id
          AND created_at > now() - interval '60 seconds') > 3 THEN
    RETURN NEW;
  END IF;

  FOR subscriber IN
    SELECT user_id FROM subscriptions WHERE channel_id = NEW.channel_id AND user_id != channel_info.user_id LIMIT 100
  LOOP
    PERFORM create_notification(
      subscriber.user_id,
      'new_video',
      channel_info.name || ' uploaded a new video',
      NEW.title,
      jsonb_build_object('video_id', NEW.id, 'channel_id', NEW.channel_id)
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_group_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  group_name TEXT;
  author_name TEXT;
  member RECORD;
BEGIN
  SELECT name INTO group_name FROM groups WHERE id = NEW.group_id;
  SELECT display_name INTO author_name FROM profiles WHERE id = NEW.user_id;

  IF group_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Throttle: skip fan-out if this user created more than 5 group posts in the last minute
  IF (SELECT count(*) FROM group_posts
        WHERE user_id = NEW.user_id
          AND created_at > now() - interval '60 seconds') > 5 THEN
    RETURN NEW;
  END IF;

  FOR member IN
    SELECT user_id FROM group_members
    WHERE group_id = NEW.group_id AND user_id != NEW.user_id
    LIMIT 50
  LOOP
    PERFORM create_notification(
      member.user_id,
      'group_post',
      author_name || ' posted in ' || group_name,
      LEFT(NEW.content, 50),
      jsonb_build_object('group_id', NEW.group_id, 'post_id', NEW.id, 'user_id', NEW.user_id)
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  content_owner_id UUID;
  commenter_name TEXT;
  comment_preview TEXT;
BEGIN
  -- Throttle: skip if this user posted more than 15 comments in the last minute
  IF (SELECT count(*) FROM comments
        WHERE user_id = NEW.user_id
          AND created_at > now() - interval '60 seconds') > 15 THEN
    RETURN NEW;
  END IF;

  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM posts WHERE id = NEW.post_id;
  ELSIF NEW.group_post_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM group_posts WHERE id = NEW.group_post_id;
  ELSIF NEW.video_id IS NOT NULL THEN
    SELECT c.user_id INTO content_owner_id
    FROM videos v JOIN channels c ON v.channel_id = c.id
    WHERE v.id = NEW.video_id;
  END IF;

  IF content_owner_id IS NULL OR content_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO commenter_name FROM profiles WHERE id = NEW.user_id;
  comment_preview := LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END;

  PERFORM create_notification(
    content_owner_id,
    'comment',
    commenter_name || ' commented on your post',
    comment_preview,
    jsonb_build_object('user_id', NEW.user_id, 'post_id', COALESCE(NEW.post_id, NEW.group_post_id, NEW.video_id), 'comment_id', NEW.id)
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_post_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  post_owner_id UUID;
  reactor_name TEXT;
BEGIN
  -- Throttle: skip if this user created more than 30 reactions in the last minute
  IF (SELECT count(*) FROM likes
        WHERE user_id = NEW.user_id
          AND created_at > now() - interval '60 seconds') > 30 THEN
    RETURN NEW;
  END IF;

  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  ELSIF NEW.group_post_id IS NOT NULL THEN
    SELECT user_id INTO post_owner_id FROM group_posts WHERE id = NEW.group_post_id;
  ELSIF NEW.video_id IS NOT NULL THEN
    SELECT c.user_id INTO post_owner_id
    FROM videos v JOIN channels c ON v.channel_id = c.id
    WHERE v.id = NEW.video_id;
  END IF;

  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO reactor_name FROM profiles WHERE id = NEW.user_id;

  PERFORM create_notification(
    post_owner_id,
    'reaction',
    reactor_name || ' reacted to your post',
    COALESCE(NEW.reaction_type, 'like'),
    jsonb_build_object('user_id', NEW.user_id, 'post_id', COALESCE(NEW.post_id, NEW.group_post_id, NEW.video_id))
  );

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 4. LOCK DOWN SECURITY DEFINER FUNCTIONS callable by anon
--    Sensitive admin / contact / private-data helpers should not be
--    invokable by signed-out users (and maintenance jobs not by clients).
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.admin_approve_channel(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_channel(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_for_partner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_book_duplicate(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_book_file_hash(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_page_contact(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_profile_private_fields(uuid) FROM anon;
-- maintenance routine: not for any client role
REVOKE EXECUTE ON FUNCTION public.process_book_auto_deletions() FROM anon, authenticated;

-- ============================================================
-- 5. MOVE EXTENSIONS OUT OF PUBLIC SCHEMA
-- ============================================================
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- ============================================================
-- 6. STORAGE: prevent listing/enumeration of public buckets.
--    Public media is served via public object URLs (no RLS), so removing
--    the broad listing policies does not affect rendering or downloads.
-- ============================================================
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Post images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view books" ON storage.objects;
DROP POLICY IF EXISTS "Books are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;
DROP POLICY IF EXISTS "Chat media is publicly accessible" ON storage.objects;