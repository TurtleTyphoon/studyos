-- Fix infinite recursion in course_members RLS policy.
-- The old SELECT policy on course_members referenced itself, causing
-- infinite recursion when notes SELECT policy queried course_members.

drop policy if exists "Members can view course members" on public.course_members;

create policy "Members can view course members"
  on public.course_members for select
  using (user_id = auth.uid());

-- Also simplify the delete policy to avoid the same recursion
drop policy if exists "Owners can delete members" on public.course_members;

create policy "Owners can delete members"
  on public.course_members for delete
  using (user_id = auth.uid());
