# Resources Category Setup

## Overview

Resources now support structured categories for automation. Category is required when creating/editing resources. Medium-risk journal entries trigger a "Recommended for You" resource section.

## 1. Run SQL Migrations

In Supabase SQL Editor, run in order:

1. `resources_category_migration.sql` – Adds `category` column with CHECK constraint
2. `journal_analysis_rls.sql` – Restricts journal_analysis to linked therapists only (no student access)
3. `journal_analysis_medium_risk_rpc.sql` – RPC for students to check medium-risk status (returns boolean only, no data exposure)

## 2. Database Schema

- **category** TEXT NOT NULL
- Allowed values: `depression`, `anxiety`, `emotional_regulation`, `stress_management`, `crisis_support`
- CHECK constraint enforces values at insert/update (backend validation)

## 3. Application Changes

### Resource Creation (Admin & Therapist)

- Required **Category** dropdown added to create/edit form
- Values match database constraint exactly
- No free-text input
- Validation: submission rejected if category missing; database CHECK enforces valid values

### Resource Recommendation (Medium-Risk)

When a student has a journal entry with `derived_risk = 'medium'` (checked via `has_medium_risk_journal` RPC—no direct access to emotion scores or derived_risk):

- A "Recommended for You" section is shown at the top of the Resources page
- Includes resources from:
  - **Admin**: `visibility_scope = 'system'`
  - **Therapist**: `visibility_scope = 'therapist_all'` OR (`visibility_scope = 'therapist_attached'` AND therapist matches student's assigned therapist)

### Tags

- Tags remain for search/filter UI only
- Not used for automation or recommendation logic
