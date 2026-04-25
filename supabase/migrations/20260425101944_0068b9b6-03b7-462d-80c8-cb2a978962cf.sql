-- =============================================================
-- Comprehensive Activity Logging — auto-logs cross-module actions
-- via triggers, plus DELETE policy and realtime
-- =============================================================

-- 1) Drop the restrictive check constraint so any activity_type is allowed
ALTER TABLE public.profile_activities
  DROP CONSTRAINT IF EXISTS profile_activities_activity_type_check;

-- 2) Add DELETE policy (idempotent)
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.profile_activities;
CREATE POLICY "Users can delete their own activities"
  ON public.profile_activities
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3) Enable realtime
ALTER TABLE public.profile_activities REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profile_activities'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_activities';
  END IF;
END $$;

-- 4) Generic helper to insert an activity (security definer so triggers can write)
CREATE OR REPLACE FUNCTION public.log_user_activity(
  _user_id uuid,
  _activity_type text,
  _content text,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.profile_activities (user_id, activity_type, content, metadata)
  VALUES (_user_id, _activity_type, _content, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

-- =============================================================
-- TRIGGER: Posts
-- =============================================================
CREATE OR REPLACE FUNCTION public.activity_log_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_user_activity(
    NEW.user_id,
    'post_created',
    'Created a new post',
    jsonb_build_object('post_id', NEW.id, 'module', 'feed')
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_activity_log_post ON public.posts;
CREATE TRIGGER trg_activity_log_post
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.activity_log_post();

-- =============================================================
-- TRIGGER: Group posts
-- =============================================================
CREATE OR REPLACE FUNCTION public.activity_log_group_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g_name text;
BEGIN
  SELECT name INTO g_name FROM public.groups WHERE id = NEW.group_id;
  PERFORM public.log_user_activity(
    NEW.user_id,
    'group_post_created',
    'Posted in group ' || COALESCE(g_name, ''),
    jsonb_build_object('group_id', NEW.group_id, 'post_id', NEW.id, 'module', 'groups')
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_activity_log_group_post ON public.group_posts;
CREATE TRIGGER trg_activity_log_group_post
  AFTER INSERT ON public.group_posts
  FOR EACH ROW EXECUTE FUNCTION public.activity_log_group_post();

-- =============================================================
-- TRIGGER: Comments
-- =============================================================
CREATE OR REPLACE FUNCTION public.activity_log_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE module_name text := 'feed';
BEGIN
  IF NEW.video_id IS NOT NULL THEN module_name := 'videos';
  ELSIF NEW.book_id IS NOT NULL THEN module_name := 'books';
  ELSIF NEW.group_post_id IS NOT NULL THEN module_name := 'groups';
  END IF;
  PERFORM public.log_user_activity(
    NEW.user_id,
    'comment_created',
    'Commented on a ' || module_name,
    jsonb_build_object(
      'comment_id', NEW.id,
      'post_id', NEW.post_id,
      'video_id', NEW.video_id,
      'book_id', NEW.book_id,
      'group_post_id', NEW.group_post_id,
      'module', module_name
    )
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_activity_log_comment ON public.comments;
CREATE TRIGGER trg_activity_log_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.activity_log_comment();

-- =============================================================
-- TRIGGER: Likes / Reactions
-- =============================================================
CREATE OR REPLACE FUNCTION public.activity_log_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE module_name text := 'feed';
BEGIN
  IF NEW.video_id IS NOT NULL THEN module_name := 'videos';
  ELSIF NEW.book_id IS NOT NULL THEN module_name := 'books';
  ELSIF NEW.group_post_id IS NOT NULL THEN module_name := 'groups';
  END IF;
  PERFORM public.log_user_activity(
    NEW.user_id,
    'reaction_added',
    'Reacted (' || COALESCE(NEW.reaction_type, 'like') || ') in ' || module_name,
    jsonb_build_object(
      'reaction', COALESCE(NEW.reaction_type, 'like'),
      'post_id', NEW.post_id,
      'video_id', NEW.video_id,
      'book_id', NEW.book_id,
      'group_post_id', NEW.group_post_id,
      'module', module_name
    )
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_activity_log_like ON public.likes;
CREATE TRIGGER trg_activity_log_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.activity_log_like();

-- =============================================================
-- TRIGGER: Messages sent (chat)
-- =============================================================
CREATE OR REPLACE FUNCTION public.activity_log_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_user_activity(
    NEW.sender_id,
    'message_sent',
    'Sent a message',
    jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id, 'module', 'chats')
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_activity_log_message ON public.messages;
CREATE TRIGGER trg_activity_log_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.activity_log_message();

-- =============================================================
-- TRIGGER: Friend requests / friendships
-- =============================================================
CREATE OR REPLACE FUNCTION public.activity_log_friendship()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    PERFORM public.log_user_activity(
      NEW.user_id,
      'friend_request_sent',
      'Sent a friend request',
      jsonb_build_object('friend_id', NEW.friend_id, 'module', 'friends')
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    PERFORM public.log_user_activity(
      NEW.friend_id,
      'friend_request_accepted',
      'Accepted a friend request',
      jsonb_build_object('friend_id', NEW.user_id, 'module', 'friends')
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_activity_log_friendship ON public.friendships;
CREATE TRIGGER trg_activity_log_friendship
  AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.activity_log_friendship();

-- =============================================================
-- TRIGGER: User blocks / unblocks
-- =============================================================
CREATE OR REPLACE FUNCTION public.activity_log_block()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_user_activity(
      NEW.blocker_id,
      'user_blocked',
      'Blocked a user',
      jsonb_build_object('blocked_id', NEW.blocked_id, 'module', 'privacy')
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_user_activity(
      OLD.blocker_id,
      'user_unblocked',
      'Unblocked a user',
      jsonb_build_object('unblocked_id', OLD.blocked_id, 'module', 'privacy')
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_activity_log_block ON public.user_blocks;
CREATE TRIGGER trg_activity_log_block
  AFTER INSERT OR DELETE ON public.user_blocks
  FOR EACH ROW EXECUTE FUNCTION public.activity_log_block();

-- =============================================================
-- TRIGGER: Videos uploaded
-- =============================================================
CREATE OR REPLACE FUNCTION public.activity_log_video()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.channels WHERE id = NEW.channel_id;
  IF owner_id IS NOT NULL THEN
    PERFORM public.log_user_activity(
      owner_id,
      'video_uploaded',
      'Uploaded a video: ' || COALESCE(NEW.title, ''),
      jsonb_build_object('video_id', NEW.id, 'channel_id', NEW.channel_id, 'module', 'videos')
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_activity_log_video ON public.videos;
CREATE TRIGGER trg_activity_log_video
  AFTER INSERT ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.activity_log_video();

-- =============================================================
-- TRIGGER: Books uploaded
-- =============================================================
CREATE OR REPLACE FUNCTION public.activity_log_book()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.channels WHERE id = NEW.channel_id;
  IF owner_id IS NOT NULL THEN
    PERFORM public.log_user_activity(
      owner_id,
      'book_uploaded',
      'Uploaded a book: ' || COALESCE(NEW.title, ''),
      jsonb_build_object('book_id', NEW.id, 'channel_id', NEW.channel_id, 'module', 'books')
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_activity_log_book ON public.books;
CREATE TRIGGER trg_activity_log_book
  AFTER INSERT ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.activity_log_book();

-- =============================================================
-- TRIGGER: Group join
-- =============================================================
CREATE OR REPLACE FUNCTION public.activity_log_group_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g_name text;
BEGIN
  SELECT name INTO g_name FROM public.groups WHERE id = NEW.group_id;
  PERFORM public.log_user_activity(
    NEW.user_id,
    'group_joined',
    'Joined group ' || COALESCE(g_name, ''),
    jsonb_build_object('group_id', NEW.group_id, 'module', 'groups')
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_activity_log_group_join ON public.group_members;
CREATE TRIGGER trg_activity_log_group_join
  AFTER INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.activity_log_group_join();
