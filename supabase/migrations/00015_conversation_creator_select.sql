-- Fix: creator can't SELECT their own conversation immediately after INSERT
-- because conversation_participants hasn't been inserted yet.
-- The .select().single() after .insert() triggers the SELECT policy which
-- requires the user to be a participant — but they aren't one yet.
--
-- Add a second permissive SELECT policy: creators can always read their own conversations.

CREATE POLICY "Creators can read own conversations"
  ON public.conversations FOR SELECT
  USING (created_by = auth.uid());
