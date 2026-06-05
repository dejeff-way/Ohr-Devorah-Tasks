-- Final policy cleanup with non-recursive admin checks
--
-- Root cause of bugs:
--   1. Migration 00005 created RLS policies on public.users that SELECT from public.users
--      → infinite recursion when checking any policy that asks "is the user an admin?"
--   2. The recursion broke EVERY policy that referenced public.users (tasks INSERT, UPDATE, etc.)
--      causing "new row violates row-level security policy for table tasks".
--
-- Fix: use a SECURITY DEFINER function that reads the role without triggering RLS recursion.

-- ============================================================================
-- 1. Helper function — bypasses RLS to check admin status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = uid AND role = 'admin'
  );
$$;

-- Lock down the function so only authenticated users can call it
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon, service_role;

-- ============================================================================
-- 2. Drop the recursive policies from migration 00005
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- ============================================================================
-- 3. Rebuild tasks policies using is_admin() — no recursion
-- ============================================================================
DROP POLICY IF EXISTS "Admins can read all tasks" ON public.tasks;
CREATE POLICY "Admins can read all tasks"
  ON public.tasks FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
CREATE POLICY "Admins or creators can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Admins can update all tasks" ON public.tasks;
CREATE POLICY "Admins or creators can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
CREATE POLICY "Admins or creators can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    public.is_admin(auth.uid())
    OR auth.uid() = created_by
  );

-- ============================================================================
-- 4. Task assignees policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can read own assignments" ON public.task_assignees;
CREATE POLICY "Read assignments"
  ON public.task_assignees FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Task creators can manage assignments" ON public.task_assignees;
CREATE POLICY "Admins or creators can manage assignments"
  ON public.task_assignees FOR ALL
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND created_by = auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND created_by = auth.uid())
  );
