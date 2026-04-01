---
phase: 04-qr-check-in-flow
plan: 02
subsystem: ui
tags: [nextjs, react, server-component, client-component, cpf, tailwind, vitest]

# Dependency graph
requires:
  - phase: 01-project-scaffold-database-foundation
    provides: Supabase client factories, database types, organizations/members/checkins schema
  - phase: 04-qr-check-in-flow plan 01
    provides: POST /api/checkin route contract (qr_hash + cpf -> ok/error response)
provides:
  - Public check-in page at /checkin/[hash] (Server Component validates QR hash)
  - CheckinForm Client Component (CPF mask, fetch to /api/checkin, success/error screens)
  - CPF utility functions (stripCpf, formatCpf, maskCpf, isValidCpfFormat)
  - Vitest tests for CHKN-01 and CHKN-06 under tests/checkin/
affects: [05-dashboard-member-overview, 09-polish-edge-cases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component validates QR hash upfront, passes org data to Client Component as props
    - Client Component uses vanilla JS CPF mask (no new dependency)
    - Async Server Component called directly in tests + ReactDOMServer.renderToStaticMarkup for HTML assertions
    - TDD (RED then GREEN) with vitest node environment

key-files:
  created:
    - src/app/checkin/[hash]/page.tsx
    - src/app/checkin/[hash]/CheckinForm.tsx
    - src/lib/utils/cpf.ts
    - tests/checkin/checkin-page.test.tsx
  modified:
    - src/lib/types/database.ts

key-decisions:
  - "Async Server Component tested by calling function directly + ReactDOMServer.renderToStaticMarkup (no testing-library needed)"
  - "OrgRow interface added to page.tsx to resolve TypeScript inference issue with .select('id, name') returning 'never'"
  - "cpf field on Member typed as optional (string | null | undefined) to avoid breaking Phase 1 test fixtures"

patterns-established:
  - "Server Component validates DB data upfront, renders error card inline (no redirect, no 500)"
  - "Client Component receives orgId, orgName, qrHash as props from Server Component"
  - "CPF 14-char mask applied client-side via onChange handler; stripped to 11 digits before fetch"

requirements-completed: [CHKN-01, CHKN-02, CHKN-06]

# Metrics
duration: 25min
completed: 2026-03-31
---

# Phase 4 Plan 02: Check-In Page Summary

**Public check-in page with emerald full-screen layout: Server Component validates QR hash against organizations table, renders inline error card or gym-branded CPF form via CheckinForm Client Component**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-31T15:30:00Z
- **Completed:** 2026-03-31T15:55:00Z
- **Tasks:** 3 (TDD RED + GREEN + TypeScript fix)
- **Files modified:** 5

## Accomplishments
- Check-in page at `/checkin/[hash]` validates QR hash via Supabase organizations table
- Invalid hash renders friendly "QR Code inválido" error card (no redirect, no 500)
- Valid hash renders gym name heading + CheckinForm with CPF masked input
- CheckinForm handles all API response codes: DUPLICATE, NOT_FOUND, INVALID_HASH, success
- Success screen shows member first name and formatted timestamp (pt-BR locale)
- 3/3 tests passing in tests/checkin/checkin-page.test.tsx
- npx tsc --noEmit passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Write check-in page test stubs (TDD RED)** - `271cb23` (test) — also includes cpf.ts and database.ts updates
2. **Task 2+3: Check-in page + CheckinForm implementation (TDD GREEN)** - `91e2f02` (feat)

_Note: Tasks 2 and 3 committed together as the TypeScript fix for page.tsx occurred simultaneously with CheckinForm creation._

## Files Created/Modified
- `src/app/checkin/[hash]/page.tsx` - Server Component: validates QR hash, renders error card or CheckinForm
- `src/app/checkin/[hash]/CheckinForm.tsx` - Client Component: CPF mask, fetch to /api/checkin, success/error states
- `src/lib/utils/cpf.ts` - CPF utility functions (stripCpf, formatCpf, maskCpf, isValidCpfFormat)
- `src/lib/types/database.ts` - Added qr_code_hash to Organization, cpf optional to Member
- `tests/checkin/checkin-page.test.tsx` - 3 tests: valid hash renders gym name, valid hash renders CPF input, invalid hash renders error card

## Decisions Made
- Async Server Component tested by calling function directly and using `ReactDOMServer.renderToStaticMarkup` — avoids needing @testing-library/react which is not installed; works because vitest env is 'node'
- Added `OrgRow` interface in `page.tsx` to cast `.single()` result — Supabase TS infers `never` for partial `.select('id, name')` queries
- `cpf` field on `Member` typed as `string | null | undefined` (optional) to avoid breaking Phase 1 fixture objects in existing tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript 'never' type for partial Supabase select**
- **Found during:** Task 2 (TypeScript check after creating page.tsx)
- **Issue:** `.select('id, name').single()` returns `{ data: never, error: never }` because the Supabase generated Database type doesn't model partial selections
- **Fix:** Added `OrgRow` interface and cast `.single()` result as `{ data: OrgRow | null; error: {...} | null }`
- **Files modified:** src/app/checkin/[hash]/page.tsx
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 91e2f02 (Task 2+3 feat commit)

**2. [Rule 1 - Bug] Phase 1 test broken by cpf field addition to Member**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** Phase 1 test has a Member fixture without cpf field — adding required `cpf: string | null` would break it
- **Fix:** Typed cpf as optional (`cpf?: string | null`) so existing fixtures remain valid
- **Files modified:** src/lib/types/database.ts
- **Verification:** `npx tsc --noEmit` exits 0, all tests pass
- **Committed in:** 271cb23 (Task 1 test commit, then refined in 91e2f02)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs found during TypeScript verification)
**Impact on plan:** Both fixes were necessary for correctness. No scope creep.

## Issues Encountered
- Worktree at commit `f0c376e` lacks Phase 3 code (src/lib/utils/, qr_code_hash field). Created cpf.ts and updated database.ts to provide required foundations for Phase 4 UI.
- Vitest node environment required direct function calling instead of @testing-library/react for Server Component testing.

## Known Stubs
None — all functionality is wired. CheckinForm fetches to `/api/checkin` which is built by Plan 01 (parallel). The API interface (request/response shape) is agreed per plan context.

## Next Phase Readiness
- `/checkin/[hash]` page complete and tested
- Requires Plan 01 (`/api/checkin` route) to be merged before end-to-end flow works
- Phase 5 (Dashboard member overview) can proceed independently — no dependencies on this plan

---
*Phase: 04-qr-check-in-flow*
*Completed: 2026-03-31*
