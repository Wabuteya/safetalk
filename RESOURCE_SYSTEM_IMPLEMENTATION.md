# Self-Help Resource System Implementation

## Overview
A comprehensive resource management system that allows admins and therapists to upload resources, and students to view them with intelligent filtering and prioritization based on assessment data.

## Database Schema

### Table: `resources`
```sql
- id: UUID (Primary Key)
- title: VARCHAR(255) NOT NULL
- content: TEXT (nullable, but either content or link required)
- link: VARCHAR(500) (nullable, but either content or link required)
- tags: TEXT[] (array of tags like 'stress', 'anxiety', 'academics')
- created_by_role: TEXT ('admin' | 'therapist')
- visibility_scope: TEXT ('system' | 'therapist_all' | 'therapist_attached')
- therapist_id: UUID (nullable, required if created_by_role is 'therapist')
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Constraints
- At least one of `content` or `link` must be provided
- If `created_by_role` is 'therapist', `therapist_id` must be set
- If `created_by_role` is 'admin', `visibility_scope` must be 'system'

### RLS Policies
- **Admins**: Full CRUD access to all resources
- **Therapists**: Can view all resources, but only manage their own
- **Students**: Can view resources based on visibility rules (see Resource Selection Logic below)

## Resource Selection Logic

### For Students:
1. **Always Visible**:
   - Resources with `visibility_scope = 'system'` (admin-created)
   - Resources with `visibility_scope = 'therapist_all'` (therapist resources available to all)

2. **Conditionally Visible**:
   - Resources with `visibility_scope = 'therapist_attached'` are only visible if:
     - Student has a linked therapist (exists in `therapist_student_relations`)
     - Resource's `therapist_id` matches the student's linked therapist

3. **Prioritization** (if assessment exists):
   - Resources whose tags match student's assessment `challenges` are prioritized
   - Matching is done via case-insensitive partial matching
   - Prioritized resources appear in "Recommended for You" section
   - Non-matching resources appear in "General Resources" section

4. **If No Assessment**:
   - All visible resources are shown without prioritization
   - Resources are grouped by visibility scope

## Component Structure

### 1. ResourceManagement Component
**Location**: `src/components/Resources/ResourceManagement.jsx`
**Used By**: 
- Therapist Portal: `/therapist-dashboard/resources`
- Admin Portal: `/admin-dashboard/content`

**Features**:
- Create, edit, delete resources
- Set visibility scope (therapists only)
- Add tags (comma-separated)
- Provide either content or link (or both)
- View all resources in a table format

**Props**:
- `userRole`: 'admin' | 'therapist'

### 2. ResourceView Component
**Location**: `src/components/Resources/ResourceView.jsx`
**Used By**: 
- Student Portal: `/student-dashboard/resources`

**Features**:
- Fetches student's assessment data
- Fetches linked therapist relationship
- Filters resources based on visibility rules
- Prioritizes resources based on assessment tags
- Displays resources in sections:
  - "Recommended for You" (if assessment exists and matches found)
  - "Your Therapist's Resources" (if attached to therapist)
  - "General Resources" (all other visible resources)

## Example Supabase Queries

### Fetch Resources for Student
```javascript
// Step 1: Get system and therapist_all resources
const { data: generalResources } = await supabase
  .from('resources')
  .select('*')
  .or('visibility_scope.eq.system,visibility_scope.eq.therapist_all')
  .order('created_at', { ascending: false });

// Step 2: If student has linked therapist, get attached resources
if (linkedTherapistId) {
  const { data: attachedResources } = await supabase
    .from('resources')
    .select('*')
    .eq('visibility_scope', 'therapist_attached')
    .eq('therapist_id', linkedTherapistId);
  
  // Combine results
  const allResources = [...generalResources, ...attachedResources];
}
```

### Fetch Assessment for Prioritization
```javascript
const { data: assessment } = await supabase
  .from('assessments')
  .select('challenges')
  .eq('user_id', studentId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// Match resource tags with assessment challenges
const studentConcerns = (assessment?.challenges || []).map(c => c.toLowerCase());
const hasMatchingTag = resourceTags.some(tag => 
  studentConcerns.some(concern => 
    concern.includes(tag) || tag.includes(concern)
  )
);
```

## Ethical Constraints Implemented

1. **No Diagnosis**: Assessment data is only used for prioritization, not filtering
2. **No Automated Advice**: Resources are read-only for students
3. **Therapist Authority**: Therapists control their own resources
4. **Privacy**: Students see resources based on visibility rules, not personal data exposure

## File Locations

- **Schema**: `resources_schema.sql`
- **Management Component**: `src/components/Resources/ResourceManagement.jsx`
- **View Component**: `src/components/Resources/ResourceView.jsx`
- **CSS**: 
  - `src/components/Resources/ResourceManagement.css`
  - `src/components/Resources/ResourceView.css`
- **Wrappers**:
  - `src/components/Therapist/ManageResourcesPage.jsx` (therapist)
  - `src/components/Student/ResourcesPage.jsx` (student)
  - Admin uses `ResourceManagement` directly in `App.jsx`

## Next Steps

1. Run the SQL schema in Supabase: `resources_schema.sql`
2. Test resource creation as admin/therapist
3. Test resource viewing as student (with and without assessment)
4. Verify prioritization works correctly
5. Test visibility rules (attached vs all students)

