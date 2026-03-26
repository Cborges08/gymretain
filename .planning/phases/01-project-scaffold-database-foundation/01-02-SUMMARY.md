---
phase: 01-project-scaffold-database-foundation
plan: "02"
subsystem: database
tags: [sql, supabase, migrations, rls, schema, indexes]
dependency_graph:
  requires: []
  provides: [database-schema, rls-policies, performance-indexes]
  affects: [all-phases]
tech_stack:
  added: []
  patterns: [supabase-rls, postgresql-indexes, jwt-app-metadata]
key_files:
  created:
    - supabase/migrations/001-init-schema.sql
    - supabase/migrations/002-rls-policies.sql
    - supabase/migrations/003-indexes.sql
  modified: []
decisions:
  - "members.status uses 'active'/'inactive' two-state model (not 'paused') to simplify MVP"
  - "checkins_insert_public policy has no TO role restriction — enables anon QR check-in (D-12)"
  - "org_id RLS scoping uses JWT app_metadata claim — requires Phase 2 auth hook to populate"
metrics:
  duration_seconds: 111
  completed_date: "2026-03-26"
  tasks_completed: 3
  files_created: 3
  files_modified: 0
---

# Phase 01 Plan 02: Database Schema Migrations Summary

**One-liner:** PostgreSQL schema with four tables, RLS blocking anon access (except checkins INSERT), and seven performance indexes for churn detection queries.

## SQL Migration Files Created

- `/supabase/migrations/001-init-schema.sql` — four tables with all columns, constraints, and foreign keys
- `/supabase/migrations/002-rls-policies.sql` — RLS enabled + 11 policies for all tables
- `/supabase/migrations/003-indexes.sql` — 7 performance indexes for churn detection and dashboard queries

## Application Instructions

Apply in numeric order by pasting each file into the **Supabase SQL Editor** (Dashboard > SQL Editor > New query):

1. `001-init-schema.sql` — creates tables
2. `002-rls-policies.sql` — enables RLS and creates policies (must run after schema)
3. `003-indexes.sql` — creates indexes (must run after schema)

These files are version-controlled for reference only. They do NOT run automatically (per D-02 — no local Supabase CLI). Plan 04 checkpoint verifies they were applied.

## Table Definitions Summary

### organizations
- `id` UUID PK, `name` TEXT NOT NULL, `admin_email` TEXT NOT NULL UNIQUE
- `created_at`, `updated_at` TIMESTAMPTZ
- Single-tenant MVP: one row per deployment

### members
- `id` UUID PK, `org_id` UUID FK → organizations
- `name`, `email` TEXT NOT NULL; `phone` TEXT nullable
- `qr_code_hash` TEXT NOT NULL, **UNIQUE** (global uniqueness, D-07)
- `qr_code_generated_at`, `last_checked_in` TIMESTAMPTZ (last_checked_in NULL until first scan)
- `status` TEXT DEFAULT 'active' (values: 'active' | 'inactive')
- `external_id` TEXT nullable — reserved for Fácil integration (D-06, MEMB-07)
- Compound UNIQUE on (org_id, email) and (org_id, external_id)

### checkins
- `id` UUID PK, `org_id` UUID FK, `member_id` UUID FK → members
- `checked_in_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `ip_address` TEXT (fraud detection, Phase 9), `user_agent` TEXT (audit trail, CHKN-04)
- Immutable audit log — no UPDATE or DELETE policies

### alerts
- `id` UUID PK, `org_id` UUID FK, `member_id` UUID FK → members
- `alert_type` TEXT DEFAULT 'churn'
- `triggered_at`, `email_sent_at` (idempotency ALRT-07), `contact_marked_at` (DASH-04), `resolved_at`
- `notes` TEXT, `created_at`, `updated_at` TIMESTAMPTZ

## RLS Policy Summary

| Table | Anon SELECT | Anon INSERT | Auth SELECT | Auth INSERT | Auth UPDATE |
|-------|-------------|-------------|-------------|-------------|-------------|
| organizations | blocked | blocked | own org (admin_email) | own org | own org |
| members | blocked | blocked | org_id scoped | org_id scoped | org_id scoped |
| checkins | blocked | **ALLOWED** | org_id scoped | org_id scoped | — |
| alerts | blocked | blocked | org_id scoped | org_id scoped | org_id scoped |

**Key design points:**
- `checkins_insert_public` uses `WITH CHECK (true)` with NO `TO` role restriction — enables anonymous QR check-in (D-12)
- org_id scoping reads from `auth.jwt() -> 'app_metadata' ->> 'org_id'` — requires Phase 2 auth hook to populate JWT
- Service role key (Phase 7 cron job) bypasses all RLS — intentional

## Index List

| Index Name | Table | Columns | Purpose |
|------------|-------|---------|---------|
| `idx_members_last_checked_in` | members | `last_checked_in DESC NULLS LAST` | Dashboard churn sort (INFR-04) |
| `idx_members_qr_code_hash` | members | `qr_code_hash` | QR scan lookup speed (INFR-04, D-08) |
| `idx_members_org_id` | members | `org_id` | Org-level member listing |
| `idx_checkins_member_id_checked_in_at` | checkins | `(member_id, checked_in_at DESC)` | Member history + 4h duplicate check (INFR-04) |
| `idx_checkins_org_id_checked_in_at` | checkins | `(org_id, checked_in_at DESC)` | Dashboard statistics |
| `idx_alerts_org_id_resolved_at` | alerts | `(org_id, resolved_at NULLS FIRST)` | Unresolved alert queries for cron + dashboard |
| `idx_alerts_member_id` | alerts | `member_id` | Member profile alert lookup |

## Decisions Made

1. **members.status two-state model** — Used 'active'/'inactive' only. ARCHITECTURE.md mentioned 'paused' but the plan explicitly required simplifying to two states for MVP.
2. **checkins_insert_public no role restriction** — Policy has no `TO authenticated` — this is intentional for anonymous QR check-in (D-12). Any `TO` restriction would block anon inserts.
3. **org_id from JWT app_metadata** — Phase 2 must set `org_id` in JWT app_metadata via Supabase Auth hook. Until then, authenticated queries return no rows (but no data leak).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — these are SQL files with no UI components. No stub data flows.

## Self-Check: PASSED

- [x] `C:/Users/GTIL/GymMVP/supabase/migrations/001-init-schema.sql` exists
- [x] `C:/Users/GTIL/GymMVP/supabase/migrations/002-rls-policies.sql` exists
- [x] `C:/Users/GTIL/GymMVP/supabase/migrations/003-indexes.sql` exists
- [x] Commit 99717c1 exists (Task 1 - schema)
- [x] Commit 7fd72a9 exists (Task 2 - RLS policies)
- [x] Commit d91db46 exists (Task 3 - indexes)
