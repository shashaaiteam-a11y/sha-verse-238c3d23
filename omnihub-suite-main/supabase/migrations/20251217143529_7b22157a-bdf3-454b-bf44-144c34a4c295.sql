-- Create a function to safely increment poll vote count
CREATE OR REPLACE FUNCTION increment_poll_vote(option_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.poll_options 
  SET vote_count = vote_count + 1 
  WHERE id = option_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;