---
phase: 02
slug: admin-authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:run -- tests/phase2/` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- tests/phase2/`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-01, AUTH-02 | unit | `npm run test:run -- tests/phase2/auth-actions.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | AUTH-03 | unit | `npm run test:run -- tests/phase2/auth-actions.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | AUTH-06 | unit | `npm run test:run -- tests/phase2/auth-actions.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | AUTH-05 | unit | `npm run test:run -- tests/phase2/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | AUTH-04 | manual | — | — | ⬜ pending |
| 02-03-01 | 03 | 2 | AUTH-01, AUTH-02 | e2e-manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase2/auth-actions.test.ts` — stubs for signup, login, logout, password reset (AUTH-01, AUTH-02, AUTH-03, AUTH-06)
- [ ] `tests/phase2/middleware.test.ts` — stubs for route protection behavior (AUTH-05)

*Existing Vitest infrastructure from Phase 1 covers the framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Session persists after tab close/reopen | AUTH-04 | Requires real browser session state | Login → close tab → reopen /dashboard → confirm still logged in |
| Password reset email received and link works | AUTH-06 | Requires real email delivery via Resend | Request reset → check inbox → click link → set new password → login |
| org_id in JWT app_metadata | AUTH-01 | JWT inspection requires browser DevTools | Signup → DevTools > Application > Cookies → decode JWT → verify app_metadata.org_id |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
