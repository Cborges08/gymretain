---
phase: 4
slug: qr-check-in-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 4 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

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
| 4-01-01 | 01 | 1 | CHKN-01 | unit | `npx vitest run tests/checkin/checkin-page.test.tsx --reporter=verbose` | No | pending |
| 4-01-02 | 01 | 1 | CHKN-02 | unit | `npx vitest run tests/checkin/route.test.ts --reporter=verbose` | No | pending |
| 4-01-03 | 01 | 1 | CHKN-03 | unit | `npx vitest run tests/checkin/route.test.ts --reporter=verbose` | No | pending |
| 4-01-04 | 01 | 1 | CHKN-04 | unit | `npx vitest run tests/checkin/route.test.ts --reporter=verbose` | No | pending |
| 4-01-05 | 01 | 1 | CHKN-05 | unit | `npx vitest run tests/checkin/route.test.ts --reporter=verbose` | No | pending |
| 4-01-06 | 01 | 1 | CHKN-06 | unit | `npx vitest run tests/checkin/checkin-page.test.tsx --reporter=verbose` | No | pending |

---

## Wave 0 Requirements

- [ ] `tests/checkin/checkin-page.test.tsx` - stubs for CHKN-01, CHKN-06
- [ ] `tests/checkin/route.test.ts` - stubs for CHKN-02, CHKN-03, CHKN-04, CHKN-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile camera QR scan opens check-in page | CHKN-01 | Requires physical device camera | Print/display QR code, scan with phone camera, verify page loads |
| Success screen shows member name + timestamp | CHKN-02 | UI verification | Complete check-in flow, verify success screen renders correctly |
| Duplicate check-in UX (4h window) | CHKN-03 | Time-dependent flow | Check in, immediately re-scan, verify duplicate message appears |

---

## Validation Sign-Off

- [ ] All tasks have automated verification or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verification
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
