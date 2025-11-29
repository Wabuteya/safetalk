# Student Profiles Setup Guide

This guide explains how to set up the new database-backed student alias system that replaces the previous `user_metadata` approach.

## Overview

The new system stores student aliases and profile information in a dedicated `student_profiles` table, providing:
- ✅ Consistent alias storage
- ✅ Easy querying for therapists
- ✅ Automatic alias assignment on signup
- ✅ Works for both email/password and Google OAuth signups

## Setup Steps

### 1. Create the Database Table

Run the SQL script to create the `student_profiles` table:

```sql
-- Run this in Supabase SQL Editor
\i student_profiles_schema.sql
```

Or copy and paste the contents of `student_profiles_schema.sql` into the Supabase SQL Editor and execute it.

### 2. Migrate Existing Students (Optional)

If you have existing students with aliases in `user_metadata`, run the migration script:

```sql
-- Run this in Supabase SQL Editor
\i migrate_existing_students.sql
```

This will:
- Find all existing students with aliases in `user_metadata`
- Create corresponding entries in `student_profiles`
- Preserve existing aliases, names, and other data

### 3. Verify the Setup

After running the scripts, verify that:

1. **Table exists**: Check in Supabase Dashboard → Table Editor → `student_profiles`
2. **Existing students migrated**: Run this query:
   ```sql
   SELECT COUNT(*) FROM student_profiles;
   ```
3. **New signups work**: Create a test student account and verify:
   - Profile is created automatically
   - Alias appears on dashboard
   - Therapist can see alias in caseload

## How It Works

### For New Students

1. **Email/Password Signup** (`SignUpPage.jsx`):
   - Generates random alias (adjective + noun)
   - Creates user account in `auth.users`
   - Immediately creates entry in `student_profiles` table
   - Stores alias in `localStorage` for quick access

2. **Google OAuth Signup** (`InitialAssessment.jsx`):
   - Generates random alias if user doesn't have one
   - Creates or updates entry in `student_profiles` table
   - Handles both new Google users and existing users

### For Existing Students

- Login (`Login.jsx`) fetches alias from `student_profiles` table
- Falls back to `user_metadata` if profile doesn't exist (for backward compatibility)
- Dashboard and SideNav fetch from database on load

### For Therapists

- **Caseload Page** (`CaseloadPage.jsx`):
  - Fetches all linked students
  - Joins with `student_profiles` to get aliases
  - Displays real aliases instead of "Student [ID]..."

- **Student Detail View** (`StudentDetailView.jsx`):
  - Fetches full student profile from `student_profiles`
  - Shows alias, name, contact, gender
  - Displays shared journals and other information

## Database Schema

```sql
CREATE TABLE student_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  contact TEXT,
  gender TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Components Updated

1. ✅ `SignUpPage.jsx` - Creates profile on signup
2. ✅ `InitialAssessment.jsx` - Ensures profile exists for Google OAuth users
3. ✅ `Login.jsx` - Fetches alias from database
4. ✅ `DashboardHome.jsx` - Displays alias from database
5. ✅ `SideNav.jsx` - Displays alias from database
6. ✅ `CaseloadPage.jsx` - Fetches student aliases from database
7. ✅ `StudentDetailView.jsx` - Fetches full student profile from database

## Troubleshooting

### Aliases not showing up

1. **Check if profile exists**:
   ```sql
   SELECT * FROM student_profiles WHERE user_id = 'USER_ID_HERE';
   ```

2. **Check browser console** for errors when fetching profiles

3. **Verify RLS policies** (if enabled):
   - Ensure students can read their own profile
   - Ensure therapists can read their students' profiles

### Migration issues

If migration fails:
1. Check that `auth.users` table is accessible
2. Verify user metadata structure matches expected format
3. Run migration in smaller batches if needed

### New signups not creating profiles

1. Check browser console for errors
2. Verify `student_profiles` table exists
3. Check that insert permissions are correct
4. Ensure Supabase client is properly configured

## Next Steps

- Consider adding a `bio` field to `student_profiles` for richer profiles
- Add RLS policies for security (currently disabled for stability)
- Consider allowing students to update their aliases (currently permanent)
- Add profile photo support if needed

## Notes

- Aliases are currently **permanent** - once assigned, they cannot be changed
- The system maintains backward compatibility with `user_metadata` as a fallback
- `localStorage` is used for quick access but database is the source of truth
- RLS is disabled for now to ensure stable operation (can be enabled later)

