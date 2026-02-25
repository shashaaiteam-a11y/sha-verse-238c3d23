-- Fix the notify_friend_request trigger to use SECURITY DEFINER
-- This allows it to insert profile_activities for the recipient user
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.profile_activities (user_id, activity_type, content, metadata)
    VALUES (
      NEW.friend_id,
      'friend_request',
      'sent you a friend request',
      jsonb_build_object('requester_id', NEW.user_id, 'request_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$function$;