-- Create triggers for notifications

-- Trigger for post reactions
DROP TRIGGER IF EXISTS trigger_notify_on_post_reaction ON likes;
CREATE TRIGGER trigger_notify_on_post_reaction
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_post_reaction();

-- Trigger for comments
DROP TRIGGER IF EXISTS trigger_notify_on_comment ON comments;
CREATE TRIGGER trigger_notify_on_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();

-- Trigger for friend requests
DROP TRIGGER IF EXISTS trigger_notify_on_friend_request ON friendships;
CREATE TRIGGER trigger_notify_on_friend_request
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_friend_request();

-- Trigger for group joins
DROP TRIGGER IF EXISTS trigger_notify_on_group_join ON group_members;
CREATE TRIGGER trigger_notify_on_group_join
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_group_join();

-- Trigger for new videos
DROP TRIGGER IF EXISTS trigger_notify_on_new_video ON videos;
CREATE TRIGGER trigger_notify_on_new_video
  AFTER INSERT ON videos
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_video();

-- Trigger for group posts
DROP TRIGGER IF EXISTS trigger_notify_on_group_post ON group_posts;
CREATE TRIGGER trigger_notify_on_group_post
  AFTER INSERT ON group_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_group_post();