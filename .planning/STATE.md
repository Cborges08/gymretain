---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: Not started
status: Ready to plan
stopped_at: All 4 plans complete — pending phase verification
last_updated: "2026-03-27T11:03:19.815Z"
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** O dono da academia sabe, sem esforço, quais alunos estão sumindo — e recebe um empurrão para agir antes de perdê-los.
**Current focus:** Phase 02 — admin-authentication

## Current Status

**Phase:** 3
**Current Plan:** Not started
**Milestone:** MVP v1.0
**Last session:** 2026-03-27T00:00:00.000Z
**Stopped at:** All 4 plans complete — pending phase verification

## Decisions

- Phase 01 (Plan 01): Manual scaffold used instead of create-next-app — uppercase dir name "GymMVP" blocked npx
- Phase 01 (Plan 01): vitest environment set to 'node' — tests target server-side Supabase clients
- Phase 01: members.status uses two-state model (active/inactive) to simplify MVP
- Phase 01: checkins_insert_public has no TO role restriction — enables anonymous QR check-in (D-12)
- Phase 01: org_id RLS scoping uses JWT app_metadata — Phase 2 auth hook must populate this field
- [Phase 01]: server.ts uses createServerClient from auth-helpers-nextjs v0.15, calling cookies() to resolve the store before passing to the client
- [Phase 02]: Phase 02 Plan 02: createServerClient used in middleware directly (not wrapper) — next/headers unavailable in Edge Runtime
- [Phase 02]: Phase 02 Plan 02: getAll/setAll cookie pattern used — deprecated get/set/remove pattern avoided
- [Phase 02]: database.ts Row types use type (not interface) to satisfy @supabase/supabase-js v2.100+ GenericTable constraint (Record<string, unknown> extension requirement)
- [Phase 02]: signupAction redirects to /auth/login after signup (not /dashboard) — Supabase requires email confirmation before user can log in
- [Phase 02 Plan 03]: reset-password page uses Suspense wrapper for useSearchParams — required by Next.js 14 App Router
- [Phase 02 Plan 03]: reset-password single route handles both request and confirmation states via token_hash URL param (D-14)
- Phase 02 (Plan 04): SidebarNav extracted to Client Component for usePathname() — layout.tsx stays Server Component
- Phase 02 (Plan 04): logout.ts copied from plan 02-01 parallel wave worktree (dependency not yet merged)

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

## Milestone Progress

- [ ] Phase 1: Project Scaffold & Database Foundation
- [ ] Phase 2: Admin Authentication
- [ ] Phase 3: Member Management
- [ ] Phase 4: QR Check-In Flow
- [ ] Phase 5: Dashboard — Member Overview
- [ ] Phase 6: Dashboard — Actions & Churn Fallback
- [ ] Phase 7: Churn Detection Engine
- [ ] Phase 8: Email Alerts & Delivery
- [ ] Phase 9: Polish, Edge Cases & Launch Hardening

## Notes

- Developer: solo, 10-20h/semana
- Free tier only: Vercel hobby, Supabase free, Resend free (100 emails/dia)
- Critical: cron job (Phase 7+) DEVE usar SUPABASE_SERVICE_ROLE_KEY
- Futura integração com sistema Fácil planejada (campo external_id reservado em members)

---
*State initialized: 2026-03-25*
