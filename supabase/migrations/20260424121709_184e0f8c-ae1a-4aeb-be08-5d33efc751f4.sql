-- Allow anyone to read a conversation that has been explicitly shared
DROP POLICY IF EXISTS "Public can view shared conversations" ON public.ai_conversations;
CREATE POLICY "Public can view shared conversations"
ON public.ai_conversations
FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL);

-- Allow anyone to read messages of a shared conversation
DROP POLICY IF EXISTS "Public can view messages of shared conversations" ON public.ai_messages;
CREATE POLICY "Public can view messages of shared conversations"
ON public.ai_messages
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_messages.conversation_id
      AND c.share_token IS NOT NULL
  )
);