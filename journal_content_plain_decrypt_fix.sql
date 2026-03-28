-- Fix NULL decrypted content on public.journal_entries view for enc:v1: rows.
-- Run once in Supabase SQL Editor if you already applied the encrypt migration.
-- Cause: journal_content_plain used convert_from(pgp_sym_decrypt(...)) but
-- pgp_sym_decrypt already returns text; the mismatch hit EXCEPTION and returned NULL.

CREATE OR REPLACE FUNCTION public.journal_content_plain(stored text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  key text;
  raw bytea;
BEGIN
  IF stored IS NULL THEN
    RETURN NULL;
  END IF;
  IF length(trim(stored)) = 0 THEN
    RETURN stored;
  END IF;
  IF stored NOT LIKE 'enc:v1:%' THEN
    RETURN stored;
  END IF;
  key := public._safetalk_journal_key();
  raw := decode(trim(substring(stored FROM 8)), 'base64');
  RETURN pgp_sym_decrypt(raw, key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;
