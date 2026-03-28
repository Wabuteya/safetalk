-- =============================================================================
-- Row Level Security: public.messages + public.conversations
-- =============================================================================
-- Run in Supabase SQL Editor after chat_system_schema.sql.
-- Apply both tables in one session (enable RLS + policies) to avoid a window
-- where one is locked down and clients break.
--
-- Model: only the student and therapist in a conversation can read/write
-- messages in that conversation. Inserts must be from auth.uid() as sender.
-- Admins: SELECT only (System Health counts) — same role claim pattern as journals.
--
-- Trigger update_conversation_on_message runs as the inserting user; participants
-- need UPDATE on conversations for updated_at bumps.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- conversations
-- -----------------------------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants select own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins select all conversations" ON public.conversations;

CREATE POLICY "Participants select own conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR therapist_id = auth.uid()
  );

CREATE POLICY "Participants insert conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      student_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.therapist_student_relations r
        WHERE r.student_id = auth.uid()
          AND r.therapist_id = conversations.therapist_id
      )
    )
    OR
    (
      therapist_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.therapist_student_relations r
        WHERE r.therapist_id = auth.uid()
          AND r.student_id = conversations.student_id
      )
    )
  );

CREATE POLICY "Participants update own conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    OR therapist_id = auth.uid()
  )
  WITH CHECK (
    student_id = auth.uid()
    OR therapist_id = auth.uid()
  );

CREATE POLICY "Admins select all conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role'
    ) = 'admin'
  );

-- -----------------------------------------------------------------------------
-- messages
-- -----------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants select messages in own conversations" ON public.messages;
DROP POLICY IF EXISTS "Participants insert messages as self" ON public.messages;
DROP POLICY IF EXISTS "Participants update messages in own conversations" ON public.messages;
DROP POLICY IF EXISTS "Admins select all messages" ON public.messages;

CREATE POLICY "Participants select messages in own conversations"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.student_id = auth.uid()
          OR c.therapist_id = auth.uid()
        )
    )
  );

CREATE POLICY "Participants insert messages as self"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND COALESCE(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role'
    ) = sender_role
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.student_id = auth.uid()
          OR c.therapist_id = auth.uid()
        )
    )
  );

CREATE POLICY "Participants update messages in own conversations"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.student_id = auth.uid()
          OR c.therapist_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.student_id = auth.uid()
          OR c.therapist_id = auth.uid()
        )
    )
  );

CREATE POLICY "Admins select all messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role'
    ) = 'admin'
  );

-- RPC used when opening chat (StudentDetailView)
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID) TO authenticated;
