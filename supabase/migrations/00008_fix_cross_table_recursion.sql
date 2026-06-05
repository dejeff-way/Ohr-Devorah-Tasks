-- Fix cross-table RLS recursion between tasks and task_assignees
--
-- Problem:
--   tasks SELECT policy: "Staff can read assigned tasks"
--     → SELECT from task_assignees
--   task_assignees SELECT policy: "Read assignments"
--     → SELECT from tasks (via the "is task creator" check)
--   → infinite recursion
--
-- Fix: SECURITY DEFINER helper functions that bypass RLS, used in both policies.

-- ============================================================================
-- Helper: is the given user assigned to the given task?
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_task_assignee(p_task_id uuid, p_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_id = p_task_id AND user_id = p_uid
  );
$$;

REVOKE ALL ON FUNCTION public.is_task_assignee(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_assignee(uuid, uuid) TO authenticated, anon, service_role;

-- ============================================================================
-- Helper: did the given user create the given task?
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_task_creator(p_task_id uuid, p_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = p_task_id AND created_by = p_uid
  );
$$;

REVOKE ALL ON FUNCTION public.is_task_creator(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_creator(uuid, uuid) TO authenticated, anon, service_role;

-- ============================================================================
-- Rebuild tasks policies — use helpers instead of inline EXISTS
-- ============================================================================
DROP POLICY IF EXISTS "Staff can read assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can read all tasks" ON public.tasks;

CREATE POLICY "Read tasks"
  ON public.tasks FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.is_task_assignee(id, auth.uid())
  );

-- ============================================================================
-- Rebuild task_assignees policies — use helpers
-- ============================================================================
DROP POLICY IF EXISTS "Read assignments" ON public.task_assignees;
DROP POLICY IF EXISTS "Users can read own assignments" ON public.task_assignees;
CREATE POLICY "Read assignments"
  ON public.task_assignees FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_task_creator(task_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins or creators can manage assignments" ON public.task_assignees;
DROP POLICY IF EXISTS "Task creators can manage assignments" ON public.task_assignees;
CREATE POLICY "Manage assignments"
  ON public.task_assignees FOR ALL
  USING (
    public.is_admin(auth.uid())
    OR public.is_task_creator(task_id, auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.is_task_creator(task_id, auth.uid())
  );

-- ============================================================================
-- Also fix the recursive policies on task_steps and staff_slots
-- (same pattern as the original users recursion — these still use inline EXISTS
-- on public.users which triggers the role check loop)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage task steps" ON public.task_steps;
CREATE POLICY "Admins can manage task steps"
  ON public.task_steps FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Replace the recursive staff_slots admin policy
DROP POLICY IF EXISTS "Admins can manage staff slots" ON public.staff_slots;
CREATE POLICY "Admins can manage staff slots"
  ON public.staff_slots FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Also let staff read task_steps for tasks they're assigned to — using helper
DROP POLICY IF EXISTS "Staff can read assigned task steps" ON public.task_steps;
CREATE POLICY "Read task steps"
  ON public.task_steps FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR public.is_task_assignee(task_id, auth.uid())
    OR public.is_task_creator(task_id, auth.uid())
  );
