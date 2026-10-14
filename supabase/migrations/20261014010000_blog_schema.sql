-- ============================================================
-- profiles: username, bio, public read (email stays private)
-- ============================================================
alter table public.profiles
  add column username text,
  add column bio text;

alter table public.profiles
  add constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,20}$'),
  add constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 200);

create unique index profiles_username_key on public.profiles (username);

drop policy "Users can view their own profile" on public.profiles;

create policy "Profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Public read must not expose email: restrict readable columns.
revoke select on public.profiles from anon, authenticated;
grant select (id, username, full_name, avatar_url, bio, created_at)
  on public.profiles to anon, authenticated;

-- Users may only edit these columns of their own profile.
revoke update on public.profiles from authenticated;
grant update (username, bio, full_name, avatar_url) on public.profiles to authenticated;

-- ============================================================
-- shared helpers
-- ============================================================
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- posts
-- ============================================================
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null,
  title text not null check (char_length(title) between 1 and 200),
  content jsonb not null,
  excerpt text not null default '' check (char_length(excerpt) <= 300),
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  view_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (author_id, slug)
);

create index posts_published_idx on public.posts (published_at desc) where status = 'published';
create index posts_author_idx on public.posts (author_id, published_at desc);

create function public.posts_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger posts_before_write
  before insert or update on public.posts
  for each row execute function public.posts_before_write();

alter table public.posts enable row level security;

create policy "Published posts are public, drafts only for the author"
  on public.posts for select
  to anon, authenticated
  using (status = 'published' or (select auth.uid()) = author_id);

create policy "Authors can create their posts"
  on public.posts for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Authors can update their posts"
  on public.posts for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "Authors can delete their posts"
  on public.posts for delete
  to authenticated
  using ((select auth.uid()) = author_id);

-- Counters are maintained only by triggers/functions.
revoke insert, update on public.posts from authenticated;
grant insert (author_id, slug, title, content, excerpt, cover_image_url, status)
  on public.posts to authenticated;
grant update (slug, title, content, excerpt, cover_image_url, status)
  on public.posts to authenticated;
revoke all on public.posts from anon;
grant select on public.posts to anon;

-- ============================================================
-- follows
-- ============================================================
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;

create policy "Follows are public"
  on public.follows for select
  to anon, authenticated
  using (true);

create policy "Users can follow as themselves"
  on public.follows for insert
  to authenticated
  with check ((select auth.uid()) = follower_id);

create policy "Users can unfollow as themselves"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

-- ============================================================
-- post_likes
-- ============================================================
create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user_idx on public.post_likes (user_id);

alter table public.post_likes enable row level security;

create policy "Likes are public"
  on public.post_likes for select
  to anon, authenticated
  using (true);

create policy "Users can like as themselves"
  on public.post_likes for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.posts p where p.id = post_id)
  );

create policy "Users can remove their own like"
  on public.post_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger post_likes_sync_count
  after insert or delete on public.post_likes
  for each row execute function public.sync_like_count();

-- ============================================================
-- comments (one level of replies)
-- ============================================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  content text not null check (char_length(content) <= 2000),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index comments_post_idx on public.comments (post_id, created_at);
create index comments_parent_idx on public.comments (parent_id);

alter table public.comments enable row level security;

create policy "Comments are readable when the post is readable"
  on public.comments for select
  to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "Users can comment as themselves on readable posts"
  on public.comments for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (select 1 from public.posts p where p.id = post_id)
  );

create policy "Authors can edit their comments"
  on public.comments for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "Authors can delete their comments"
  on public.comments for delete
  to authenticated
  using ((select auth.uid()) = author_id);

revoke update on public.comments from authenticated;
grant update (content, deleted_at) on public.comments to authenticated;

-- A reply's parent must be a top-level comment on the same post.
create function public.enforce_comment_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent public.comments;
begin
  if new.parent_id is not null then
    select * into parent from public.comments where id = new.parent_id;
    if parent.id is null or parent.post_id <> new.post_id or parent.parent_id is not null then
      raise exception 'Replies are only allowed on top-level comments of the same post';
    end if;
  end if;
  return new;
end;
$$;

create trigger comments_enforce_depth
  before insert on public.comments
  for each row execute function public.enforce_comment_depth();

-- comment_count counts comments that are not soft-deleted.
create function public.sync_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    if old.deleted_at is null then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger comments_sync_count
  after insert or update of deleted_at or delete on public.comments
  for each row execute function public.sync_comment_count();

-- ============================================================
-- post_views (one count per viewer per day)
-- ============================================================
create table public.post_views (
  post_id uuid not null references public.posts (id) on delete cascade,
  viewer_key text not null check (char_length(viewer_key) between 8 and 80),
  view_date date not null default ((now() at time zone 'Asia/Seoul')::date),
  primary key (post_id, viewer_key, view_date)
);

-- RLS on with no policies: only record_post_view() can write.
alter table public.post_views enable row level security;

create function public.record_post_view(p_post_id uuid, p_viewer_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted integer;
begin
  if not exists (
    select 1 from public.posts where id = p_post_id and status = 'published'
  ) then
    return;
  end if;

  insert into public.post_views (post_id, viewer_key)
  values (p_post_id, p_viewer_key)
  on conflict do nothing;

  get diagnostics inserted = row_count;
  if inserted > 0 then
    update public.posts set view_count = view_count + 1 where id = p_post_id;
  end if;
end;
$$;

revoke execute on function public.record_post_view(uuid, text) from public;
grant execute on function public.record_post_view(uuid, text) to anon, authenticated;

-- Trigger functions must not be callable through the API.
revoke execute on function public.sync_like_count() from public, anon, authenticated;
revoke execute on function public.sync_comment_count() from public, anon, authenticated;

-- ============================================================
-- storage: public image bucket, writes limited to own folder
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "Users upload images to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update their own images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
