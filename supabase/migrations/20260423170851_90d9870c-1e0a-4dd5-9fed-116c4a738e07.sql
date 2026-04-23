-- Enable realtime for user_settings so chat privacy updates propagate live
ALTER TABLE public.user_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;