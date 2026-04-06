---
phase: 05-dashboard-member-overview
plan: "01"
subsystem: tests
tags: [tdd, vitest, fixtures, DASH-01, DASH-02, DASH-03]
dependency_graph:
  requires: []
  provides: [tests/phase5/fixtures/mock-members.ts, tests/phase5/fixtures/mock-checkins.ts, tests/phase5/member-list-sorting.test.ts, tests/phase5/risk-counters.test.ts, tests/phase5/pagination.test.ts]
  affects: [src/lib/utils/members.ts]
tech_stack:
  added: []
  patterns: [TDD red-first, vitest node environment, @/ path alias]
key_files:
  created:
    - tests/phase5/fixtures/mock-members.ts
    - tests/phase5/fixtures/mock-checkins.ts
    - tests/phase5/member-list-sorting.test.ts
    - tests/phase5/risk-counters.test.ts
    - tests/phase5/pagination.test.ts
  modified: []
decisions:
  - "mockMembers uses Date.now() arithmetic (not hardcoded dates) to prevent stale fixtures"
  - "member-list-sorting.test.ts tests PASS immediately — getDaysAgo/formatLastCheckin already exist"
  - "risk-counters and pagination tests fail at import stage — classifyRisk/computeCounters/getPaginationRange/getTotalPages not yet in members.ts"
metrics:
  duration_seconds: 74
  completed_date: "2026-04-06"
  tasks_completed: 2
  files_created: 5
---

# Phase 05 Plan 01: TDD Wave-0 Test Scaffold Summary

TDD red-first wave for dashboard member overview: 5 test files created under tests/phase5/ with 28 test cases covering DASH-01 (sorting/formatting), DASH-02 (risk counters), and DASH-03 (pagination math).

## What Was Built

Two fixture files and three spec files under `tests/phase5/`:

- **mock-members.ts** — 6 Member entries covering every risk bucket: null (never checked in), 9d (inactive), 6d (at-risk), 4d (active), 1d (active), 0d (today/active). Dates computed at module eval time with `Date.now()` arithmetic.
- **mock-checkins.ts** — 150 Checkin entries for member m1, one per day going back 150 days.
- **member-list-sorting.test.ts** — 9 tests for `getDaysAgo` and `formatLastCheckin` (DASH-01) plus sort-order assertions on fixture data. Currently PASSING.
- **risk-counters.test.ts** — 9 tests for `classifyRisk` and `computeCounters` (DASH-02). Currently FAILING (RED).
- **pagination.test.ts** — 10 tests for `getPaginationRange` and `getTotalPages` (DASH-03). Currently FAILING (RED).

## Test Run State

```
Test Files: 2 failed | 1 passed (3)
Tests:      18 failed | 10 passed (28)
```

- PASS: member-list-sorting.test.ts (getDaysAgo/formatLastCheckin exist in src/lib/utils/members.ts)
- FAIL: risk-counters.test.ts — TypeError: classifyRisk is not a function
- FAIL: pagination.test.ts — TypeError: getPaginationRange is not a function

RED state is correct and expected. Plans 02 and 03 will add the missing implementations.

## Decisions Made

1. **Date arithmetic over hardcoded strings** — fixture dates use `Date.now() - N * DAY` so tests never go stale as time passes.
2. **Sorting order preserved in fixture** — mockMembers array is ordered nullsFirst (m1=null, m2=9d, m3=6d, m4=4d, m5=1d, m6=0d) matching the expected DB query sort, so sort-order tests pass without needing a sort function.
3. **Test files import from '@/lib/utils/members'** — same path Plan 02/03 will export to; no path changes needed when implementations land.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan only creates test files, no application stubs.

## Self-Check: PASSED

Files created:
- tests/phase5/fixtures/mock-members.ts — FOUND
- tests/phase5/fixtures/mock-checkins.ts — FOUND
- tests/phase5/member-list-sorting.test.ts — FOUND
- tests/phase5/risk-counters.test.ts — FOUND
- tests/phase5/pagination.test.ts — FOUND

Commits:
- fefd7ab — test(05-01): add phase5 test fixtures for members and checkins
- 3e2bd0e — test(05-01): write failing tests for DASH-01, DASH-02, DASH-03
