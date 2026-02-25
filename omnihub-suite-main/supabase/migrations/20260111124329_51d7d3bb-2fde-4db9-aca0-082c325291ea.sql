-- Fix: Poll Options Table Allows Unrestricted Updates
-- Drop the dangerous UPDATE policy that allows anyone to modify poll options
DROP POLICY IF EXISTS "Allow vote count updates" ON public.poll_options;

-- Drop the SECURITY DEFINER function as we'll use a trigger instead
DROP FUNCTION IF EXISTS public.increment_poll_vote(UUID);

-- Create trigger function to maintain vote counts automatically
CREATE OR REPLACE FUNCTION public.update_poll_vote_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE poll_options 
    SET vote_count = vote_count + 1 
    WHERE id = NEW.option_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE poll_options 
    SET vote_count = vote_count - 1 
    WHERE id = OLD.option_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND NEW.option_id <> OLD.option_id THEN
    -- User changed their vote
    UPDATE poll_options SET vote_count = vote_count - 1 WHERE id = OLD.option_id;
    UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = NEW.option_id;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on poll_votes table
DROP TRIGGER IF EXISTS poll_vote_count_trigger ON public.poll_votes;
CREATE TRIGGER poll_vote_count_trigger
AFTER INSERT OR DELETE OR UPDATE ON public.poll_votes
FOR EACH ROW EXECUTE FUNCTION public.update_poll_vote_count();

-- Add policy to allow post owners to update their poll options (for editing)
CREATE POLICY "Post owners can update poll options"
ON public.poll_options
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = poll_options.post_id
    AND posts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = poll_options.post_id
    AND posts.user_id = auth.uid()
  )
);