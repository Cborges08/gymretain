---
phase: 02
plan: 01
subsystem: authentication
tags: [auth, server-actions, supabase, zod, jwt, organizations]
dependency_graph:
  requires:
    - 01-03 (Supabase client factories: createServerClient, createServiceRoleClient, Database types)
  provides:
    - signupAction (creates user + org + JWT app_metadata.org_id)
    - loginAction (signInWithPassword + redirect /dashboard)
    - logoutAction (signOut + redirect /auth/login)
    - requestPasswordReset (resetPasswordForEmail → /auth/reset-password)
    - confirmPasswordReset (verifyOtp + updateUser)
    - Wave 0 test stubs for all auth actions and middleware
  affects:
    - 02-02 (UI pages will call these server actions)
    - 02-03 (middleware will use createServerClient for session checks)
    - All future phases (org_id in JWT app_metadata enables RLS scoping)
tech_stack:
  added:
    - zod@^4.3.6 (input validation in server actions)
  patterns:
    - "'use server' directive on all server action files"
    - "FormData + zod.safeParse pattern for server action validation"
    - "Three-step signup: signUp → org insert → updateUserById(app_metadata)"
    - "Rollback pattern: deleteUser if org creation or metadata update fails"
    - "No email enumeration: always return same error on login failure"
key_files:
  created:
    - tests/phase2/auth-actions.test.ts
    - tests/phase2/middleware.test.ts
    - src/lib/actions/signup.ts
    - src/lib/actions/login.ts
    - src/lib/actions/logout.ts
    - src/lib/actions/reset-password.ts
  modified:
    - src/lib/types/database.ts (interface → type conversion for Row types; added Relationships/Views/Functions/Enums fields)
    - package.json (added zod@^4.3.6)
decisions:
  - "Used zod v4 (installed v4.3.6) — not v3 as listed in RESEARCH.md; v4 is current stable"
  - "signup redirects to /auth/login (not /dashboard) — requires email confirmation in production; admin must verify email first"
  - "reset-password uses NEXT_PUBLIC_SITE_URL env var for redirectTo base URL"
metrics:
  duration_seconds: 826
  completed_date: "2026-03-26"
  tasks_completed: 3
  files_created: 6
  files_modified: 2
---

# Phase 02 Plan 01: Auth Server Actions Summary

Auth server actions implemented with zod validation, rollback safety, and correct JWT org_id injection for RLS scoping.

## What Was Built

Four server action files implementing the complete admin authentication logic layer. All UI pages in Plan 02-02 will call these actions via `useActionState`. The `signupAction` implements the critical three-step pattern (signUp + org creation + app_metadata injection) that enables RLS in all future phases.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Wave 0 test stubs (auth actions + middleware) | 154e175 | tests/phase2/auth-actions.test.ts, tests/phase2/middleware.test.ts |
| 1 | Install zod + signup/login/logout actions | 8cac955 | src/lib/actions/signup.ts, src/lib/actions/login.ts, src/lib/actions/logout.ts, package.json, package-lock.json, src/lib/types/database.ts |
| 2 | Password reset actions | b07fc12 | src/lib/actions/reset-password.ts |

## Requirements Fulfilled

- **AUTH-01**: signupAction creates auth user → organizations record (name: "Minha Academia") → app_metadata.org_id via admin API; rolls back user if org fails, rolls back both if metadata fails
- **AUTH-02**: loginAction calls signInWithPassword, returns "Email ou senha incorretos" on failure (no email enumeration), redirects to /dashboard on success
- **AUTH-03**: logoutAction calls signOut, redirects to /auth/login
- **AUTH-06**: requestPasswordReset sends email with redirectTo pointing to /auth/reset-password; confirmPasswordReset calls verifyOtp then updateUser; returns "Link expirado ou inválido. Solicite um novo." on invalid token

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Database type incompatibility with @supabase/supabase-js@2.100.0**
- **Found during:** Task 1 — TypeScript compilation failed with `Argument of type '...' is not assignable to parameter of type 'never'` on `.insert()` call
- **Root cause:** (a) `interface` declarations in database.ts do NOT extend `Record<string, unknown>` (TypeScript structural typing behavior) — the newer postgrest-js requires `Row extends Record<string, unknown>`; (b) `Views: Record<string, never>` / `Functions: Record<string, never>` caused `Database['public']` to fail the `GenericSchema` constraint check
- **Fix:** Converted `Organization`, `Member`, `Checkin`, `Alert` from `interface` to `type` declarations; changed `Views/Functions/Enums` from `Record<string, never>` to `{}`; added `Relationships` arrays to all tables; added `Enums: {}` field
- **Files modified:** src/lib/types/database.ts
- **Commit:** 8cac955 (included in Task 1 commit)

## Verification Results

```
npm run test:run -- tests/phase2/   → 2 skipped, 16 todo (0 failures)
npx tsc --noEmit                    → exit 0 (no errors)
ls src/lib/actions/                 → login.ts logout.ts reset-password.ts signup.ts
grep -r "'use server'" src/lib/actions/ → all 4 files have directive
grep updateUserById src/lib/actions/signup.ts → match (D-03 JWT claim)
grep "Minha Academia" src/lib/actions/signup.ts → match (D-02 placeholder org)
grep zod package.json               → "zod": "^4.3.6"
```

## Known Stubs

None — all four server actions are fully implemented. The test files in `tests/phase2/` use `it.todo()` stubs per the Wave 0 Nyquist requirement; these are placeholders for future integration tests, not functional stubs.

## Self-Check: PASSED
