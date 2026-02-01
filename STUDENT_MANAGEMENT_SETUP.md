# Student Management Setup Guide

## Overview

The Manage Students page provides administrators with a comprehensive interface for overseeing student accounts. This page focuses on **account management and operational control**, not therapeutic or emotional data.

## Database Requirements

### 1. Account Status Field

The component currently uses a default 'active' status. To fully support account management actions (Suspend, Reactivate, Deactivate), you need to add a `status` field to the `student_profiles` table:

```sql

-- Add status column to student_profiles table
ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' 
CHECK (account_status IN ('active', 'suspended', 'deactivated'));
-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_profiles_status 
ON student_profiles(account_status);
```

### 2. Last Login Tracking (Optional)

Currently, the component uses `created_at` as a fallback for "Last Login". To track actual last login times, you can:

**Option A: Add a last_login field to student_profiles**
```sql
ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Create index
CREATE INDEX IF NOT EXISTS idx_student_profiles_last_login 
ON student_profiles(last_login DESC);
```

Then update the login flow to set this field when students log in.

**Option B: Use Supabase Auth metadata**
Supabase stores `last_sign_in_at` in `auth.users`, but this requires server-side access or a database function to query.

## Features Implemented

### ✅ Summary Cards
- Total Students
- Active Students
- Suspended Students
- Students Without Assigned Therapist

### ✅ Student Table
- Alias (system-generated, privacy-focused)
- Account Status (Active / Suspended / Deactivated)
- Therapist Assignment (Assigned / Not Assigned)
- Change Request Status (None / Pending)
- Date Joined
- Last Login
- Actions

### ✅ Search and Filtering
- Search by alias
- Filter by account status
- Filter by therapist assignment
- Pagination (20 items per page)

### ✅ Account Actions
- **View Account**: Read-only profile metadata
- **Suspend Account**: Temporarily disable account
- **Reactivate Account**: Restore suspended account
- **Deactivate Account**: Permanently disable account
- **Handle Change Requests**: Approve or reject therapist change requests

### ✅ Change Request Integration
- Change requests are displayed in the table
- Pending requests show a "Change Request" action button
- Approval/rejection updates the therapist assignment
- Admin notes are stored for audit purposes

## Data Privacy & Ethics

✅ **What is displayed:**
- System-generated aliases (not real names)
- Account status and assignment state
- Administrative metadata (dates, IDs)

❌ **What is NOT displayed:**
- Real names or contact information
- Journal entries
- Chat previews
- Emotional indicators
- Intake answers
- Therapeutic content

## Usage

1. Navigate to **Admin Dashboard → Manage Students**
2. View summary statistics at the top
3. Use search and filters to find specific students
4. Click actions to manage accounts or handle change requests
5. Use pagination to navigate through large lists

## Account Status Workflow

1. **Active**: Default status for all new accounts
2. **Suspended**: Temporary restriction (can be reactivated)
3. **Deactivated**: Permanent removal (cannot be reactivated)

## Change Request Workflow

1. Student submits a change request (from their dashboard)
2. Request appears in the "Change Request" column as "Pending"
3. Admin clicks "Change Request" button
4. Admin reviews reason and selects Approve or Reject
5. Admin adds optional notes
6. On approval:
   - Old therapist relationship is removed
   - Student can select a new therapist
7. Request status updates to "Approved" or "Rejected"

## Integration Notes

- The standalone "Change Requests" page has been removed from navigation
- All change request handling is now integrated into Manage Students
- Change requests are shown in context with each student's account

## Future Enhancements

- Bulk actions (suspend multiple accounts)
- Export student list
- Advanced filtering (by date range, etc.)
- Account activity logs
- Email notifications for status changes

