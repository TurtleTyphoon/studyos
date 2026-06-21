-- Study sessions for timer/analytics
create table public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  duration_seconds integer not null,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.study_sessions enable row level security;

create policy "Users can view own study sessions"
  on public.study_sessions for select using (auth.uid() = user_id);

create policy "Users can insert own study sessions"
  on public.study_sessions for insert with check (auth.uid() = user_id);

-- Shared course spaces
alter table public.courses add column if not exists is_shared boolean not null default false;
alter table public.courses add column if not exists invite_code text unique;

create table public.course_members (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', -- 'owner' or 'member'
  joined_at timestamptz not null default now(),
  unique(course_id, user_id)
);

alter table public.course_members enable row level security;

create policy "Members can view course members"
  on public.course_members for select
  using (
    user_id = auth.uid()
    or course_id in (select course_id from public.course_members where user_id = auth.uid())
  );

create policy "Users can insert own membership"
  on public.course_members for insert with check (auth.uid() = user_id);

create policy "Owners can delete members"
  on public.course_members for delete
  using (
    course_id in (
      select course_id from public.course_members
      where user_id = auth.uid() and role = 'owner'
    )
    or user_id = auth.uid()
  );

-- Update courses policy to allow viewing shared courses
drop policy if exists "Users can view own courses" on public.courses;

create policy "Users can view own or shared courses"
  on public.courses for select
  using (
    auth.uid() = user_id
    or id in (select course_id from public.course_members where user_id = auth.uid())
  );

-- Update notes policy to allow viewing notes in shared courses
drop policy if exists "Users can view own notes" on public.notes;

create policy "Users can view own or shared course notes"
  on public.notes for select
  using (
    auth.uid() = user_id
    or course_id in (select course_id from public.course_members where user_id = auth.uid())
  );

-- Function to generate invite code
create or replace function public.generate_invite_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- Function to share a course
create or replace function public.share_course(course_uuid uuid)
returns text as $$
declare
  code text;
begin
  code := public.generate_invite_code();
  update public.courses set is_shared = true, invite_code = code where id = course_uuid and user_id = auth.uid();
  insert into public.course_members (course_id, user_id, role) values (course_uuid, auth.uid(), 'owner') on conflict do nothing;
  return code;
end;
$$ language plpgsql security definer;

-- Function to join a course by invite code
create or replace function public.join_course(code text)
returns uuid as $$
declare
  cid uuid;
begin
  select id into cid from public.courses where invite_code = upper(code) and is_shared = true;
  if cid is null then
    raise exception 'Invalid invite code';
  end if;
  insert into public.course_members (course_id, user_id, role) values (cid, auth.uid(), 'member') on conflict do nothing;
  return cid;
end;
$$ language plpgsql security definer;
