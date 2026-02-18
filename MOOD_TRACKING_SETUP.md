# Mood Tracking Setup

Optional student mood tracking is implemented and **fully independent of sentiment analysis and risk detection**. Mood data is never used for alerts, priority, or escalation.

## Access rules

- **Mood tracking is available to all signed-in students** — no therapist attachment required. Students can log mood and see the prompt regardless of whether they have a therapist.
- **Students may always view their own mood history** — from the dashboard and the Mood history page.
- **Therapist access to mood data is permitted only when the student is formally attached to that therapist** (via `therapist_student_relations`). If there is no attachment, mood data is visible only to the student. This is enforced by RLS in the database.

## Database

1. Run `mood_logs_schema.sql` to create the `mood_logs` table and indexes.
2. Run `mood_logs_rls.sql` to enable Row Level Security and attach-only therapist read access.

The table stores:

- `student_id`, `mood` (predefined value), optional `note`, `logged_at`
- At most **one log per student per calendar day** (UTC; enforced in app: overwrite if one exists today)

## Behavior

- **When we prompt**: Only if the student has **no mood log for today** (calendar day, UTC). Prompt appears on **student dashboard routes** (except chat) — never on login, chat, or crisis flows.
- **Input**: Predefined options (Great, Good, Okay, Low, Difficult) plus an optional short note (max 200 chars). Fully optional and skippable.
- **If they skip**: No record is created; we do not show the prompt again for that user for that day (sessionStorage key scoped by user id and date; cleared on sign-out).
- **Storage**: One mood per student per calendar day; if one already exists for today, the existing row is updated.
- **Student UI**: Latest mood is shown on the dashboard; "Mood history" page shows trends and history (last 7/30/90 days). Available to all students.
- **Therapist UI**: Read-only "Mood (context only)" section in a student’s profile (Overview tab) **only for students who are attached to that therapist**. Explicitly non-escalatory and non-editable.

## Files

- `mood_logs_schema.sql` – table and indexes
- `mood_logs_rls.sql` – RLS: students own data; therapists read-only for attached students only
- `src/utils/moodTracking.js` – API helpers and `MOOD_OPTIONS`
- `src/components/Student/MoodPrompt.jsx` – prompt modal
- `src/components/Student/MoodPromptGate.jsx` – when/where to show prompt
- `src/components/Student/MoodHistoryPage.jsx` – student history and trends
- `src/components/Therapist/StudentDetailView.jsx` – therapist read-only mood section

Mood is not referenced in any alert, risk, or escalation logic.
