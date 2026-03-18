# SafeTalk — Technical Scope Document

## 1. Executive Summary

SafeTalk is a web-based mental health support platform connecting students with therapists. It provides journaling, mood tracking, crisis detection and escalation, secure messaging, appointment scheduling, and resource management. The system serves three user roles: **Students**, **Therapists**, and **Administrators**.

---

## 2. What Belongs in a Technical Scope Write-Up

A technical scope document typically includes:

| Section | Purpose |
|---------|---------|
| **Functional requirements** | What the system does — features, user flows, business logic |
| **Non-functional requirements** | How the system behaves — performance, security, reliability |
| **Architecture & tech stack** | Technologies, integrations, deployment model |
| **Data model** | Key entities, relationships, storage |
| **Integrations** | External APIs, third-party services |
| **Constraints & assumptions** | Known limits, dependencies, prerequisites |

---

## 3. Functional Requirements

### 3.1 User Roles & Authentication

| Role | Description |
|------|-------------|
| **Student** | End users seeking mental health support |
| **Therapist** | Licensed professionals managing caseloads |
| **Admin** | Platform administrators managing users and content |

**Authentication:**
- Email/password sign-in
- Google OAuth (students)
- Invite-based therapist onboarding (admin sends invite; therapist sets password)
- Password reset and set-password flows
- Account status enforcement: suspended/deactivated students cannot access the app

### 3.2 Student Features

| Feature | Description |
|---------|-------------|
| **Journal** | Private journal entries; optional sharing with assigned therapist |
| **Mood tracking** | Log mood (1–5 scale) with optional notes; view history and trends |
| **Crisis support** | In-app crisis flow; triggers crisis event and routes to therapist/on-call |
| **Resources** | Browse curated mental health resources (public, therapist-assigned) |
| **Find therapist** | View assigned therapist; request therapist change |
| **Appointments** | Book, view, reschedule appointments with therapist |
| **Chat** | Secure messaging with assigned therapist |
| **Profile** | Alias, preferences; limited PII for privacy |
| **Initial assessment** | Onboarding assessment form |

### 3.3 Therapist Features

| Feature | Description |
|---------|-------------|
| **Caseload** | List of assigned students with summary cards |
| **Student detail** | Per-student view: overview, chat, journals, appointments, notes, emotional trends |
| **Journals** | View shared journal entries; unviewed count badge; mark as viewed on tab open |
| **Crisis alerts** | Real-time crisis events; acknowledge, escalate, resolve; 15-minute SLA |
| **Appointments** | Manage availability; view and manage appointments |
| **Therapist notes** | Private notes per student |
| **Emotional trends** | AI-derived sentiment/emotion from journal analysis |
| **Chat** | Secure messaging with students |
| **Resources** | Manage therapist-scoped resources |

### 3.4 Admin Features

| Feature | Description |
|---------|-------------|
| **Manage students** | List, search, filter; deactivate/suspend accounts |
| **Manage therapists** | Add therapist (invite), reset password, deactivate/reactivate |
| **Manage content** | CRUD for resources (tags, categories, visibility scope) |
| **Change requests** | Review student therapist-change requests |
| **Dashboard** | Aggregated stats (users, appointments, crises, journals) |

### 3.5 Crisis System

| Capability | Description |
|------------|-------------|
| **Detection** | Journal analysis (keyword + emotion ML) derives risk; high risk triggers crisis |
| **Creation** | Crisis events created from journal analysis or manual Crisis Support flow |
| **Routing** | Primary therapist or on-call pool if primary unavailable |
| **Acknowledgement** | 15-minute window; escalation if unacknowledged |
| **Realtime** | Supabase Realtime + push notifications for new crises |
| **Resolution** | Mark resolved; post-crisis banner for student |

### 3.6 Journal Analysis Pipeline

| Step | Description |
|------|-------------|
| **Trigger** | Database webhook on `journal_entries` INSERT |
| **Keyword check** | Suicide/self-harm phrase detection |
| **Emotion ML** | Hugging Face emotion model (sadness, fear, anger, etc.) |
| **Risk derivation** | High / medium / low based on keywords + emotion scores |
| **Actions** | High → crisis; Medium → resource recommendations; Low → no action |
| **Storage** | Results in `journal_analysis` table |

---

## 4. Non-Functional Requirements

### 4.1 Security

| Requirement | Implementation |
|-------------|----------------|
| **Authentication** | Supabase Auth (JWT, session management) |
| **Authorization** | Role-based access; `user_metadata.role` |
| **Data isolation** | Row-level security (RLS) on Supabase tables |
| **Account status** | Suspended/deactivated students blocked at login and context |
| **Sensitive data** | Student contact details hidden; reveal only for emergency |
| **API security** | Edge functions verify JWT; service role for admin operations |

### 4.2 Privacy & Compliance

| Requirement | Implementation |
|-------------|----------------|
| **Student anonymity** | Alias-based display; limited PII exposure |
| **Therapist–student relationship** | `therapist_student_relations` enforces access |
| **Journal sharing** | Explicit opt-in; therapist sees only shared entries |
| **Audit trail** | Crisis routing log; therapist notes timestamps |

### 4.3 Performance

| Requirement | Target |
|-------------|--------|
| **Page load** | Initial load < 3s (typical SPA) |
| **Realtime** | Crisis alerts delivered within seconds |
| **API latency** | Supabase REST < 500ms for typical queries |
| **Journal analysis** | Async; does not block journal save |

### 4.4 Availability & Reliability

| Requirement | Implementation |
|-------------|----------------|
| **Uptime** | Supabase-hosted; follows provider SLA |
| **Crisis reliability** | Realtime + push; fallback to polling if needed |
| **Error handling** | Graceful degradation; user-facing error messages |
| **Retry logic** | Profile fetch retries on network errors |

### 4.5 Scalability

| Requirement | Notes |
|-------------|-------|
| **Concurrent users** | Supabase scales; connection pooling available |
| **Data growth** | Mood logs, journals, messages retained; pagination where needed |
| **Edge functions** | Deno-based; stateless; suitable for horizontal scaling |

### 4.6 Usability & Accessibility

| Requirement | Notes |
|-------------|-------|
| **Responsive design** | Mobile-friendly layouts |
| **Crisis UX** | Clear, low-friction crisis flow |
| **Loading states** | Loading indicators; skeleton where appropriate |
| **Error messages** | User-friendly, actionable messages |

---

## 5. Architecture & Tech Stack

### 5.1 Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **Vite 7** | Build tool, dev server, HMR |
| **React Router 7** | Client-side routing |
| **Recharts / Chart.js** | Mood charts, emotional trends |
| **Lottie** | Animated illustrations |

### 5.2 Backend & Data

| Technology | Purpose |
|------------|---------|
| **Supabase** | BaaS: Auth, PostgreSQL, Realtime, Storage |
| **PostgreSQL** | Primary data store |
| **Supabase Realtime** | Live crisis alerts, chat presence |
| **Supabase Edge Functions** | Serverless (Deno): `invite-therapist`, `analyze-journal-entry` |

### 5.3 External Integrations

| Service | Purpose |
|---------|---------|
| **Hugging Face** | Emotion classification for journal analysis |
| **Google OAuth** | Student sign-in |

### 5.4 Key Data Entities

| Entity | Purpose |
|--------|---------|
| `auth.users` | Supabase Auth users |
| `student_profiles` | Student alias, account_status, PII (restricted) |
| `therapist_profiles` | Therapist name, email, status, availability |
| `therapist_student_relations` | Caseload assignments |
| `journal_entries` | Journal content, shared flag, therapist_viewed_at |
| `journal_analysis` | Emotion scores, derived_risk, resource recommendations |
| `mood_logs` | Mood value, note, logged_at |
| `crisis_events` | Crisis status, routing, acknowledgement |
| `on_call_pool` | Therapists available for crisis routing |
| `conversations`, `messages` | Chat |
| `appointments`, `therapist_availability` | Scheduling |
| `therapist_notes` | Private therapist notes per student |
| `resources` | Curated content; visibility_scope (system, therapist_all, therapist_attached) |

---

## 6. Constraints & Assumptions

| Constraint / Assumption | Notes |
|-------------------------|-------|
| **Supabase dependency** | Core platform; migration would require significant rework |
| **Hugging Face token** | Required for full journal analysis; falls back to heuristics if missing |
| **Browser support** | Modern browsers (Chrome, Firefox, Safari, Edge) |
| **Mobile** | Responsive web; no native app |
| **Crisis SLA** | 15-minute acknowledgement window; escalation to on-call |
| **Student sign-up** | Email or Google; role set at sign-up |

---

## 7. Out of Scope (Current)

- Native mobile apps
- Video/voice therapy
- Billing or payments
- Multi-tenant organization hierarchy
- Custom reporting/analytics dashboard
- HIPAA-specific compliance documentation (consult legal)

---

## 8. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-02-06 | — | Initial draft |
