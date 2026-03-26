---
phase: 02-admin-authentication
plan: 02
subsystem: authentication
tags: [middleware, route-protection, session-refresh, edge-runtime]
dependency_graph:
  requires: [src/lib/supabase/server.ts, src/lib/types/database.ts]
  provides: [src/middleware.ts]
  affects: [all /dashboard/* routes, all /api/admin/* routes]
tech_stack:
  added: []
  patterns: [Next.js middleware, Edge Runtime cookie handling, Supabase getUser token refresh]
key_files:
  created: [src/middleware.ts, tests/phase2/middleware.test.ts]
  modified: []
decisions:
  - "Used createServerClient from @supabase/auth-helpers-nextjs directly in middleware (not the wrapper in src/lib/supabase/server.ts) — the server.ts wrapper uses next/headers which is unavailable in Edge Runtime"
  - "Implemented getAll/setAll cookie pattern (not deprecated get/set/remove) per @supabase/auth-helpers-nextjs v0.15.0 API"
metrics:
  duration_seconds: 149
  completed_date: "2026-03-26"
  tasks_completed: 1
  files_created: 2
---

# Phase 02 Plan 02: Route Protection Middleware Summary

**One-liner:** Next.js Edge Runtime middleware guarding /dashboard and /api/admin with Supabase getUser() token refresh and cookie propagation.

## What Was Built

`src/middleware.ts` — Next.js middleware that runs on every request (excluding static assets and images). It:

1. Creates a Supabase client using `createServerClient` from `@supabase/auth-helpers-nextjs` with request/response cookie methods (Edge Runtime compatible).
2. Calls `supabase.auth.getUser()` which refreshes expired access tokens and writes updated cookies back via Set-Cookie headers — implementing AUTH-04 (session persistence).
3. Checks whether the pathname starts with `/dashboard` or `/api/admin`.
4. Redirects unauthenticated requests to `/auth/login` — implementing AUTH-05 (route protection).
5. Passes authenticated requests through unmodified.

## Requirements Delivered

- **AUTH-04:** Token refresh on every request via `getUser()` + Set-Cookie response header. Session survives tab close/reopen.
- **AUTH-05:** `/dashboard/*` and `/api/admin/*` are protected; unauthenticated requests receive a 302 redirect to `/auth/login`; authenticated requests pass through.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] createMiddlewareClient does not exist in @supabase/auth-helpers-nextjs v0.15.0**

- **Found during:** Task 1 — TypeScript compilation
- **Issue:** Plan's action block specified `createMiddlewareClient` from `@supabase/auth-helpers-nextjs`, but the installed version (0.15.0) does not export this function. The package exports only `createServerClient` and `createBrowserClient`.
- **Fix:** Used `createServerClient` directly from `@supabase/auth-helpers-nextjs` with the `getAll`/`setAll` cookie interface (reading from `request.cookies`, writing to `response.cookies`). This is the correct Edge Runtime pattern for this package version per `02-RESEARCH.md §Pattern 2`.
- **Files modified:** `src/middleware.ts`, `tests/phase2/middleware.test.ts`
- **Commit:** d218581

**Note on acceptance criteria:** Plan acceptance criteria listed `createMiddlewareClient` as a check. Since the function doesn't exist in the installed package, the implementation uses the functionally equivalent and officially supported `createServerClient` pattern with cookie methods. The RESEARCH.md (which takes precedence as the verified reference) confirms `createServerClient` is the correct choice.

## Tests

`tests/phase2/middleware.test.ts` — 11 passing tests verifying:
- File existence
- Edge Runtime compatibility (no `next/headers` import, uses request cookies)
- AUTH-04: `getUser()` called, `auth.getSession` NOT called
- AUTH-05: `/dashboard` and `/api/admin` paths protected, redirect to `/auth/login`
- Middleware config exported with matcher

## Self-Check: PASSED

- FOUND: src/middleware.ts
- FOUND: tests/phase2/middleware.test.ts
- FOUND: .planning/phases/02-admin-authentication/02-02-SUMMARY.md
- FOUND commit: d218581
