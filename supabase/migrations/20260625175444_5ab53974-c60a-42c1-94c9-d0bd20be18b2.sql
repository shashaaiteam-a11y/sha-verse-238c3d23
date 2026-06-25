
-- Production-grade, dependency-safe account data deletion.
create or replace function public.delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Not authorized to delete this account';
  end if;

  -- 1) Delete rows with NOT NULL FKs to this user (would otherwise block deletion).
  delete from public.page_posts where posted_by = p_user_id;
  delete from public.video_management_requests where requested_by = p_user_id;

  -- 2) Null out admin/action references on OTHER users' content (NO ACTION FKs).
  update public.book_deletion_requests    set reviewed_by = null where reviewed_by = p_user_id;
  update public.book_reports              set reviewed_by = null where reviewed_by = p_user_id;
  update public.channel_approval_logs     set performed_by = null where performed_by = p_user_id;
  update public.channels                  set approved_by = null where approved_by = p_user_id;
  update public.video_management_requests set reviewed_by = null where reviewed_by = p_user_id;
  update public.conversations             set created_by = null where created_by = p_user_id;
  update public.group_blocked_users       set blocked_by = null where blocked_by = p_user_id;
  update public.group_join_requests       set reviewed_by = null where reviewed_by = p_user_id;
  update public.group_roles               set assigned_by = null where assigned_by = p_user_id;
  update public.group_rules               set created_by = null where created_by = p_user_id;
  update public.page_blocked_users        set blocked_by = null where blocked_by = p_user_id;
  update public.page_roles                set assigned_by = null where assigned_by = p_user_id;
  update public.pages                     set created_by = null where created_by = p_user_id;
  update public.reports                   set reviewed_by = null where reviewed_by = p_user_id;
  update public.reports                   set reporter = null where reporter = p_user_id;

  -- 3) Delete the profile. ON DELETE CASCADE removes all owned content.
  delete from public.profiles where id = p_user_id;
end;
$$;

revoke all on function public.delete_user_account(uuid) from public, anon;
grant execute on function public.delete_user_account(uuid) to authenticated, service_role;
