-- ============================================================
-- 00011_messaging.sql
-- Ohr Devorah — Messaging System
-- ============================================================

-- 1. CONVERSATIONS
-- type='dm' = exactly 2 participants
-- type='group' = 3+ participants, any user can create
-- type='broadcast' = admin-only creation, staff read-only
-- task_id links to tasks for auto-created task chat threads
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('dm', 'group', 'broadcast')),
  title TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CONVERSATION PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- 3. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_messages_conv_time
  ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_participants_user
  ON public.conversation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_last_msg
  ON public.conversations(last_message_at DESC NULLS LAST);

-- 5. TRIGGER — update conversations.last_message_at on new message
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_insert ON public.messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- 6. TRIGGER — auto-add new users to existing broadcasts
CREATE OR REPLACE FUNCTION public.add_user_to_broadcasts()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.id
  FROM public.conversations c
  WHERE c.type = 'broadcast'
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id AND cp.user_id = NEW.id
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_add_to_broadcasts ON public.users;
CREATE TRIGGER on_user_add_to_broadcasts
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.add_user_to_broadcasts();

-- 7. TRIGGER — updated_at on messages edit
DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 8. ENABLE RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 9. RLS POLICIES — conversations

-- Only participants can read a conversation
CREATE POLICY "Participants can read conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    )
  );

-- Any authenticated user can create dm/group. Admin only for broadcast.
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    type IN ('dm', 'group')
    OR (type = 'broadcast' AND public.is_admin(auth.uid()))
  );

-- 10. RLS POLICIES — conversation_participants

CREATE POLICY "Participants can see participants"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = conversation_id AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can add participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = conversation_id AND cp2.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can leave conversations"
  ON public.conversation_participants FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- 11. RLS POLICIES — messages

CREATE POLICY "Participants can read messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id AND c.type = 'broadcast'
      )
      OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY "Sender can edit own messages"
  ON public.messages FOR UPDATE
  USING (
    sender_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Sender or admin can delete messages"
  ON public.messages FOR DELETE
  USING (
    sender_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- 12. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
