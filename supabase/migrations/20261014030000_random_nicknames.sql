-- Anonymous blog: every member gets a random nickname at signup (e.g. cozy_bear_4821).
-- Members cannot choose or change it, so nobody can pick a name that reveals who they are.
create function public.generate_nickname()
returns text
language plpgsql
set search_path = ''
as $$
declare
  adjectives text[] := array['cozy','sleepy','fluffy','warm','soft','sunny','snug','tiny','calm','gentle','dreamy','cuddly'];
  animals text[] := array['bear','bunny','fox','cat','duck','panda','otter','hamster','sheep','owl','koala','puppy'];
  candidate text;
  attempts integer := 0;
begin
  loop
    candidate :=
      adjectives[1 + floor(random() * array_length(adjectives, 1))::int]
      || '_' || animals[1 + floor(random() * array_length(animals, 1))::int]
      || '_' || lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from public.profiles where username = candidate);
    attempts := attempts + 1;
    if attempts > 20 then
      raise exception 'Could not generate a unique nickname';
    end if;
  end loop;
  return candidate;
end;
$$;

revoke execute on function public.generate_nickname() from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username) values (new.id, public.generate_nickname());
  return new;
end;
$$;

-- Existing members without a nickname get one.
do $$
declare
  r record;
begin
  for r in select id from public.profiles where username is null loop
    update public.profiles set username = public.generate_nickname() where id = r.id;
  end loop;
end;
$$;

alter table public.profiles alter column username set not null;

-- Nickname is assigned by the system only; members can still edit their bio.
revoke update on public.profiles from authenticated;
grant update (bio) on public.profiles to authenticated;
