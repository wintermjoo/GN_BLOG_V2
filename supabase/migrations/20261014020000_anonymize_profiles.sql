-- Anonymous blog: never store or expose Google identity (real name, photo, email).
update public.profiles set full_name = null, avatar_url = null, email = null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke select on public.profiles from anon, authenticated;
grant select (id, username, bio, created_at) on public.profiles to anon, authenticated;

revoke update on public.profiles from authenticated;
grant update (username, bio) on public.profiles to authenticated;

-- Who liked what stays private: users can only read their own likes (like_count is on posts).
drop policy "Likes are public" on public.post_likes;
create policy "Users can read their own likes"
  on public.post_likes for select
  to authenticated
  using ((select auth.uid()) = user_id);
