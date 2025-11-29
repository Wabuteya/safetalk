# Appointment Booking System Setup Guide

This guide explains the complete appointment booking system that allows therapists to set availability and students to book appointments.

## Overview

The system provides:
- ✅ Therapist availability management (days and time blocks)
- ✅ Student booking interface (only from available slots)
- ✅ Calendar synchronization across all views
- ✅ Contextual views (caseload vs. all appointments)
- ✅ Automatic slot blocking when booked

## Setup Steps

### 1. Create the Database Tables

Run the SQL script to create the necessary tables:

```sql
-- Run this in Supabase SQL Editor
\i appointments_schema.sql
```

Or copy and paste the contents of `appointments_schema.sql` into the Supabase SQL Editor and execute it.

This creates:
- `therapist_availability` - Stores therapist available time slots
- `appointments` - Stores booked appointments

### 2. Verify the Setup

After running the script, verify that:

1. **Tables exist**: Check in Supabase Dashboard → Table Editor
   - `therapist_availability`
   - `appointments`

2. **Test availability setup**: 
   - Log in as therapist
   - Go to Appointments → Set Availability
   - Add some time slots
   - Verify they save correctly

3. **Test booking**:
   - Log in as student (linked to therapist)
   - Click "Book Appointment"
   - Verify only available slots are shown
   - Book an appointment
   - Verify it appears in therapist's calendar

## How It Works

### 1. Therapist Availability Setup

**Location**: Therapist Dashboard → Appointments → Set Availability Tab

**Features**:
- Therapists define available days (Sunday-Saturday)
- Add multiple time blocks per day
- Only these blocks are visible to students
- Off-days and unavailable hours are automatically hidden

**Process**:
1. Therapist navigates to Appointments page
2. Clicks "Set Availability" tab
3. For each day, clicks "+ Add Time Slot"
4. Sets start and end times
5. Clicks "Save Availability"
6. Slots are saved to `therapist_availability` table

### 2. Student Appointment Booking

**Location**: Student Dashboard → Find Therapist → Book Appointment

**Features**:
- Only linked students can book
- Only shows dates when therapist has availability
- Only shows available time slots (blocks booked slots)
- Prevents double-booking
- Allows optional notes

**Process**:
1. Student clicks "Book Appointment" button
2. System fetches therapist's availability
3. Shows next 30 days with available dates
4. Student selects a date
5. System shows available time slots for that day
6. Student selects a time slot
7. Student can add optional notes
8. Student confirms booking
9. Appointment is saved to `appointments` table

### 3. Calendar Synchronization

When a student books an appointment:

**Therapist's Global Calendar** (Appointments Page):
- Appointment appears immediately
- Shows student alias
- Clickable for details

**Student Detail View** (Caseload → Student → Appointments):
- Appointment appears in student-specific list
- Shows all appointments for that student
- Separated into "Upcoming" and "Past"

**Student Dashboard**:
- Upcoming appointments widget shows next 3 appointments
- Click "Book a Session" to book more

### 4. Contextual Views

**Caseload Page → Student → Appointments Tab**:
- Shows ONLY appointments for that specific student
- Filtered by `student_id`
- Includes both upcoming and past appointments
- Shows status badges (scheduled, completed, cancelled, no_show)

**Appointments Page (Therapist)**:
- Shows ALL appointments for all linked students
- Calendar view with student aliases
- List view with all upcoming appointments
- Filtered by `therapist_id`

## Database Schema

### therapist_availability

```sql
CREATE TABLE therapist_availability (
  id UUID PRIMARY KEY,
  therapist_id UUID REFERENCES auth.users(id),
  day_of_week INTEGER (0-6),
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT TRUE
);
```

### appointments

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY,
  therapist_id UUID REFERENCES auth.users(id),
  student_id UUID REFERENCES auth.users(id),
  appointment_date DATE,
  start_time TIME,
  end_time TIME,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  student_notes TEXT
);
```

## Components

1. ✅ `AvailabilityManager.jsx` - Therapist availability setup
2. ✅ `BookAppointmentPage.jsx` - Student booking interface
3. ✅ `AppointmentsPage.jsx` - Therapist calendar view
4. ✅ `StudentDetailView.jsx` - Student-specific appointments tab
5. ✅ `UpcomingAppointmentsWidget.jsx` - Student dashboard widget

## User Flows

### Therapist Sets Availability

1. Therapist → Appointments → Set Availability
2. Select day → Add time slot → Set times
3. Repeat for all days
4. Click "Save Availability"
5. Slots are now available for booking

### Student Books Appointment

1. Student → Find Therapist → Book Appointment
2. Select date (only available dates shown)
3. Select time slot (only available slots shown)
4. Add optional notes
5. Confirm booking
6. Appointment appears in all views

### Therapist Views Appointments

1. **All Appointments**: Appointments page → Calendar view
   - See all students' appointments
   - Click for details

2. **Student-Specific**: Caseload → Student → Appointments tab
   - See only that student's appointments
   - Past and upcoming separated

## Features

- **Automatic Slot Blocking**: Booked slots are automatically hidden
- **Double-Booking Prevention**: Database constraint prevents overlapping appointments
- **Real-Time Updates**: Appointments appear immediately after booking
- **Privacy Protection**: Only student aliases shown (no personal details)
- **Status Tracking**: scheduled, completed, cancelled, no_show
- **Notes Support**: Both therapist and student notes

## Troubleshooting

### No available dates showing

1. Check therapist has set availability
2. Verify `therapist_availability` table has entries
3. Check `is_available = true`
4. Verify day_of_week matches selected date

### Booking fails

1. Check student is linked to therapist
2. Verify slot is still available (may have been booked)
3. Check database constraints (no overlapping appointments)
4. Verify appointment_date is in the future

### Appointments not appearing

1. Check appointment status (only 'scheduled' shown by default)
2. Verify date filtering (only future dates shown)
3. Check student/therapist relationship exists
4. Refresh page to reload data

## Next Steps

- Add email notifications for appointments
- Add appointment cancellation for students
- Add appointment rescheduling
- Add recurring appointment support
- Add appointment reminders
- Enable RLS policies for security

## Notes

- Availability is stored per day of week (not specific dates)
- Appointments are stored with specific dates
- Booked slots are checked in real-time before booking
- Only linked students can book appointments
- RLS is disabled for now (can be enabled later)

