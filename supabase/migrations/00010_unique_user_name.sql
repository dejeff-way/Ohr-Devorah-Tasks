-- Prevent race condition where two users claim the same staff name simultaneously
-- Makes claimStaffSlot atomic at the database level

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_name_unique'
    AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_name_unique UNIQUE (name);
  END IF;
END $$;
