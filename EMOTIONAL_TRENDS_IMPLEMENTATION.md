# Milestone 4 — Production-Grade Therapist Emotional Trend Module

## Implementation Write-Up

This document summarizes what has been implemented for the Emotional Trends feature inside the Therapist Student Profile.

---

## Phase 1 — Emotional Trends Tab (Therapist Only)

### Implemented

1. **New tab in Student Profile**
   - **Label:** "Emotional Trends"
   - **Key:** `emotional-trends`
   - **Location:** `StudentDetailView.jsx` — added as the last tab after Therapist Notes

2. **Visibility rules**
   - Tab button renders **only** when `user?.user_metadata?.role === 'therapist'`
   - Tab content is also guarded by the same role check
   - Students never see this tab (Student Profile is under `/therapist-dashboard`, which students do not access)

3. **Component**
   - `EmotionalTrends` component created at `src/components/Therapist/EmotionalTrends.jsx`
   - Receives `studentId` as a prop

---

## Phase 2 — Secure Data Access Layer

### Implemented

1. **Data utility**
   - `src/utils/emotionalTrends.js` — `fetchJournalAnalysisForStudent(studentId)`

2. **Query fields**
   - `sadness_score`
   - `fear_score`
   - `joy_score`
   - `anger_score`
   - `derived_risk`
   - `created_at`

3. **Security**
   - **RLS:** `journal_analysis` RLS already restricts access to linked therapists via `therapist_student_relations`
   - **No journal text:** Only analysis fields are selected
   - **No shared status:** Query does not depend on `journal_entries.is_shared_with_therapist`
   - **Order:** `created_at ASC`

---

## Phase 3 — Multi-Line Emotional Trend Graph

### Implemented

1. **Chart library**
   - Uses **Recharts** (already in project)

2. **Chart configuration**
   - **X-axis:** `created_at` (time scale)
   - **Y-axis:** Fixed range 0–1

3. **Lines**
   - Sadness (purple)
   - Fear (orange)
   - Joy (green)
   - Anger (red)

4. **Behavior**
   - Smooth curves (`type="monotone"`)
   - Hover interaction via tooltip
   - Distinct colors per emotion

5. **Tooltip**
   - Formatted date
   - Sadness %
   - Fear %
   - Joy %
   - Anger %
   - Derived risk label

---

## Phase 4 — Risk Classification Overlay

### Implemented

1. **Visual markers**
   - **High risk:** Red marker (`ReferenceDot`) at top of chart
   - **Medium risk:** Orange marker at top of chart
   - **Low risk:** No marker

2. **Risk Summary Card**
   - **Latest derived risk:** Label with color (Low / Medium / High)
   - **Total high-risk occurrences:** Count
   - **7-day trend direction:** Increasing / Decreasing / Stable

---

## Phase 5 — View Separation

### Implemented

1. **Therapist view**
   - Full multi-label emotional breakdown
   - Risk overlay
   - Raw probability lines visible

2. **Student view**
   - Emotional Trends is **not** rendered for students
   - Component returns `null` when `user?.user_metadata?.role !== 'therapist'`
   - Tab is hidden for non-therapists
   - Route is under therapist dashboard; students cannot access it

3. **Guards**
   - Role guard at component level and data-fetch level (RLS)

---

## Phase 6 — Real-Time Updates

### Implemented

1. **Realtime subscription**
   - `supabase.channel('journal-analysis-{studentId}')` on `journal_analysis` table
   - Listens for `INSERT` events filtered by `student_id=eq.${studentId}`

2. **Behavior**
   - When a new analysis record is inserted, `fetchData()` is called
   - Chart updates without page refresh

3. **Database setup**
   - `journal_analysis_realtime.sql` — enables Realtime for `journal_analysis`
   - Run in Supabase SQL editor after creating the table

---

## Files Created / Modified

| File | Action |
|------|--------|
| `src/components/Therapist/EmotionalTrends.jsx` | Modified — full implementation |
| `src/components/Therapist/EmotionalTrends.css` | Modified — styles for Risk Summary, chart, tooltip |
| `src/utils/emotionalTrends.js` | **Created** — data fetching |
| `journal_analysis_realtime.sql` | **Created** — Realtime enablement |
| `JOURNAL_ANALYSIS_SETUP.md` | Modified — added realtime migration step |
| `StudentDetailView.jsx` | Modified — Emotional Trends tab (already present from previous milestone) |

---

## Constraints Satisfied

- Uses existing Recharts library
- No new heavy dependencies
- Clear separation from Mood Tracking graph (different tab, different data source)
- Therapist–student isolation via RLS and role checks
- Scales to multiple students per therapist
- No cross-student data mixing

---

## End State

**Therapist can:**
- Select a student
- Open the Emotional Trends tab
- View emotional probability trends over time
- See Low / Medium / High risk classification
- Identify high-risk spikes visually
- Monitor trajectory evolution
- Receive updates in real time when new journal analysis is inserted

**Students cannot:**
- See probability breakdown
- See risk classification overlay
- Access the therapist analytics module

---

## Setup Required

1. Run `journal_analysis_realtime.sql` in Supabase SQL editor (if not already enabled).
2. Ensure `journal_analysis` table exists and RLS is applied (see `JOURNAL_ANALYSIS_SETUP.md`).
