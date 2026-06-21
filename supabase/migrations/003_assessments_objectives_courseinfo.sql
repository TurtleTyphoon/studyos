-- Professor / course info fields
alter table public.courses add column if not exists professor_name text;
alter table public.courses add column if not exists professor_email text;
alter table public.courses add column if not exists office_hours text;
alter table public.courses add column if not exists room text;
alter table public.courses add column if not exists notes_extra text;

-- Learning objectives per week
create table public.learning_objectives (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  week integer not null,
  objective text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.learning_objectives enable row level security;

create policy "Users can view own objectives"
  on public.learning_objectives for select using (auth.uid() = user_id);
create policy "Users can insert own objectives"
  on public.learning_objectives for insert with check (auth.uid() = user_id);
create policy "Users can update own objectives"
  on public.learning_objectives for update using (auth.uid() = user_id);
create policy "Users can delete own objectives"
  on public.learning_objectives for delete using (auth.uid() = user_id);

-- Assessments (assignments, tests, quizzes, exams)
create table public.assessments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  type text not null default 'assignment', -- assignment, quiz, test, midterm, exam, project, lab
  due_date date,
  weight numeric(5,2),
  weeks integer[] not null default '{}', -- which weeks the content covers
  description text,
  grade numeric(5,2),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.assessments enable row level security;

create policy "Users can view own assessments"
  on public.assessments for select using (auth.uid() = user_id);
create policy "Users can insert own assessments"
  on public.assessments for insert with check (auth.uid() = user_id);
create policy "Users can update own assessments"
  on public.assessments for update using (auth.uid() = user_id);
create policy "Users can delete own assessments"
  on public.assessments for delete using (auth.uid() = user_id);
