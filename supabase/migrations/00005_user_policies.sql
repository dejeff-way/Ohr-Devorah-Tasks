-- Add INSERT and DELETE policies for public.users
-- Users can insert their own profile (needed for first-time name picker)
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Admins can insert/update/delete any user
CREATE POLICY "Admins can manage all users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete users"
  ON public.users FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
