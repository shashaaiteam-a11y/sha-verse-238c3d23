GRANT SELECT ON public.books TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_friend_suggestions(uuid) TO authenticated;