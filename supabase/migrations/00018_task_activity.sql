-- Task activity log
--
-- A running, append-only record of what has actually been tried on a task:
-- "tried calling, no answer", "left voicemail", "spoke to the office, calling
-- back Tuesday". Each entry is stamped with who wrote it and when.
--
-- This sits alongside tasks.description rather than replacing it. The
-- description stays as the brief — what the task is and how to do it, written
-- once when the task is created. The activity log is the history.
--
-- Entries are deliberately immutable: there is no UPDATE policy, so a record of
-- what was attempted cannot be quietly rewritten after the fact. The author (or
-- an admin) can delete an entry outright if it was a genuine mistake.

CREATE TABLE IF NOT EXISTS public.task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (length(btrim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_activity_task_id_created_at_idx
  ON public.task_activity (task_id, created_at DESC);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policies
--
-- All visibility checks go through the existing SECURITY DEFINER helpers
-- (is_admin / is_task_assignee / is_task_creator) rather than sub-selecting
-- from public.tasks or public.task_assignees. Migrations 00007 and 00008 exist
-- precisely because cross-table sub-selects here caused infinite RLS recursion.
-- ============================================================================

-- Anyone who can see the task can read its history.
DROP POLICY IF EXISTS "Read task activity" ON public.task_activity;
CREATE POLICY "Read task activity"
  ON public.task_activity FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR public.is_task_assignee(task_id, auth.uid())
    OR public.is_task_creator(task_id, auth.uid())
  );

-- Anyone who can see the task can log against it, but only as themselves.
DROP POLICY IF EXISTS "Write task activity" ON public.task_activity;
CREATE POLICY "Write task activity"
  ON public.task_activity FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.is_admin(auth.uid())
      OR public.is_task_assignee(task_id, auth.uid())
      OR public.is_task_creator(task_id, auth.uid())
    )
  );

-- Authors can remove their own entries; admins can remove any.
DROP POLICY IF EXISTS "Delete own task activity" ON public.task_activity;
CREATE POLICY "Delete own task activity"
  ON public.task_activity FOR DELETE
  USING (
    author_id = auth.uid()
    OR public.is_admin(auth.uid())
  );
