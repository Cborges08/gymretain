---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 1
status: Executing Phase 04
stopped_at: Completed 04-02-PLAN.md (Check-in page Server Component and CheckinForm)
last_updated: "2026-04-01T11:05:58.994Z"
progress:
  total_phases: 9
  completed_phases: 4
  total_plans: 15
  completed_plans: 15
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** O dono da academia sabe, sem esforco, quais alunos estao sumindo e recebe um empurrao para agir antes de perde-los.
**Current focus:** Phase 04 — qr-check-in-flow

## Current Status

**Phase:** 4
**Current Plan:** 1
**Milestone:** MVP v1.0
**Last session:** 2026-04-01T11:05:58.991Z
**Stopped at:** Completed 04-02-PLAN.md (Check-in page Server Component and CheckinForm)

## Decisions

- Phase 01 (Plan 01): Manual scaffold used instead of create-next-app - uppercase dir name "GymMVP" blocked npx
- Phase 01 (Plan 01): vitest environment set to 'node' - tests target server-side Supabase clients
- Phase 01: members.status uses two-state model (active/inactive) to simplify MVP
- Phase 01: checkins_insert_public has no TO role restriction - enables anonymous QR check-in (D-12)
- Phase 01: org_id RLS scoping uses JWT app_metadata - Phase 2 auth hook must populate this field
- [Phase 01]: server.ts uses createServerClient from auth-helpers-nextjs v0.15, calling cookies() to resolve the store before passing to the client
- [Phase 02]: Phase 02 Plan 02: createServerClient used in middleware directly (not wrapper) - next/headers unavailable in Edge Runtime
- [Phase 02]: Phase 02 Plan 02: getAll/setAll cookie pattern used - deprecated get/set/remove pattern avoided
- [Phase 02]: database.ts Row types use type (not interface) to satisfy @supabase/supabase-js v2.100+ GenericTable constraint (Record<string, unknown> extension requirement)
- [Phase 02]: signupAction redirects to /auth/login after signup (not /dashboard) - Supabase requires email confirmation before user can log in
- [Phase 02 Plan 03]: reset-password page uses Suspense wrapper for useSearchParams - required by Next.js 14 App Router
- [Phase 02 Plan 03]: reset-password single route handles both request and confirmation states via token_hash URL param (D-14)
- Phase 02 (Plan 04): SidebarNav extracted to Client Component for usePathname() - layout.tsx stays Server Component
- Phase 02 (Plan 04): logout.ts copied from plan 02-01 parallel wave worktree (dependency not yet merged)
- [Phase 03]: Server Component reads org_id from JWT app_metadata for member list query
- [Phase 03]: nullsFirst on last_checked_in ensures never-checked-in members appear first
- [Phase 03]: QR code page split into two files (page.tsx + QRCodeDisplay.tsx) because 'use client' cannot appear mid-file in Next.js
- [Phase 03]: CPF validation strips non-digits before length check (supports formatted input like 123.456.789-01)
- [Phase 03]: Unique violation detection uses error.message string match for email/cpf constraint names
- [Phase 03]: stripCpf applied via Zod transform before pipe to length(11) - DB always stores raw 11 digits
- [Phase 03]: Error displayed as single banner above form actions (not per-field) - createMemberAction returns one error string
- [Phase 03]: noValidate on form defers validation to server action; CPF maxLength=14 accommodates formatted input
- [Phase 03]: DeactivateButton and ReactivateButton extracted as Client Components - useFormState required for 2-arg server action signatures (TS2322 fix)
- [Phase 03]: Edit form cancel returns to profile page /dashboard/members/{id}, not list - correct UX for edit cancel
- [Phase 04]: Async Server Component tested by calling function directly + ReactDOMServer.renderToStaticMarkup (no testing-library needed, vitest node env)
- [Phase 04]: OrgRow interface added to page.tsx to resolve TypeScript inference issue with Supabase partial .select() returning 'never'

## Performance Metrics

| Phase | Plan | Duration (s) | Tasks | Files |
|-------|------|--------------|-------|-------|
| 01    | 01   | 254          | 3     | 13    |
| 01    | 02   | 111          | 3     | 3     |
| Phase 01 P03 | 190 | 3 tasks | 6 files |
| Phase 02 P02 | 149 | 1 tasks | 2 files |
| Phase 02 P01 | 826 | 3 tasks | 8 files |
| 02    | 03   | 149          | 2     | 4     |
| 02    | 04   | 420          | 3     | 5     |
| Phase 03 P02 | 75 | 2 tasks | 2 files |
| Phase 03 P05 | 82 | 1 tasks | 2 files |
| Phase 03 P01 | 175 | 3 tasks | 6 files |
| Phase 03 P03 | 120 | 1 tasks | 1 files |
| Phase 03 P04 | 1080 | 2 tasks | 5 files |
| Phase 04 P02 | 1500 | 3 tasks | 5 files |

## Milestone Progress

- [ ] Phase 1: Project Scaffold & Database Foundation
- [ ] Phase 2: Admin Authentication
- [ ] Phase 3: Member Management
- [ ] Phase 4: QR Check-In Flow
- [ ] Phase 5: Dashboard - Member Overview
- [ ] Phase 6: Dashboard - Actions & Churn Fallback
- [ ] Phase 7: Churn Detection Engine
- [ ] Phase 8: Email Alerts & Delivery
- [ ] Phase 9: Polish, Edge Cases & Launch Hardening

## Notes

- Developer: solo, 10-20h/semana
- Free tier only: Vercel hobby, Supabase free, Resend free (100 emails/dia)
- Critical: cron job (Phase 7+) DEVE usar SUPABASE_SERVICE_ROLE_KEY
- Futura integracao com sistema Facil planejada (campo external_id reservado em members)

---
*State initialized: 2026-03-25*
