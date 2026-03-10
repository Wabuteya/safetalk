-- Journal analysis: Edge Function handles full analysis asynchronously.
-- The trigger is REMOVED so analyze-journal-entry Edge Function does the full insert.
-- Invoke via: (1) Frontend fire-and-forget after save, or (2) Database Webhook on journal_entries INSERT.
--
-- Run journal_crisis_rpc.sql for crisis creation from journal.
-- Set HUGGINGFACE_ACCESS_TOKEN in Supabase Edge Function secrets for emotion API.

DROP TRIGGER IF EXISTS trigger_analyze_journal_on_insert ON journal_entries;
DROP FUNCTION IF EXISTS analyze_journal_on_insert();
