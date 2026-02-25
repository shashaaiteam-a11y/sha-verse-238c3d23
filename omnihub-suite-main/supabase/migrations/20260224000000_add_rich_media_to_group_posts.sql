-- Add rich media support to group_posts
ALTER TABLE public.group_posts
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'text';

-- Allow content to be optional (for media-only posts)
ALTER TABLE public.group_posts
  ALTER COLUMN content DROP NOT NULL;
ALTER TABLE public.group_posts
  ALTER COLUMN content SET DEFAULT '';

-- Also add approval_status and pinned columns if not already (used by GroupAdmin)
ALTER TABLE public.group_posts
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;

DO $$
BEGIN
  ALTER TABLE public.group_posts
    ADD CONSTRAINT group_posts_post_type_check
    CHECK (post_type IN ('text', 'image', 'video', 'document', 'file'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.group_posts
    ADD CONSTRAINT group_posts_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for faster pending post lookups
CREATE INDEX IF NOT EXISTS idx_group_posts_approval ON public.group_posts (group_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_group_posts_pinned ON public.group_posts (group_id, pinned);
