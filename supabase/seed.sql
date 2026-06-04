-- ============================================================
-- Ohr Devora — Seed Data
-- Run this from Supabase SQL Editor after applying the schema.
-- ============================================================

-- NOTE: Supabase Auth users must be created first via the API.
-- This seed file assumes the auth.users table already has the
-- corresponding rows (seeded via the admin seeding script).
-- The trigger `on_auth_user_created` handles populating public.users.

-- Insert staff users if they don't exist (the trigger handles this
-- on auth.user creation, but this ensures they're present for
-- environments where the trigger runs before the seed)
INSERT INTO public.users (id, email, name, role)
SELECT id, email, name, role FROM (
  VALUES
    ('00000000-0000-0000-0000-000000000001', 'mrs.scheiner@ohrdevora.org', 'Mrs. Scheiner', 'staff'),
    ('00000000-0000-0000-0000-000000000002', 'mrs.lover@ohrdevora.org', 'Mrs. Lover', 'staff'),
    ('00000000-0000-0000-0000-000000000003', 'mrs.roth@ohrdevora.org', 'Mrs. Roth', 'staff'),
    ('00000000-0000-0000-0000-000000000004', 'mrs.mizrahi@ohrdevora.org', 'Mrs. Mizrahi', 'staff'),
    ('00000000-0000-0000-0000-000000000005', 'mrs.hauer@ohrdevora.org', 'Mrs. Hauer', 'staff'),
    ('00000000-0000-0000-0000-000000000006', 'miss.thaler@ohrdevora.org', 'Miss Thaler', 'staff'),
    ('00000000-0000-0000-0000-000000000007', 'mr.lichtenstein@ohrdevora.org', 'Mr. Lichtenstein', 'staff')
) AS seed_data(id, email, name, role)
ON CONFLICT (id) DO NOTHING;
