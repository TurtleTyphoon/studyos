-- StudyOS Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  xp integer not null default 0,
  streak integer not null default 0,
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Courses
create table public.courses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  weeks integer not null default 14,
  progress integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "Users can view own courses"
  on public.courses for select using (auth.uid() = user_id);

create policy "Users can insert own courses"
  on public.courses for insert with check (auth.uid() = user_id);

create policy "Users can update own courses"
  on public.courses for update using (auth.uid() = user_id);

create policy "Users can delete own courses"
  on public.courses for delete using (auth.uid() = user_id);

-- Notes
create table public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  content text,
  week integer,
  concepts text[] not null default '{}',
  file_url text,
  file_type text, -- 'text', 'pdf', 'image'
  file_name text,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "Users can view own notes"
  on public.notes for select using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on public.notes for insert with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on public.notes for update using (auth.uid() = user_id);

create policy "Users can delete own notes"
  on public.notes for delete using (auth.uid() = user_id);

-- Quiz attempts
create table public.quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_code text,
  score integer not null,
  total_questions integer not null,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;

create policy "Users can view own quiz attempts"
  on public.quiz_attempts for select using (auth.uid() = user_id);

create policy "Users can insert own quiz attempts"
  on public.quiz_attempts for insert with check (auth.uid() = user_id);

-- Badges
create table public.badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_type text not null,
  earned_at timestamptz not null default now(),
  unique(user_id, badge_type)
);

alter table public.badges enable row level security;

create policy "Users can view own badges"
  on public.badges for select using (auth.uid() = user_id);

create policy "Users can insert own badges"
  on public.badges for insert with check (auth.uid() = user_id);

-- Leaderboard view (public, real-time)
create or replace view public.leaderboard as
  select
    id,
    display_name,
    xp,
    streak,
    row_number() over (order by xp desc) as rank
  from public.profiles
  order by xp desc;

-- Storage bucket for note attachments
insert into storage.buckets (id, name, public)
values ('note-attachments', 'note-attachments', true)
on conflict do nothing;

create policy "Users can upload note attachments"
  on storage.objects for insert
  with check (bucket_id = 'note-attachments' and auth.role() = 'authenticated');

create policy "Anyone can view note attachments"
  on storage.objects for select
  using (bucket_id = 'note-attachments');

create policy "Users can delete own note attachments"
  on storage.objects for delete
  using (bucket_id = 'note-attachments' and auth.uid()::text = (storage.foldername(name))[1]);

-- Function to increment XP
create or replace function public.add_xp(user_uuid uuid, amount integer)
returns void as $$
begin
  update public.profiles
  set xp = xp + amount, updated_at = now()
  where id = user_uuid;
end;
$$ language plpgsql security definer;

-- Function to update streak
create or replace function public.update_streak(user_uuid uuid)
returns void as $$
declare
  last_date date;
begin
  select last_active_date into last_date from public.profiles where id = user_uuid;

  if last_date is null or last_date < current_date - interval '1 day' then
    update public.profiles set streak = 1, last_active_date = current_date, updated_at = now() where id = user_uuid;
  elsif last_date = current_date - interval '1 day' then
    update public.profiles set streak = streak + 1, last_active_date = current_date, updated_at = now() where id = user_uuid;
  end if;
end;
$$ language plpgsql security definer;
