---
phase: 3
slug: member-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | MEMB-01 | unit | `npx vitest run src/__tests__/members/actions.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | MEMB-01 | unit | `npx vitest run src/__tests__/members/actions.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | MEMB-02 | unit | `npx vitest run src/__tests__/members/list.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | MEMB-03 | unit | `npx vitest run src/__tests__/members/list.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 2 | MEMB-04 | unit | `npx vitest run src/__tests__/members/profile.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 2 | MEMB-05 | unit | `npx vitest run src/__tests__/members/actions.test.ts` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 2 | MEMB-06 | unit | `npx vitest run src/__tests__/members/actions.test.ts` | ❌ W0 | ⬜ pending |
| 3-05-01 | 05 | 2 | MEMB-07 | manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/members/actions.test.ts` — stubs for MEMB-01, MEMB-05, MEMB-06 (createMember, updateMember, deactivateMember server actions)
- [ ] `src/__tests__/members/list.test.ts` — stubs for MEMB-02, MEMB-03 (member list query, active filter)
- [ ] `src/__tests__/members/profile.test.ts` — stubs for MEMB-04 (profile page data fetch, CPF masking)
- [ ] `src/__tests__/members/qrcode.test.tsx` — stubs for QR code component rendering

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gym QR Code is scannable by phone camera | MEMB-07 | Requires physical device / camera | Display gym QR in admin → scan with phone → verify URL resolves |
| Deactivated member hidden from active list UI | MEMB-06 | UI filter state requires browser interaction | Deactivate member → check active list → confirm absence |
| `external_id` column nullable in Supabase | MEMB-07 | DB inspection required | Open Supabase dashboard → members table → confirm `external_id` is nullable |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
