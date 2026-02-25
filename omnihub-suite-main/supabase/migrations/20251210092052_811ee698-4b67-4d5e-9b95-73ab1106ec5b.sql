-- Drop existing check constraint and add new one that includes 'books'
ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_channel_type_check;
ALTER TABLE public.channels ADD CONSTRAINT channels_channel_type_check CHECK (channel_type IN ('video', 'books'));