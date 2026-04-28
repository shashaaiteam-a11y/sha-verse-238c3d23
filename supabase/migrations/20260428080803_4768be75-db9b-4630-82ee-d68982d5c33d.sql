DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT
  id, username, display_name, bio, avatar_url, cover_url,
  location, website, work, education, hometown, current_city,
  facebook_url, instagram_url, twitter_url, hobbies, about_me,
  is_verified, is_deactivated, created_at, updated_at, provider
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;