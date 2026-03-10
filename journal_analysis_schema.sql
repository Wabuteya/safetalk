-- Journal analysis table: stores sentiment/emotion scores and risk flags per journal entry
-- No journal text duplicated; references journal_entries via foreign key
-- Run after journal_entries_schema.sql

CREATE TABLE IF NOT EXISTS journal_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sadness_score FLOAT,
  fear_score FLOAT,
  anger_score FLOAT,
  joy_score FLOAT,
  neutral_score FLOAT,
  surprise_score FLOAT,
  disgust_score FLOAT,
  keyword_flag BOOLEAN NOT NULL DEFAULT false,
  derived_risk TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_analysis_journal_id ON journal_analysis(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_analysis_student_id ON journal_analysis(student_id);
CREATE INDEX IF NOT EXISTS idx_journal_analysis_keyword_flag ON journal_analysis(keyword_flag) WHERE keyword_flag = true;
CREATE INDEX IF NOT EXISTS idx_journal_analysis_created_at ON journal_analysis(created_at DESC);

COMMENT ON TABLE journal_analysis IS 'Sentiment and risk analysis per journal entry; no journal text stored.';
