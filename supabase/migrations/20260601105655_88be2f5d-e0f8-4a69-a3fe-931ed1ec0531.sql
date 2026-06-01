-- Performance indexes (additive, safe). No data or structure changes.

-- Group chat: queries filter by group_id + is_deleted and order by created_at DESC.
-- Currently group_messages has NO non-PK index, so this is the biggest win.
CREATE INDEX IF NOT EXISTS idx_group_messages_group_created
  ON public.group_messages (group_id, created_at DESC);

-- NovaChat messages: queries filter by conversation_id and order by created_at ASC.
-- A composite index serves this better than the two separate single-column ones.
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv_created
  ON public.ai_messages (conversation_id, created_at);