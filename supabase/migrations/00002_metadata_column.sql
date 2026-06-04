-- ============================================================
-- Ohr Devora Task Manager — Add metadata JSONB column
-- ============================================================

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update RLS: metadata inherits task-level RLS (no separate policy needed)
-- since it's on the tasks table itself. Admins can read/write all,
-- staff can read/write tasks they're assigned to.
