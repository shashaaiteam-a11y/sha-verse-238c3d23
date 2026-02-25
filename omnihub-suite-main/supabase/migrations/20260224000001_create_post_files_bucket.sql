-- Create post-files storage bucket for group post file attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-files',
  'post-files',
  true,
  52428800, -- 50 MB
  NULL       -- all mime types allowed
)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
DO $$
BEGIN
  INSERT INTO storage.policies (name, bucket_id, operation, definition)
  VALUES (
    'Public read post-files',
    'post-files',
    'SELECT',
    'true'
  );
EXCEPTION WHEN unique_violation THEN NULL;
END $$;

-- Authenticated upload policy
DO $$
BEGIN
  INSERT INTO storage.policies (name, bucket_id, operation, definition)
  VALUES (
    'Auth upload post-files',
    'post-files',
    'INSERT',
    '(auth.role() = ''authenticated'')'
  );
EXCEPTION WHEN unique_violation THEN NULL;
END $$;
