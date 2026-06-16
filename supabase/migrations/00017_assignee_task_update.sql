-- Allow task assignees to update tasks they're assigned to
--
-- Previously only admins and task creators could update a task.
-- This blocked assigned staff from: advancing the status, adding notes,
-- or making any changes at all — making tasks read-only from their perspective.
--
-- Fix: add public.is_task_assignee() to the UPDATE USING clause.
-- Delete remains restricted to admins and creators only (assignees shouldn't
-- be able to delete a task — that stays with the admin/creator).

-- ============================================================================
-- 1. Rebuild tasks UPDATE policy — include assignees
-- ============================================================================
DROP POLICY IF EXISTS "Admins or creators can update tasks" ON public.tasks;
CREATE POLICY "Admins creators or assignees can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR auth.uid() = created_by
    OR public.is_task_assignee(id, auth.uid())
  );
