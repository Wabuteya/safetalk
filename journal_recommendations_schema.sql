-- Journal recommendations: links journal entries to recommended resources
-- Run after journal_entries_schema.sql and resources_schema.sql

CREATE TABLE IF NOT EXISTS public.journal_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_recommendations_journal
ON journal_recommendations(journal_id);

CREATE INDEX IF NOT EXISTS idx_journal_recommendations_student
ON journal_recommendations(student_id);

CREATE INDEX IF NOT EXISTS idx_journal_recommendations_resource
ON journal_recommendations(resource_id);

COMMENT ON TABLE journal_recommendations IS 'Tracks which resources were recommended for which journal entries.';
