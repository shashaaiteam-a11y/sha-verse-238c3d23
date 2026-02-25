-- Add notification_level column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS notification_level TEXT DEFAULT 'PERSONALIZED';

-- Add progress column to watch_history if not exists
ALTER TABLE public.watch_history 
ADD COLUMN IF NOT EXISTS progress NUMERIC DEFAULT 0;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;