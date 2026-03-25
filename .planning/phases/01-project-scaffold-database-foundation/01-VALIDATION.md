---
phase: 1
slug: project-scaffold-database-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Next.js 14 compatible) + manual SQL verification |
| **Config file** | `vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-nextjs-init | P1 | 1 | INFR-01 | manual | `npm run dev` starts without errors | ❌ W0 | ⬜ pending |
| 1-vercel-deploy | P1 | 1 | INFR-01 | manual | Push to main → Vercel shows Ready | ❌ W0 | ⬜ pending |
| 1-env-vars | P1 | 1 | INFR-02 | manual | All env vars set in .env.local + Vercel | ❌ W0 | ⬜ pending |
| 1-schema-migration | P2 | 2 | INFR-03, INFR-04 | manual | Supabase Table Editor shows 4 tables | ❌ W0 | ⬜ pending |
| 1-rls-anon | P2 | 2 | INFR-03 | manual | Anon SQL query returns empty on all tables | ❌ W0 | ⬜ pending |
| 1-rls-checkin-insert | P2 | 2 | INFR-03 | unit | `npm run test -- rls` | ❌ W0 | ⬜ pending |
| 1-indexes | P2 | 2 | INFR-04 | manual | `\d members` shows index on last_checked_in | ❌ W0 | ⬜ pending |
| 1-supabase-clients | P3 | 3 | INFR-02 | unit | `npm run test -- supabase` | ❌ W0 | ⬜ pending |
| 1-env-example | P3 | 3 | INFR-02 | automated | `.env.example` contains all required keys | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — vitest config for Next.js 14 App Router
- [ ] `tests/phase1/schema.test.ts` — stubs for INFR-03, INFR-04 (schema verification)
- [ ] `tests/phase1/supabase-clients.test.ts` — stubs for INFR-02 (client factory)
- [ ] `package.json` — add `"test": "vitest"` script

*Install: `npm install -D vitest @vitejs/plugin-react`*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm run dev` starts without errors | INFR-01 | Requires actual project init + Node.js execution | Run locally, check console for errors |
| Vercel auto-deploys on push to main | INFR-01 | Requires live Vercel connection | Push a commit, check Vercel dashboard for "Ready" |
| All 4 tables visible in Supabase | INFR-03 | Requires live Supabase project | Open Table Editor, verify organizations/members/checkins/alerts |
| Anon role returns empty on all tables | INFR-03 | Requires live RLS execution | Run SQL as anon role in Supabase SQL Editor |
| Indexes exist on critical columns | INFR-04 | Requires live DB inspection | Run `SELECT indexname FROM pg_indexes WHERE tablename='members'` |
| All env vars set in Vercel dashboard | INFR-02 | Requires Vercel UI access | Check Settings > Environment Variables in Vercel project |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
