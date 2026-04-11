
-- Enable realtime for messages table (critical for tick system: sent/delivered/read)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- Enable realtime for conversations table (for last message updates in list)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;

-- Enable realtime for conversation_members (for mute/unmute sync)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
  END IF;
END $$;

-- Enable realtime for user_blocks (for block/unblock sync)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_blocks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_blocks;
  END IF;
END $$;
