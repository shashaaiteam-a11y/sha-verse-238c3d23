-- Drop the existing check constraint and add updated one with friend_request and friend_accepted
ALTER TABLE public.profile_activities DROP CONSTRAINT profile_activities_activity_type_check;

ALTER TABLE public.profile_activities ADD CONSTRAINT profile_activities_activity_type_check 
CHECK (activity_type = ANY (ARRAY['post'::text, 'photo'::text, 'cover_change'::text, 'profile_pic_change'::text, 'friend_add'::text, 'life_event'::text, 'friend_request'::text, 'friend_accepted'::text]));