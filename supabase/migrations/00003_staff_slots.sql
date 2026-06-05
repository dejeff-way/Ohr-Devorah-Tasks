-- ============================================================
-- Ohr Devora Task Manager — Staff Slot Names
-- Predefined staff identities that users pick on first login.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_slots ENABLE ROW LEVEL SECURITY;

-- Admins can read/write all slots; staff can only read
CREATE POLICY "Admins can manage staff slots"
  ON public.staff_slots FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Staff can read staff slots"
  ON public.staff_slots FOR SELECT
  USING (true);

-- Seed the staff slots (the actual staff identities)
INSERT INTO public.staff_slots (name) VALUES
  ('Mrs. Scheiner'),
  ('Mrs. Lover'),
  ('Mrs. Roth'),
  ('Mrs. Mizrahi'),
  ('Mrs. Hauer'),
  ('Miss Thaler'),
  ('Mr. Lichtenstein')
ON CONFLICT (name) DO NOTHING;
