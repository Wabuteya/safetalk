# Journal Analysis Setup

## Overview

Journal entries are automatically analyzed **asynchronously** after save:

1. **Frontend** – Saves journal, then calls `analyze-journal-entry` Edge Function in background (fire-and-forget, no await).
2. **Edge Function** – Fetches journal, runs keyword detection, calls Hugging Face emotion API, derives risk, inserts into `journal_analysis`. If `derived_risk = high`, triggers crisis creation via RPC.

## 1. Run SQL Migrations

In order:

1. `journal_analysis_schema.sql` – Creates the table
2. `journal_analysis_rls.sql` – RLS (linked therapists only)
3. `journal_analysis_trigger.sql` – **Removes** the old trigger (Edge Function handles analysis)
4. `journal_crisis_rpc.sql` – Creates `create_crisis_from_source` RPC for crisis creation from journal
5. `journal_analysis_realtime.sql` – Enables Realtime for Emotional Trends auto-update

Run in Supabase SQL editor.

## 2. Deploy Edge Function

```bash
supabase functions deploy analyze-journal-entry
```

## 3. Set Secrets

```bash
supabase secrets set HUGGINGFACE_ACCESS_TOKEN=hf_your_token_here
```

Get a token from https://huggingface.co/settings/tokens (read access is enough).

## 4. What the Edge Function Does

- **Input**: `journal_id` (from POST body or Database Webhook payload)
- **Fetches**: `content`, `student_id` from `journal_entries`
- **Keyword detection** (case-insensitive): kill myself, suicide, end my life, self harm, better off dead, don't want to live
- **Hugging Face API**: `j-hartmann/emotion-english-distilroberta-base` for emotion scores
- **Risk derivation**:
  - `keyword_flag` true → `derived_risk = high`
  - else if `sadness > 0.80` AND `fear > 0.60` → high
  - else if `sadness > 0.65` → medium
  - else → low
- **Inserts** into `journal_analysis` (upsert on `journal_id`)
- **If high**: Calls `create_crisis_from_source(student_id, 'journal_analysis')` – uses existing routing rules (primary therapist, on-call fallback)

## 5. Optional: Database Webhook

You can also invoke the Edge Function via a Database Webhook on `journal_entries` INSERT. The function accepts both `{ journal_id }` and webhook payload `{ type, table, record }`.

## 6. Frontend

`JournalPage` calls the Edge Function after a successful save. **Do not await** – the call is fire-and-forget so journal saving is never blocked.
