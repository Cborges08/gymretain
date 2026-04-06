---
phase: 05-dashboard-member-overview
plan: 02
subsystem: ui
tags: [next.js, typescript, tailwind, vitest, risk-classification]

requires:
  - phase: 05-01
    provides: "TDD test scaffold with failing risk-counters.test.ts and member-list-sorting.test.ts"

provides:
  - "classifyRisk(days) → active/at_risk/inactive — risk thresholds per D-07"
  - "computeCounters(members) → {active, atRisk, inactive} — single-pass from same fetch"
  - "DashboardCounters section on /dashboard/members with Ativos/Em risco/Inativos cards"
  - "Table columns updated: Nome | Email | Dias sem aparecer | Nível de risco"
  - "Risk badges: emerald (Ativo), amber (Em risco), gray (Inativo)"

affects:
  - 05-dashboard-member-overview
  - 06-dashboard-actions-churn-fallback

tech-stack:
  added: []
  patterns:
    - "computeCounters derives stats from the same memberList fetch — no second DB call (D-08)"
    - "Risk badge rendered inline via IIFE in JSX to keep Server Component without extracting client component"

key-files:
  created: []
  modified:
    - src/lib/utils/members.ts
    - src/app/(dashboard)/members/page.tsx

key-decisions:
  - "Risk thresholds: <=4d active, 4<d<=7 at_risk, >7 or null inactive — matches D-07 spec exactly"
  - "computeCounters consumes same memberList array, avoiding second Supabase query per D-08"
  - "Risk badge IIFE stays inside Server Component — no 'use client' needed for this interaction"

patterns-established:
  - "Single-pass risk aggregation: compute counters from fetched list, no extra query"
  - "classifyRisk boundary: days === 4 is active (<=4), days === 5 is at_risk (>4)"

requirements-completed: [DASH-01, DASH-02]

duration: 2min
completed: 2026-04-06
---

# Phase 5 Plan 02: Dashboard Member Overview Summary

**Risk classification utilities (classifyRisk/computeCounters) added to members.ts, members page upgraded with three risk-counter cards and updated table columns (Dias sem aparecer + Nível de risco), turning 18 TDD tests green.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-06T15:32:32Z
- **Completed:** 2026-04-06T15:33:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `classifyRisk` and `computeCounters` to `src/lib/utils/members.ts` — risk thresholds per D-07
- Risk counters section (Ativos/Em risco/Inativos) now renders above the member table with correct counts derived from same DB fetch
- Table columns replaced: removed "Último check-in" and "Status", added "Dias sem aparecer" and "Nível de risco" with color-coded badges

## Task Commits

Each task was committed atomically:

1. **Task 1: Add classifyRisk and computeCounters to members.ts** — `815a14e` (feat)
2. **Task 2: Enhance members/page.tsx — counters + updated columns** — `612ed7b` (feat)

**Plan metadata:** (docs commit — see final_commit below)

## Files Created/Modified

- `src/lib/utils/members.ts` — Added `classifyRisk(days)` and `computeCounters(members)` after existing getDaysAgo/formatLastCheckin
- `src/app/(dashboard)/members/page.tsx` — Added DashboardCounters section, updated imports, replaced table columns

## Decisions Made

- Risk boundaries match D-07 exactly: days <= 4 → active, 4 < days <= 7 → at_risk, days > 7 or null → inactive
- `computeCounters` takes the same `memberList` used for rendering — no second Supabase query (D-08 compliance)
- Risk badge rendered via IIFE inside Server Component JSX — avoids need for client component extraction

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — both tasks executed cleanly. TypeScript errors in `tests/phase5/pagination.test.ts` are expected (imports `getPaginationRange`/`getTotalPages` not yet implemented — Plan 03 scope).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DASH-01 (sorted member list with days-absent) and DASH-02 (risk counters above table) satisfied
- `classifyRisk` and `computeCounters` available for Plan 03 pagination logic
- TypeScript compiles clean for modified files; pagination.test.ts remains RED awaiting Plan 03

---
*Phase: 05-dashboard-member-overview*
*Completed: 2026-04-06*

## Self-Check: PASSED

- FOUND: src/lib/utils/members.ts
- FOUND: src/app/(dashboard)/members/page.tsx
- FOUND: .planning/phases/05-dashboard-member-overview/05-02-SUMMARY.md
- Commit 815a14e verified
- Commit 612ed7b verified
