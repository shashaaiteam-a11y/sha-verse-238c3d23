-- Add ALL missing columns to groups table (safe, idempotent)
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS members_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS rules TEXT,
  ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Add privacy check constraint if not already there (ignore error if exists)
DO $$
BEGIN
  ALTER TABLE public.groups
    ADD CONSTRAINT groups_privacy_check CHECK (privacy IN ('public', 'private', 'invite_only'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add status column to group_members if not exists
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

DO $$
BEGIN
  ALTER TABLE public.group_members
    ADD CONSTRAINT group_members_status_check CHECK (status IN ('active', 'pending', 'banned'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_groups_category ON public.groups (category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_groups_privacy ON public.groups (privacy);
CREATE INDEX IF NOT EXISTS idx_groups_is_suspended ON public.groups (is_suspended);
