-- Fix: conversation_participants INSERT policy blocks inserting the FIRST participant.
--
-- The policy from 00013 requires:
--   is_participant_of_conversation(conversation_id, auth.uid()) OR is_admin(auth.uid())
--
-- When adding the FIRST participant (the creator adding themselves), they are not
-- yet a participant — so is_participant_of_conversation() returns false.
-- Staff users (not admin) hit a wall: both branches fail → RLS violation.
--
-- Fix: add a third permissive branch — the conversation creator can always add participants.
-- Postgres ORs permissive policies, so we split into separate policies.

DROP POLICY IF EXISTS "Participants can add participants" ON public.conversation_participants;

-- Policy 1: existing participants can add others
CREATE POLICY "Participants can add others"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    public.is_participant_of_conversation(conversation_id, auth.uid())
  );

-- Policy 2: the conversation creator can add participants (including themselves as first)
CREATE POLICY "Conversation creator can add participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

-- Policy 3: admins can always add participants
CREATE POLICY "Admins can add participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
  );
