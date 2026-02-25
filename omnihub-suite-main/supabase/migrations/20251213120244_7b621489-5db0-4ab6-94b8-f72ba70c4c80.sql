-- Fix 1: Drop all existing SELECT policies on profiles first
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;

-- Recreate profiles SELECT policies
CREATE POLICY "auth_users_view_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "anon_view_profiles"
ON public.profiles
FOR SELECT
TO anon
USING (true);

-- Fix 2: Add UPDATE policy for channel_monetization for channel owners
DROP POLICY IF EXISTS "Channel owners can update monetization" ON public.channel_monetization;
CREATE POLICY "monetization_update_policy"
ON public.channel_monetization
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM channels
  WHERE channels.id = channel_monetization.channel_id
  AND channels.user_id = auth.uid()
));

-- Fix 3: Add DELETE and UPDATE policies for messages
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

CREATE POLICY "messages_delete_policy"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);

CREATE POLICY "messages_update_policy"
ON public.messages
FOR UPDATE
USING (auth.uid() = sender_id);

-- Fix 4: Add UPDATE and DELETE policies for conversations
DROP POLICY IF EXISTS "Conversation creators can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conversation creators can delete conversations" ON public.conversations;

CREATE POLICY "conversations_update_policy"
ON public.conversations
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "conversations_delete_policy"
ON public.conversations
FOR DELETE
USING (auth.uid() = created_by);

-- Fix 5: Add DELETE policy for notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "notifications_delete_policy"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);