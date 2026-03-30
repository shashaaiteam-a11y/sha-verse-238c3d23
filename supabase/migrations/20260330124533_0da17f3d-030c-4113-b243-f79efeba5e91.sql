
-- Table for one-sided chat clearing (WhatsApp-style)
CREATE TABLE public.chat_clears (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  cleared_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

ALTER TABLE public.chat_clears ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clears" ON public.chat_clears
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clears" ON public.chat_clears
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clears" ON public.chat_clears
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Add is_muted column to conversation_members
ALTER TABLE public.conversation_members 
  ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false;
