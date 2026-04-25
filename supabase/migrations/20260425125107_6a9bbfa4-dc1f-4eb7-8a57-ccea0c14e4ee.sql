-- Add missing columns to groups for full Create Group flow
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS rules TEXT,
  ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public';

DO $$
BEGIN
  ALTER TABLE public.groups
    ADD CONSTRAINT groups_privacy_check CHECK (privacy IN ('public', 'private', 'invite_only'));
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_groups_privacy ON public.groups (privacy);
CREATE INDEX IF NOT EXISTS idx_groups_country ON public.groups (country) WHERE country IS NOT NULL;