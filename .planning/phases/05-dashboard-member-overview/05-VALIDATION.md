---
phase: 5
slug: dashboard-member-overview
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 + node environment |
| **Config file** | `vitest.config.ts` (existing from Phase 1) |
| **Quick run command** | `npm run test:run -- tests/phase5/` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~10 seconds (quick), ~20 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- tests/phase5/`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| Wave 0 | 05-01 | 0 | DASH-01, DASH-02, DASH-03 | unit | `npm run test:run -- tests/phase5/` | ❌ Wave 0 creates | pending |
| Member list sort | 05-02 | 1 | DASH-01 | unit | `npm run test:run -- tests/phase5/member-list-sorting.test.ts` | ❌ Wave 0 | pending |
| Risk counters | 05-02 | 1 | DASH-02 | unit | `npm run test:run -- tests/phase5/risk-counters.test.ts` | ❌ Wave 0 | pending |
| Pagination | 05-03 | 1 | DASH-03 | unit | `npm run test:run -- tests/phase5/pagination.test.ts` | ❌ Wave 0 | pending |

---

## Wave 0 Required Files

- [ ] `tests/phase5/member-list-sorting.test.ts` — DASH-01: sort order, nullsFirst behavior, getDaysAgo output
- [ ] `tests/phase5/risk-counters.test.ts` — DASH-02: threshold logic (≤4 active, 4-7 at-risk, >7 inactive, null→inactive)
- [ ] `tests/phase5/pagination.test.ts` — DASH-03: range calculation, count: exact, totalPages math
- [ ] `tests/phase5/fixtures/mock-members.ts` — Shared mock: members with varied last_checked_in dates
- [ ] `tests/phase5/fixtures/mock-checkins.ts` — Shared mock: 150+ check-in records for pagination tests

---

## Requirements → Test Coverage

| Req ID | Description | Test File | Status |
|--------|-------------|-----------|--------|
| DASH-01 | Members sorted by days-since-checkin (longest absent first) | `member-list-sorting.test.ts` | ❌ pending |
| DASH-02 | Risk counters: Ativos ≤4d, Em risco 4-7d, Inativos >7d | `risk-counters.test.ts` | ❌ pending |
| DASH-03 | Check-in history paginated at 50/page | `pagination.test.ts` | ❌ pending |
