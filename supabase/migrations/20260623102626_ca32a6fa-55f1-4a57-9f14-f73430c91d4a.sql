-- Performance indexes (additive, non-breaking)

-- Notifications: filtered by user_id, ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- Group posts: filtered by group_id, ordered by created_at DESC (feeds & group detail)
CREATE INDEX IF NOT EXISTS idx_group_posts_group_created
  ON public.group_posts (group_id, created_at DESC);

-- Groups list: ordered by members_count DESC
CREATE INDEX IF NOT EXISTS idx_groups_members_count
  ON public.groups (members_count DESC);