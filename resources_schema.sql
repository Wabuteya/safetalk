-- Create resources table for self-help resources
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  link VARCHAR(500), -- External link if content is not provided
  tags TEXT[] DEFAULT '{}', -- Array of tags (e.g., 'stress', 'anxiety', 'academics')
  created_by_role TEXT NOT NULL CHECK (created_by_role IN ('admin', 'therapist')),
  visibility_scope TEXT NOT NULL CHECK (visibility_scope IN ('system', 'therapist_all', 'therapist_attached')),
  therapist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable, only set if created_by_role is 'therapist'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure therapist_id is set when created_by_role is 'therapist'
  CONSTRAINT therapist_id_required_for_therapist CHECK (
    (created_by_role = 'therapist' AND therapist_id IS NOT NULL) OR
    (created_by_role = 'admin' AND therapist_id IS NULL)
  ),
  -- Ensure visibility_scope matches created_by_role
  CONSTRAINT visibility_scope_matches_role CHECK (
    (created_by_role = 'admin' AND visibility_scope = 'system') OR
    (created_by_role = 'therapist')
  ),
  -- Ensure at least one of content or link is provided
  CONSTRAINT content_or_link_required CHECK (
    (content IS NOT NULL AND content != '') OR
    (link IS NOT NULL AND link != '')
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resources_created_by_role ON public.resources(created_by_role);
CREATE INDEX IF NOT EXISTS idx_resources_visibility_scope ON public.resources(visibility_scope);
CREATE INDEX IF NOT EXISTS idx_resources_therapist_id ON public.resources(therapist_id);
CREATE INDEX IF NOT EXISTS idx_resources_tags ON public.resources USING GIN(tags); -- GIN index for array searches
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view resources based on visibility rules
-- (Role checking is handled in application layer for security)
CREATE POLICY "Authenticated users can view appropriate resources" ON public.resources
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- System resources (admin-created) are visible to all authenticated users
      visibility_scope = 'system' OR
      -- Therapist resources available to all students
      visibility_scope = 'therapist_all' OR
      -- Therapist resources for attached students only
      (
        visibility_scope = 'therapist_attached' AND
        EXISTS (
          SELECT 1 FROM public.therapist_student_relations
          WHERE therapist_student_relations.student_id = auth.uid()
          AND therapist_student_relations.therapist_id = resources.therapist_id
        )
      )
    )
  );

-- Policy: Allow authenticated users to insert resources
-- (Role validation happens in application layer)
CREATE POLICY "Authenticated users can create resources" ON public.resources
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Allow users to update resources they created
-- (Role validation happens in application layer)
CREATE POLICY "Users can update their own resources" ON public.resources
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Admins can update any resource (checked in app)
      created_by_role = 'admin' OR
      -- Therapists can update their own resources
      (created_by_role = 'therapist' AND therapist_id = auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      created_by_role = 'admin' OR
      (created_by_role = 'therapist' AND therapist_id = auth.uid())
    )
  );

-- Policy: Allow users to delete resources they created
-- (Role validation happens in application layer)
CREATE POLICY "Users can delete their own resources" ON public.resources
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Admins can delete any resource (checked in app)
      created_by_role = 'admin' OR
      -- Therapists can delete their own resources
      (created_by_role = 'therapist' AND therapist_id = auth.uid())
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_resources_updated_at ON public.resources;
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();

