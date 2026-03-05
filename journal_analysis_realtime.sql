-- Enable Supabase Realtime for journal_analysis
-- Required for Emotional Trends chart to auto-update when new analysis is inserted
-- Run after journal_analysis_schema.sql

ALTER PUBLICATION supabase_realtime ADD TABLE journal_analysis;
