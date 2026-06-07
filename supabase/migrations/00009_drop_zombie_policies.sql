-- Drop stale RLS policies from 00001 that overlap with the clean ones from 00007/00008
-- These use the old recursive EXISTS pattern and are redundant now

DROP POLICY IF EXISTS "Admins can manage assignments" ON public.task_assignees;
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.task_assignees;
DROP POLICY IF EXISTS "Users can read own task assignments" ON public.task_assignees;
