-- ============================================================
-- Ohr Devora — Recurring tasks and multi-step assignments
-- ============================================================

-- Recurring tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none'
  CHECK (recurrence IN ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'));

-- Task steps (multi-step assignments)
CREATE TABLE IF NOT EXISTS public.task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;

-- Admins can read/write all steps
CREATE POLICY "Admins can manage task steps"
  ON public.task_steps FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Staff can read steps for tasks they're assigned to
CREATE POLICY "Staff can read assigned task steps"
  ON public.task_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.task_assignees
      WHERE task_id = task_steps.task_id AND user_id = auth.uid()
    )
  );
