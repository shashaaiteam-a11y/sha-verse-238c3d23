
-- Create user_settings if not exists
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  read_receipts_enabled boolean DEFAULT true,
  last_seen_visibility text DEFAULT 'everyone',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can view own settings') THEN
    CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can insert own settings') THEN
    CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can update own settings') THEN
    CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create message_deletions if not exists
CREATE TABLE IF NOT EXISTS public.message_deletions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  deleted_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_deletions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_deletions' AND policyname = 'Users can view own deletions') THEN
    CREATE POLICY "Users can view own deletions" ON public.message_deletions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_deletions' AND policyname = 'Users can insert own deletions') THEN
    CREATE POLICY "Users can insert own deletions" ON public.message_deletions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create user_blocks if not exists
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_blocks' AND policyname = 'Users can view blocks involving them') THEN
    CREATE POLICY "Users can view blocks involving them" ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_blocks' AND policyname = 'Users can create blocks') THEN
    CREATE POLICY "Users can create blocks" ON public.user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_blocks' AND policyname = 'Users can delete own blocks') THEN
    CREATE POLICY "Users can delete own blocks" ON public.user_blocks FOR DELETE USING (auth.uid() = blocker_id);
  END IF;
END $$;

-- Enable realtime for user_presence (ignore if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
