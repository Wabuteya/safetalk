-- Add category column to resources table
-- Run after resources_schema.sql

-- Add column (with default for existing rows)
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS category TEXT;

-- Set default for existing rows that may be NULL
UPDATE public.resources
SET category = 'stress_management'
WHERE category IS NULL;

-- Add NOT NULL constraint
ALTER TABLE public.resources
ALTER COLUMN category SET NOT NULL;

-- Drop existing constraint if it exists (in case of re-run)
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_category_check;

-- Add CHECK constraint enforcing allowed values
ALTER TABLE public.resources
ADD CONSTRAINT resources_category_check
CHECK (
  category IN (
    'depression',
    'anxiety',
    'emotional_regulation',
    'stress_management',
    'crisis_support'
  )
);

-- Set default for new inserts (fallback)
ALTER TABLE public.resources
ALTER COLUMN category SET DEFAULT 'stress_management';

COMMENT ON COLUMN public.resources.category IS 'Structured category for automation. Used for resource recommendation logic.';
