-- Drop existing function first if it exists
DROP FUNCTION IF EXISTS public.create_notification(uuid,text,text,text,jsonb);

-- Create function to generate notifications for various events
CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id UUID,
  notif_type TEXT,
  notif_title TEXT,
  notif_body TEXT DEFAULT NULL,
  notif_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notif_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (target_user_id, notif_type, notif_title, notif_body, notif_data)
  RETURNING id INTO notif_id;
  
  RETURN notif_id;
END;
$$;

-- Trigger for new post reactions (likes)
CREATE OR REPLACE FUNCTION public.notify_on_post_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
  reactor_name TEXT;
BEGIN
  -- Get post owner
  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  ELSIF NEW.group_post_id IS NOT NULL THEN
    SELECT user_id INTO post_owner_id FROM group_posts WHERE id = NEW.group_post_id;
  ELSIF NEW.video_id IS NOT NULL THEN
    SELECT c.user_id INTO post_owner_id 
    FROM videos v JOIN channels c ON v.channel_id = c.id 
    WHERE v.id = NEW.video_id;
  END IF;
  
  -- Don't notify if user reacts to own content
  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get reactor name
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
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_reaction ON likes;
CREATE TRIGGER trigger_notify_on_reaction
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_post_reaction();

-- Trigger for new comments
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_owner_id UUID;
  commenter_name TEXT;
  comment_preview TEXT;
BEGIN
  -- Get content owner based on comment type
  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM posts WHERE id = NEW.post_id;
  ELSIF NEW.group_post_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM group_posts WHERE id = NEW.group_post_id;
  ELSIF NEW.video_id IS NOT NULL THEN
    SELECT c.user_id INTO content_owner_id 
    FROM videos v JOIN channels c ON v.channel_id = c.id 
    WHERE v.id = NEW.video_id;
  END IF;
  
  -- Don't notify if user comments on own content
  IF content_owner_id IS NULL OR content_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get commenter name and preview
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
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_comment ON comments;
CREATE TRIGGER trigger_notify_on_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();

-- Trigger for friend requests
CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_name TEXT;
BEGIN
  -- Only notify on new pending requests
  IF NEW.status = 'pending' THEN
    SELECT display_name INTO requester_name FROM profiles WHERE id = NEW.user_id;
    
    PERFORM create_notification(
      NEW.friend_id,
      'friend_request',
      requester_name || ' sent you a friend request',
      NULL,
      jsonb_build_object('user_id', NEW.user_id, 'friendship_id', NEW.id)
    );
  -- Notify when request is accepted
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT display_name INTO requester_name FROM profiles WHERE id = NEW.friend_id;
    
    PERFORM create_notification(
      NEW.user_id,
      'friend_accepted',
      requester_name || ' accepted your friend request',
      NULL,
      jsonb_build_object('user_id', NEW.friend_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_friend_request ON friendships;
CREATE TRIGGER trigger_notify_on_friend_request
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_friend_request();

-- Trigger for new group members
CREATE OR REPLACE FUNCTION public.notify_on_group_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_name TEXT;
  group_creator_id UUID;
BEGIN
  SELECT name, creator_id INTO group_name, group_creator_id FROM groups WHERE id = NEW.group_id;
  
  -- Notify the user they've joined
  IF NEW.user_id != group_creator_id THEN
    PERFORM create_notification(
      NEW.user_id,
      'group_joined',
      'You joined ' || group_name,
      NULL,
      jsonb_build_object('group_id', NEW.group_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_group_join ON group_members;
CREATE TRIGGER trigger_notify_on_group_join
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_group_join();

-- Trigger for new videos (notify subscribers)
CREATE OR REPLACE FUNCTION public.notify_on_new_video()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  channel_info RECORD;
  subscriber RECORD;
BEGIN
  -- Get channel info
  SELECT c.id, c.name, c.user_id INTO channel_info 
  FROM channels c WHERE c.id = NEW.channel_id;
  
  IF channel_info.name IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Notify all subscribers (limit for performance)
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
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_new_video ON videos;
CREATE TRIGGER trigger_notify_on_new_video
  AFTER INSERT ON videos
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_video();

-- Trigger for new group posts (notify group members)
CREATE OR REPLACE FUNCTION public.notify_on_group_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Notify group members (limit for performance)
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
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_group_post ON group_posts;
CREATE TRIGGER trigger_notify_on_group_post
  AFTER INSERT ON group_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_group_post();