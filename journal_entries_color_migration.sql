-- Add color column to journal_entries for mood/feeling visualization
-- Default: #FFFFFF (neutral white)
-- Run after journal_entries_schema.sql

ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#FFFFFF';

COMMENT ON COLUMN journal_entries.color IS 'Hex color representing how the user felt. Default #FFFFFF.';
