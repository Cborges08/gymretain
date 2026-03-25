# Phase 1: Project Scaffold & Database Foundation - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Next.js 14 App Router project initialized and running locally, Supabase schema deployed with all four tables (`organizations`, `members`, `checkins`, `alerts`), RLS policies enforced, critical indexes in place, and Vercel deploy pipeline live. Authentication, member management, and all application features are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Supabase Development Workflow
- **D-01:** Use only the remote Supabase cloud project for development — no local Docker/Supabase CLI required
- **D-02:** Schema changes are applied via SQL scripts pasted into the Supabase SQL Editor (Dashboard)
- **D-03:** Migration SQL scripts are saved in `/supabase/migrations/` directory for version control and reproducibility
- **D-04:** No `supabase db push` or local instance — developer works directly against the remote project

### Database Schema
- **D-05:** Four tables: `organizations`, `members`, `checkins`, `alerts`
- **D-06:** `members` table includes `external_id TEXT` (nullable) for future Fácil integration — must be present from day one
- **D-07:** `members.qr_code_hash` must have UNIQUE constraint — use `crypto.randomUUID()` at creation, never `Math.random()`
- **D-08:** Critical indexes: `members(last_checked_in)`, `checkins(member_id, checked_in_at)`, `members(qr_code_hash)`
- **D-09:** `SUPABASE_SERVICE_ROLE_KEY` environment variable must be configured and tested in Phase 1 — cron jobs (Phase 7) depend on it silently failing without it

### RLS Policies
- **D-10:** RLS enabled on ALL tables from day one — querying any table without auth must return empty result set
- **D-11:** Single-tenant MVP: org_id scoping via RLS on all admin-facing tables
- **D-12:** `checkins` table allows anonymous INSERT (public check-in endpoint, no auth required) — RLS policy must explicitly allow this
- **D-13:** `organizations`, `members`, `alerts` tables: admin-only read/write via authenticated role

### Environment Variables
- **D-14:** Required env vars for Phase 1: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`
- **D-15:** Both `.env.local` (local dev) and Vercel project settings must have all variables — verify both in Phase 1 UAT

### Claude's Discretion
- Next.js project structure (`src/app` vs `app/` at root) — standard Next.js 14 App Router convention
- TypeScript database types — Claude decides whether to auto-generate or define manually
- Org record initialization — seed in migration SQL or created on first admin login
- Tailwind configuration — standard setup

</decisions>

<specifics>
## Specific Ideas

- The developer prefers simple workflows — no Docker, no extra tooling beyond what's needed
- Migration scripts saved in `/supabase/migrations/` even though applied manually, so schema history is tracked in git
- Free tier only — no paid Supabase features or add-ons

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Foundation
- `.planning/PROJECT.md` — Project vision, stack decisions, constraints (free tier, single-tenant)
- `.planning/REQUIREMENTS.md` — INFR-01 through INFR-04 (the requirements this phase must deliver)
- `.planning/ROADMAP.md §Phase 1` — Success criteria, UAT criteria, pitfall guards for this phase

### Architecture & Research
- `.planning/research/ARCHITECTURE.md` — Database schema details, RLS policy design, component boundaries
- `.planning/research/STACK.md` — Validated stack choices, library recommendations with versions
- `.planning/research/PITFALLS.md` — Critical pitfalls: RLS mistakes, service role key setup, QR UUID patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — this phase establishes the foundational patterns all future phases will follow

### Integration Points
- This phase creates the foundation: database schema, RLS policies, and env vars that ALL subsequent phases depend on
- Phase 2 (Auth) depends on Supabase Auth being configured in this phase
- Phase 7 (Churn cron) depends on `SUPABASE_SERVICE_ROLE_KEY` being set and tested in this phase

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-project-scaffold-database-foundation*
*Context gathered: 2026-03-25*
