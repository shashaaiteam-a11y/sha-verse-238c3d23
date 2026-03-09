-- Fix RLS policies for storage buckets to allow uploads and deletes

-- ============================================================================
-- POST-IMAGES BUCKET POLICIES
-- ============================================================================

-- Drop existing incomplete policies for post-images
DELETE FROM storage.policies 
WHERE bucket_id = 'post-images' 
AND operation IN ('INSERT', 'DELETE', 'UPDATE');

-- Public read for post-images
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Public read post-images',
  'post-images',
  'SELECT',
  'true'
)
ON CONFLICT DO NOTHING;

-- Authenticated users can upload
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Auth upload post-images', 
  'post-images',
  'INSERT',
  'auth.role() = ''authenticated'''
)
ON CONFLICT DO NOTHING;

-- Users can update their own files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Auth update post-images',
  'post-images', 
  'UPDATE',
  'auth.uid()::text = (storage.foldername(name))[2]'
)
ON CONFLICT DO NOTHING;

-- Users can delete their own files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Auth delete post-images',
  'post-images',
  'DELETE',
  'auth.uid()::text = (storage.foldername(name))[2]'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VIDEOS BUCKET POLICIES
-- ============================================================================

-- Drop existing incomplete policies
DELETE FROM storage.policies
WHERE bucket_id = 'videos'
AND operation IN ('INSERT', 'DELETE', 'UPDATE');

-- Public read for videos
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Public read videos',
  'videos',
  'SELECT',
  'true'
)
ON CONFLICT DO NOTHING;

-- Authenticated users can upload
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Auth upload videos',
  'videos',
  'INSERT',
  'auth.role() = ''authenticated'''
)
ON CONFLICT DO NOTHING;

-- Users can update their own files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Auth update videos',
  'videos',
  'UPDATE',
  'auth.uid()::text = (storage.foldername(name))[2]'
)
ON CONFLICT DO NOTHING;

-- Users can delete their own files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Auth delete videos',
  'videos',
  'DELETE',
  'auth.uid()::text = (storage.foldername(name))[2]'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- POST-FILES BUCKET POLICIES
-- ============================================================================

-- Drop existing incomplete policies
DELETE FROM storage.policies
WHERE bucket_id = 'post-files'
AND operation IN ('INSERT', 'DELETE', 'UPDATE');

-- Public read for post-files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Public read post-files',
  'post-files',
  'SELECT',
  'true'
)
ON CONFLICT DO NOTHING;

-- Authenticated users can upload
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Auth upload post-files',
  'post-files',
  'INSERT',
  'auth.role() = ''authenticated'''
)
ON CONFLICT DO NOTHING;

-- Users can update their own files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Auth update post-files',
  'post-files',
  'UPDATE',
  'auth.uid()::text = (storage.foldername(name))[2]'
)
ON CONFLICT DO NOTHING;

-- Users can delete their own files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Auth delete post-files',
  'post-files',
  'DELETE',
  'auth.uid()::text = (storage.foldername(name))[2]'
)
ON CONFLICT DO NOTHING;
