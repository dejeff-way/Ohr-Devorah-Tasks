-- Fix task insert policy - staff need a simple direct policy
DROP POLICY IF EXISTS "Admins can insert tasks" ON public.tasks;
CREATE POLICY "Users can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = created_by);
