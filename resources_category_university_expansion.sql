-- Expand resources.category allowed values for university-student topics.
-- Run in Supabase SQL Editor after resources_category_migration.sql.
-- Safe to re-run: drops and recreates CHECK with full list.

ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_category_check;

ALTER TABLE public.resources
ADD CONSTRAINT resources_category_check
CHECK (
  category IN (
    'depression',
    'anxiety',
    'emotional_regulation',
    'stress_management',
    'crisis_support',
    'substance_use',
    'tuition_financial',
    'sexual_health',
    'relationships'
  )
);

COMMENT ON COLUMN public.resources.category IS
  'Structured category: mental health, university stressors (tuition/financial, substances, relationships, sexual health), crisis.';
