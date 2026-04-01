ALTER TABLE public.conversation_members 
  ADD COLUMN IF NOT EXISTS muted_until timestamp with time zone;