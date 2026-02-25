-- Fix channel_type constraint to match frontend usage
-- Changing from ('video', 'book') to ('video', 'books')

-- First, update existing data to ensure consistency
UPDATE public.channels 
SET channel_type = 'books' 
WHERE channel_type = 'book';

-- Drop the old constraint
ALTER TABLE public.channels 
DROP CONSTRAINT IF EXISTS channels_channel_type_check;

-- Add the corrected constraint
ALTER TABLE public.channels 
ADD CONSTRAINT channels_channel_type_check 
CHECK (channel_type IN ('video', 'books'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_channels_channel_type ON public.channels(channel_type);