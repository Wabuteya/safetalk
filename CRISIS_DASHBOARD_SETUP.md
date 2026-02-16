# Crisis Dashboard Setup

The therapist dashboard includes crisis awareness and prioritization. All features live on the **existing** dashboard home (no new page).

## Database

1. Run `crisis_events_schema.sql` to create the `crisis_events` table.
2. Run `crisis_acknowledgement_timer_schema.sql` to add the 5-minute acknowledgement timer, escalation, and state transition logging.

This creates/updates `crisis_events` (including `acknowledgement_due_at`, `escalated_at`, `unacknowledged`) and `crisis_state_log` (all state transitions with timestamps).

**Creating a crisis:** Use `createCrisisEvent(studentId, therapistId, source)` from `src/utils/crisisEvents.js`. It sets status to `triggered` and starts the 5-minute acknowledgement timer.

## Acknowledgement timer (5 minutes)

- When a crisis is **triggered**: status = `triggered`, `acknowledgement_due_at` = triggered_at + 5 min.
- If the therapist clicks **Acknowledge** before the timer expires: status → `acknowledged`, timer cleared.
- If the timer expires without acknowledgement: status → `escalated`, `unacknowledged` = true. Dashboard polls every 30s and updates accordingly.
- All state transitions are logged in `crisis_state_log` with timestamps.
- Timers and escalation logic are **not** exposed to students.

## Dashboard behavior

- **Crisis banner**  
  Shown at the top when there is at least one non‑resolved crisis. Displays student **alias** (no real name), time triggered, **elapsed time**, and status. Actions: **Open case** (navigates to student profile and sets status to In Progress), **Acknowledge** (only when status is triggered and timer has not expired). Escalated crises show “(unacknowledged)”. Banner stays until the crisis is resolved.

- **Crisis alerts section**  
  Lists all triggered, escalated, acknowledged, and in‑progress crises. Each row: alias, status, timestamp, **elapsed time**, **View case**, **Acknowledge** (if triggered and not expired), **Resolve**. Sorted by urgency (triggered > escalated > acknowledged > in_progress) then by time.

- **Status flow**  
  triggered → Acknowledge (in time) → acknowledged. triggered → timer expires → escalated. Opening the case sets status to In Progress. **Resolve** is explicit only (therapist clicks Resolve).

- **Availability**  
  Therapist status (Online / Away / Offline) from `therapist_profiles.status` is used only on the dashboard: a short internal hint (“You’re online” / “Consider going online for crisis response”) so routing awareness is clear. Not shown to students.

- **Privacy**  
  Only student **alias** is shown on the dashboard. No real names or contact information. Internal escalation states are not exposed to students.

## On-call therapist fallback

Run `crisis_on_call_fallback_schema.sql` to add:

- **on_call_pool** – list of therapist user_ids who receive fallback crises.
- **crisis_events**: `handled_by_id` (who is handling), `routed_to_on_call_at` (when offered to on-call pool).
- **crisis_routing_log** – audit of routing, acknowledgements, handler changes.

**When a crisis is routed to on-call:** (1) Assigned therapist is away or offline at trigger time, or (2) crisis reaches escalated state (timer expired). On-call therapists see these in an **On-call pool** section on their dashboard. The first to click **Acknowledge** becomes the active handler (`handled_by_id`). Fallback routing and availability are not shown to students.

**Add a therapist to the on-call pool:**

```sql
INSERT INTO on_call_pool (therapist_id) VALUES ('<therapist-user-uuid>');
```

**Remove:** `DELETE FROM on_call_pool WHERE therapist_id = '<uuid>';`

## Files

- `crisis_events_schema.sql` – table and trigger
- `crisis_acknowledgement_timer_schema.sql` – timer columns, escalated state, state log
- `crisis_on_call_fallback_schema.sql` – on-call pool, handled_by_id, routed_to_on_call_at, crisis_routing_log
- `src/utils/crisisEvents.js` – fetch (primary + on-call), escalate→on-call, acknowledge (sets handler), create (checks availability), audit log
- `src/components/Therapist/TherapistDashboardHome.jsx` – banner, alerts section, actions, availability hint
- `src/components/Therapist/TherapistDashboard.css` – crisis banner and list styles (calm hierarchy)
- `src/components/Therapist/TherapistDashboard.jsx` – placeholder banner removed; crisis UI is only on home
