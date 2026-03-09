DROP POLICY IF EXISTS "Users can delete their own activities" ON public.profile_activities;

CREATE POLICY "Users can delete their own activities"
ON public.profile_activities
FOR DELETE
USING (auth.uid() = user_id);
