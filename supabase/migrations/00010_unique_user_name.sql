-- Prevent race condition where two users claim the same staff name simultaneously
-- Makes claimStaffSlot atomic at the database level

ALTER TABLE public.users
  ADD CONSTRAINT users_name_unique UNIQUE (name);
