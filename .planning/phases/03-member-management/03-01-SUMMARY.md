---
phase: 03-member-management
plan: 01
subsystem: member-actions
tags: [server-actions, cpf-utils, tdd, zod, supabase, members]
dependency_graph:
  requires: [src/lib/supabase/server.ts, src/lib/types/database.ts, src/lib/actions/login.ts]
  provides: [src/lib/actions/members.ts, src/lib/utils/cpf.ts, src/lib/utils/members.ts]
  affects: [tests/members/actions.test.ts, tests/members/list.test.ts, tests/members/profile.test.ts]
tech_stack:
  added: [date-fns (getDaysAgo via parseISO/differenceInDays)]
  patterns: [Server Actions with useFormState pattern, Zod v4 transform+pipe for CPF validation, pt-BR error messages]
key_files:
  created:
    - src/lib/actions/members.ts
    - src/lib/utils/cpf.ts
    - src/lib/utils/members.ts
    - tests/members/actions.test.ts
    - tests/members/list.test.ts
    - tests/members/profile.test.ts
  modified: []
decisions:
  - "CPF validation strips non-digits before length check (supports formatted input like '123.456.789-01')"
  - "Unique violation detection uses error.message string match for 'email'/'cpf' (Supabase includes constraint name in message)"
  - "stripCpf applied via Zod transform before pipe to length(11) — DB always stores raw 11 digits"
  - "date-fns parseISO used for getDaysAgo — Math.max(0, ...) prevents negative day values"
metrics:
  duration_seconds: 175
  completed_date: "2026-03-30"
  tasks_completed: 3
  files_created: 6
  files_modified: 0
---

# Phase 3 Plan 01: Member Server Actions and CPF Utilities Summary

**One-liner:** Three Server Actions (create/update/deactivate) with Zod validation, CPF masking utilities, and TDD test scaffolds — logic foundation for all member UI pages.

## What Was Built

### src/lib/utils/cpf.ts
Pure CPF utility functions for Brazilian taxpayer ID handling:
- `maskCpf(cpf)` — masks to `***.***.***-XX` for display; returns `—` for null/undefined
- `isValidCpfFormat(raw)` — strips non-digits, validates exactly 11 digits (format check only, checksum deferred to Phase 9)
- `formatCpf(raw)` — formats 11-digit raw string to `123.456.789-01` for edit form display
- `stripCpf(formatted)` — strips to raw 11 digits for DB storage

### src/lib/utils/members.ts
Member helper functions:
- `getDaysAgo(isoString)` — returns null for never-checked-in members, 0 for today, positive days for past dates; uses date-fns
- `formatLastCheckin(isoString)` — formats to `—` / `hoje` / `{N}d` display strings

### src/lib/actions/members.ts
Three Server Actions with `'use server'` directive:
- `createMemberAction` — validates name/email/CPF/phone via Zod, reads `org_id` from `user.app_metadata.org_id` (JWT), inserts to DB, redirects to `/dashboard/members/{id}` on success
- `updateMemberAction` — same validation, requires `id` in FormData, updates only name/email/cpf/phone with RLS guard `.eq('org_id', org_id)`
- `deactivateMemberAction` — toggles status between `active`/`inactive` with RLS guard

All three actions:
- Never trust client-provided `org_id` — always read from JWT `app_metadata`
- Handle Supabase unique violation code `'23505'` with pt-BR messages: `'Este email já está em uso nesta academia'` / `'Este CPF já está em uso nesta academia'`

### tests/members/
Three test files covering all business logic:
- `profile.test.ts` — 5 tests: CPF masking and format validation
- `list.test.ts` — 3 tests: getDaysAgo with null, today, and past dates
- `actions.test.ts` — 3 tests: validation errors for empty name and invalid CPF format; Supabase mocked with vi.mock

## Test Results

All 29 tests pass across 5 test files (including Phase 1 and Phase 2 tests):
- `tests/members/profile.test.ts` — 5/5 passed
- `tests/members/list.test.ts` — 3/3 passed
- `tests/members/actions.test.ts` — 3/3 passed

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functions are fully implemented. No placeholder values or TODO markers.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 (RED) | 1be79ba | test(03-01): add failing test scaffolds for member actions, list, and profile |
| Task 2 (GREEN) | 5dbc36a | feat(03-01): implement CPF utilities and member helper functions |
| Task 3 (GREEN) | b9d9991 | feat(03-01): implement member Server Actions — create, update, deactivate |

## Self-Check: PASSED
