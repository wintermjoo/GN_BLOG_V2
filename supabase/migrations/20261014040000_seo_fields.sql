alter table public.posts
  add column seo_title text check (seo_title is null or char_length(seo_title) <= 60),
  add column seo_description text check (seo_description is null or char_length(seo_description) <= 160),
  add column tags text[] not null default '{}' check (cardinality(tags) <= 5),
  add column cover_image_alt text check (cover_image_alt is null or char_length(cover_image_alt) <= 200),
  add column indexable boolean not null default true,
  add column reading_minutes integer not null default 1 check (reading_minutes between 1 and 600);

create index posts_tags_idx on public.posts using gin (tags);

grant insert (seo_title, seo_description, tags, cover_image_alt, indexable, reading_minutes)
  on public.posts to authenticated;
grant update (seo_title, seo_description, tags, cover_image_alt, indexable, reading_minutes)
  on public.posts to authenticated;
