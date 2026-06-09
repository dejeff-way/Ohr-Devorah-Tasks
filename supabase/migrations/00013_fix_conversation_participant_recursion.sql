-- Fix: infinite recursion in conversation_participants SELECT policy
-- Replace self-referencing EXISTS with SECURITY DEFINER function that bypasses RLS

-- 1. Helper: check if a user is a participant of a conversation
CREATE OR REPLACE FUNCTION public.is_participant_of_conversation(conv_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = uid
  );
$$;

REVOKE ALL ON FUNCTION public.is_participant_of_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_participant_of_conversation(uuid, uuid) TO authenticated, anon, service_role;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Participants can see participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_participants;

-- 3. Recreate using the helper function
CREATE POLICY "Participants can see participants"
  ON public.conversation_participants FOR SELECT
  USING (
    public.is_participant_of_conversation(conversation_id, auth.uid())
  );

CREATE POLICY "Participants can add participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    public.is_participant_of_conversation(conversation_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can leave conversations"
  ON public.conversation_participants FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );
