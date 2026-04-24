-- NovaChat per-user settings
CREATE TABLE IF NOT EXISTS public.novachat_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferred_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  custom_system_prompt TEXT,
  memory_facts TEXT,
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  show_reasoning BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.novachat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "novachat_settings_select_own"
  ON public.novachat_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "novachat_settings_insert_own"
  ON public.novachat_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "novachat_settings_update_own"
  ON public.novachat_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "novachat_settings_delete_own"
  ON public.novachat_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_novachat_settings_updated_at
  BEFORE UPDATE ON public.novachat_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to ai_conversations for sharing & per-conversation model override
ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS model_override TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_share_token
  ON public.ai_conversations(share_token)
  WHERE share_token IS NOT NULL;

-- Public read policy for shared conversations (anyone with the token can read)
DROP POLICY IF EXISTS "ai_conversations_public_shared_read" ON public.ai_conversations;
CREATE POLICY "ai_conversations_public_shared_read"
  ON public.ai_conversations FOR SELECT
  USING (share_token IS NOT NULL);

-- Public read for messages of shared conversations
DROP POLICY IF EXISTS "ai_messages_public_shared_read" ON public.ai_messages;
CREATE POLICY "ai_messages_public_shared_read"
  ON public.ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.share_token IS NOT NULL
    )
  );