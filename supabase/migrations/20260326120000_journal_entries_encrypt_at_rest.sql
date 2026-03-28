-- Journal entry body encryption at rest (pgcrypto). Plaintext only crosses the API via view.
--
-- After apply:
--   1) Replace the default row in _safetalk_secrets with a strong passphrase (SQL editor).
--   2) Re-point any Database Webhook from journal_entries → journal_entries_enc (or rely on analyze-journal-entry fetch by id).
--   3) RLS policies must target journal_entries_enc (see journal_entries_rls.sql).

-- pgcrypto may live in `extensions` or `public` depending on project; adjust if CREATE fails.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Single-row key store; not exposed to PostgREST (no privileges for anon/authenticated).
CREATE TABLE IF NOT EXISTS public._safetalk_secrets (
  id smallint PRIMARY KEY CHECK (id = 1),
  journal_symmetric_key text NOT NULL
);

INSERT INTO public._safetalk_secrets (id, journal_symmetric_key)
VALUES (1, 'REPLACE_WITH_LONG_RANDOM_PASSPHRASE_IN_SUPABASE_SQL_EDITOR')
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON public._safetalk_secrets FROM PUBLIC;
REVOKE ALL ON public._safetalk_secrets FROM anon;
REVOKE ALL ON public._safetalk_secrets FROM authenticated;

CREATE OR REPLACE FUNCTION public._safetalk_journal_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT journal_symmetric_key FROM public._safetalk_secrets WHERE id = 1 LIMIT 1;
$$;

COMMENT ON FUNCTION public._safetalk_journal_key IS 'Symmetric key for journal content; used only in SECURITY DEFINER encrypt/decrypt helpers.';

-- Decrypt stored payload for API view. Legacy rows (no enc:v1: prefix) pass through as plaintext.
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
  -- pgp_sym_decrypt returns text, not bytea — do not use convert_from (it errors → NULL in EXCEPTION handler).
  RETURN pgp_sym_decrypt(raw, key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Encrypt plaintext before persist; idempotent if already enc:v1:...
CREATE OR REPLACE FUNCTION public.journal_entries_encrypt_content_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  key text;
BEGIN
  key := public._safetalk_journal_key();

  IF TG_OP = 'INSERT' THEN
    IF NEW.content IS NOT NULL
       AND NEW.content NOT LIKE 'enc:v1:%' THEN
      NEW.content := 'enc:v1:' || encode(
        pgp_sym_encrypt(NEW.content, key, 'compress-algo=0, cipher-algo=aes256'),
        'base64'
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.content IS NOT DISTINCT FROM OLD.content THEN
      RETURN NEW;
    END IF;
    IF NEW.content IS NOT NULL AND NEW.content NOT LIKE 'enc:v1:%' THEN
      NEW.content := 'enc:v1:' || encode(
        pgp_sym_encrypt(NEW.content, key, 'compress-algo=0, cipher-algo=aes256'),
        'base64'
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Physical table rename (once).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'journal_entries' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS color TEXT DEFAULT ''#FFFFFF''';
    EXECUTE 'ALTER TABLE public.journal_entries RENAME TO journal_entries_enc';
  END IF;
END $$;

DROP TRIGGER IF EXISTS journal_entries_encrypt_content_trig ON public.journal_entries_enc;
CREATE TRIGGER journal_entries_encrypt_content_trig
  BEFORE INSERT OR UPDATE OF content ON public.journal_entries_enc
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entries_encrypt_content_fn();

-- API-facing decrypted view (PostgREST / supabase-js use name journal_entries).
DROP VIEW IF EXISTS public.journal_entries;

CREATE VIEW public.journal_entries
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.student_id,
  e.entry_date,
  public.journal_content_plain(e.content) AS content,
  e.is_shared_with_therapist,
  e.shared_at,
  e.therapist_viewed_at,
  e.created_at,
  e.updated_at,
  e.color
FROM public.journal_entries_enc e;

COMMENT ON VIEW public.journal_entries IS 'Journal rows with decrypted content for the API. Raw ciphertext in journal_entries_enc.content.';

-- Writable view → underlying table
CREATE OR REPLACE FUNCTION public.journal_entries_view_insert_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.journal_entries_enc (
    id,
    student_id,
    entry_date,
    content,
    is_shared_with_therapist,
    shared_at,
    therapist_viewed_at,
    created_at,
    updated_at,
    color
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.student_id,
    COALESCE(NEW.entry_date, CURRENT_DATE),
    NEW.content,
    COALESCE(NEW.is_shared_with_therapist, false),
    NEW.shared_at,
    NEW.therapist_viewed_at,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now()),
    COALESCE(NEW.color, '#FFFFFF')
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.journal_entries_view_update_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.journal_entries_enc e
  SET
    student_id = COALESCE(NEW.student_id, e.student_id),
    entry_date = COALESCE(NEW.entry_date, e.entry_date),
    content = CASE
      WHEN NEW.content IS NOT NULL THEN NEW.content
      ELSE e.content
    END,
    is_shared_with_therapist = COALESCE(NEW.is_shared_with_therapist, e.is_shared_with_therapist),
    shared_at = COALESCE(NEW.shared_at, e.shared_at),
    therapist_viewed_at = COALESCE(NEW.therapist_viewed_at, e.therapist_viewed_at),
    color = COALESCE(NEW.color, e.color)
  WHERE e.id = OLD.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.journal_entries_view_delete_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.journal_entries_enc e WHERE e.id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS journal_entries_instead_of_insert ON public.journal_entries;
CREATE TRIGGER journal_entries_instead_of_insert
  INSTEAD OF INSERT ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entries_view_insert_fn();

DROP TRIGGER IF EXISTS journal_entries_instead_of_update ON public.journal_entries;
CREATE TRIGGER journal_entries_instead_of_update
  INSTEAD OF UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entries_view_update_fn();

DROP TRIGGER IF EXISTS journal_entries_instead_of_delete ON public.journal_entries;
CREATE TRIGGER journal_entries_instead_of_delete
  INSTEAD OF DELETE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entries_view_delete_fn();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO service_role;

REVOKE ALL ON public.journal_entries_enc FROM PUBLIC;
REVOKE ALL ON public.journal_entries_enc FROM anon;
GRANT INSERT, UPDATE, DELETE ON public.journal_entries_enc TO authenticated;
GRANT ALL ON public.journal_entries_enc TO service_role;
