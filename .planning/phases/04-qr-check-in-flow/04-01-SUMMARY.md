---
phase: 04-qr-check-in-flow
plan: 01
subsystem: api

tags: [nextjs, supabase, route-handler, cpf, qr-checkin, vitest]

# Dependency graph
requires:
  - phase: 03-member-management
    provides: members table with cpf column, stripCpf/isValidCpfFormat utilities
  - phase: 01-project-scaffold-database-foundation
    provides: checkins table, organizations.qr_code_hash, createServiceRoleClient

provides:
  - POST /api/checkin route handler with QR hash validation, CPF lookup, duplicate detection, audit trail
  - tests/checkin/route.test.ts with 7 passing unit tests (all CHKN requirements)
  - middleware.ts comment documenting /checkin and /api/checkin as public routes
  - service.ts comment listing /api/checkin as allowed service-role usage

affects: [04-02-PLAN, phase-05-dashboard-member-overview]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route Handler (not Server Action) for public API that reads request.headers"
    - "createServiceRoleClient() for RLS bypass on public endpoints"
    - "vi.mock('@/lib/supabase/service') + chained vi.fn() for Supabase builder mocking"
    - "unknown intermediate cast for SupabaseClient mock type safety"

key-files:
  created:
    - src/app/api/checkin/route.ts
    - tests/checkin/route.test.ts
  modified:
    - src/middleware.ts
    - src/lib/supabase/service.ts

key-decisions:
  - "Route Handler used (not Server Action) — required for request.headers access (x-forwarded-for, user-agent)"
  - "createServiceRoleClient() used in /api/checkin to bypass RLS for org/member lookups"
  - "Inactive members return same NOT_FOUND code as unknown CPF (D-13: prevents membership enumeration)"
  - "4-hour duplicate detection window via checked_in_at >= NOW() - INTERVAL 4h"
  - "Mock cast uses 'as unknown as ReturnType<...>' to satisfy TS2352 for partial Supabase mock objects"

patterns-established:
  - "Supabase mock pattern: stateful call counter for tables accessed multiple times (checkins: dup-check vs insert)"
  - "Public route documentation: comment block above isProtected listing all public routes with explanations"

requirements-completed: [CHKN-01, CHKN-03, CHKN-04, CHKN-05, CHKN-06]

# Metrics
duration: 27min
completed: 2026-04-01
---

# Phase 4 Plan 01: POST /api/checkin Route Handler Summary

**Public QR check-in API endpoint with CPF validation, 4-hour duplicate detection, audit trail recording, and last_checked_in update — 7 unit tests passing**

## Performance

- **Duration:** 27 min
- **Started:** 2026-03-31T18:38:59Z
- **Completed:** 2026-04-01T10:45:36Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Implemented `POST /api/checkin` route handler covering all 4 response codes: `200 ok:true`, `400 DUPLICATE`, `400 NOT_FOUND`, `400 INVALID_HASH`
- 7 unit tests in `tests/checkin/route.test.ts` with full Supabase mock — no real DB required; all pass
- Documented `/checkin` and `/api/checkin` as public routes in middleware.ts and service.ts per plan D-01/D-11

## Task Commits

Each task was committed atomically:

1. **Task 1: Write test stubs (Wave 0)** - `0c7dfaa` (test)
2. **Task 2: POST /api/checkin route handler** - `2af974d` (feat)
3. **Task 3: Middleware public-path update + service.ts comment** - `f2adf50` (chore)

_Note: TDD — test file committed first, then route implementation. Both committed to green state._

## Files Created/Modified

- `src/app/api/checkin/route.ts` - POST route handler: QR hash validation, CPF member lookup, duplicate detection, checkin insert, last_checked_in update
- `tests/checkin/route.test.ts` - 7 unit tests covering all CHKN requirements (CHKN-01/03/04/05/06)
- `src/middleware.ts` - Added comment block documenting /checkin and /api/checkin as public routes
- `src/lib/supabase/service.ts` - Added /api/checkin (Phase 4) to allowed-usage comment per D-11

## Decisions Made

- Used Route Handler (not Server Action) because `request.headers` access is required for `x-forwarded-for` IP and `user-agent` audit capture (CHKN-04)
- Used `createServiceRoleClient()` to bypass RLS for org/member lookups — consistent with D-09
- Inactive member returns `NOT_FOUND` (not `INACTIVE`) — generic error prevents membership enumeration per D-13
- Mock type cast uses `as unknown as ReturnType<typeof createServiceRoleClient>` to avoid TS2352 with partial mock objects

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Supabase mock chain depth for organizations lookup**
- **Found during:** Task 1 (test stubs) — first test run
- **Issue:** Initial mock had two `.eq()` calls before `.single()` for organizations, but the route only uses one `.eq('qr_code_hash', ...)`. TypeError: `supabase.from(...).select(...).eq(...).single is not a function`
- **Fix:** Corrected mock chain to match actual query: `orgSelect → { eq: orgEq } → orgEq → { single: orgSingle }`
- **Files modified:** tests/checkin/route.test.ts
- **Verification:** All 7 tests pass after fix
- **Committed in:** f2adf50 (Task 3 commit, alongside mock TS cast fix)

**2. [Rule 1 - Bug] Fixed TypeScript TS2352 mock cast in test file**
- **Found during:** Task 3 verification (`npx tsc --noEmit`)
- **Issue:** `{ from: mockFrom } as ReturnType<typeof createServiceRoleClient>` caused TS2352 — types don't sufficiently overlap
- **Fix:** Changed to `as unknown as ReturnType<typeof createServiceRoleClient>` — standard pattern for partial mocks
- **Files modified:** tests/checkin/route.test.ts
- **Verification:** `npx tsc --noEmit` no longer reports errors from route.test.ts
- **Committed in:** f2adf50 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs in test mock setup)
**Impact on plan:** Both fixes were in test infrastructure, not production code. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in `src/lib/actions/signup.ts` (missing `qr_code_hash` in org insert) and `tests/phase1/supabase-clients.test.ts` — confirmed pre-existing before this plan's changes. Out of scope per deviation scope boundary. Logged to deferred items.

## Deferred Items

- `src/lib/actions/signup.ts:44` — TS2769: Organization insert missing `qr_code_hash` field (pre-existing since migration 004 added field but signup.ts was not updated). Blocks `npx tsc --noEmit` from fully passing.
- `tests/phase1/supabase-clients.test.ts:53` — TS2353: `qr_code_hash` does not exist on `Member` type (pre-existing test referencing old schema).

## Next Phase Readiness

- `POST /api/checkin` is ready for Plan 04-02 (check-in page at `/checkin/[hash]`)
- All 7 route tests passing; mock pattern documented for reuse in other tests
- Middleware and service.ts documentation complete

---
*Phase: 04-qr-check-in-flow*
*Completed: 2026-04-01*
