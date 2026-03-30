# Roadmap: GymRetain MVP v1.0

**Milestone:** MVP v1.0
**Granularity:** Fine (9 phases)
**Coverage:** 35/35 v1 requirements mapped
**Developer:** Solo, 10-20h/week, 100% free tier
**Stack:** Next.js 14 App Router + TypeScript + Tailwind + Supabase + Vercel + Resend

---

## Phases

- [ ] **Phase 1: Project Scaffold & Database Foundation** - Next.js app initialized, Supabase schema live, RLS policies enforced, deploy pipeline running
- [ ] **Phase 2: Admin Authentication** - Admin can register, login, logout, reset password; all dashboard routes protected by middleware
- [ ] **Phase 3: Member Management** - Admin can create, list, edit, deactivate members; QR codes auto-generated and displayable
- [ ] **Phase 4: QR Check-In Flow** - Member scans QR code and registers check-in without login; duplicates blocked; audit trail recorded
- [ ] **Phase 5: Dashboard — Member Overview** - Admin sees all members sorted by inactivity, with risk counts and paginated check-in history
- [ ] **Phase 6: Dashboard — Actions & Churn Fallback** - Admin can mark member as contacted; manual churn check button available as cron fallback
- [ ] **Phase 7: Churn Detection Engine** - Nightly cron job identifies inactive members using service role key; alerts created in DB
- [ ] **Phase 8: Email Alerts & Delivery** - Admin receives contextual churn alert emails via Resend; idempotency, batching, and failure logging in place
- [ ] **Phase 9: Polish, Edge Cases & Launch Hardening** - Rate limiting, error boundaries, free tier monitoring, and end-to-end smoke test complete

---

## Phase Details

### Phase 1: Project Scaffold & Database Foundation

**Goal**: The project infrastructure is live — codebase runs locally and on Vercel, the database schema is deployed on Supabase with all tables, indexes, and RLS policies enforced.

**Depends on**: Nothing (first phase)

**Requirements**: INFR-01, INFR-02, INFR-03, INFR-04

**Success Criteria** (what must be TRUE):
  1. Running `npm run dev` starts the app locally without errors
  2. Pushing to `main` triggers an automatic Vercel deployment
  3. All four tables (`organizations`, `members`, `checkins`, `alerts`) exist in Supabase with correct columns and constraints
  4. All required indexes exist (`members(last_checked_in)`, `checkins(member_id, checked_in_at)`, QR code hash index)
  5. Querying any table without authentication returns an empty result set (RLS is active)
  6. All required environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`) are set in both `.env.local` and Vercel project settings

**UAT Criteria**:
  - Open `http://localhost:3000` — app loads without console errors
  - Open Supabase Table Editor — four tables visible with schema matching ARCHITECTURE.md
  - Run a raw SQL query as anon role — no rows returned from any table (RLS blocks access)
  - Check Vercel dashboard — deployment exists and shows "Ready" status

**Pitfall Guards**:
  - `SUPABASE_SERVICE_ROLE_KEY` must be set from day one; test it explicitly before Phase 7
  - `UNIQUE` constraint on `members.qr_code_hash` prevents UUID collisions (Pitfall 9)
  - Use `crypto.randomUUID()` — never `Math.random()` — for any unique ID generation
  - Schema includes `external_id TEXT` on `members` for future Fácil integration (MEMB-07)

**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Next.js 14 scaffold, Vitest setup, .env.example (Wave 1)
- [x] 01-02-PLAN.md — SQL migrations: schema, RLS policies, indexes (Wave 1)
- [x] 01-03-PLAN.md — Supabase client factories, TypeScript types, vercel.json (Wave 2)
- [ ] 01-04-PLAN.md — Human checkpoint: apply migrations, configure Vercel (Wave 3)

---

### Phase 2: Admin Authentication

**Goal**: The admin can securely create an account, log in, stay logged in across sessions, log out, and reset a forgotten password. All dashboard routes redirect to login if the session is missing.

**Depends on**: Phase 1

**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06

**Success Criteria** (what must be TRUE):
  1. Admin can create a new account using email and password via the signup form
  2. Admin can log in and the session persists after closing and reopening the browser tab
  3. Admin can log out from any page and is redirected to `/auth/login`
  4. Visiting any `/dashboard/*` route without a valid session redirects to `/auth/login`
  5. Admin can request a password reset email and use the link to set a new password
  6. An org record is created in the `organizations` table on first signup, and `org_id` is stored in the JWT custom claims

**UAT Criteria**:
  - Create account → log in → close tab → reopen `http://localhost:3000/dashboard` — lands on dashboard (not login)
  - Log out → navigate to `/dashboard/members` — redirected to `/auth/login`
  - Request password reset → check email → click link → set new password → log in with new password
  - Inspect JWT in browser DevTools — `app_metadata.org_id` is populated

**Pitfall Guards**:
  - `org_id` stored in JWT custom claims (not React state or cookies) — RLS policies depend on this (Pitfall 2, Anti-Pattern 2)
  - Middleware matcher covers `/dashboard/:path*` AND `/api/admin/:path*`
  - Never store passwords manually; delegate entirely to Supabase Auth (Anti-Pattern 4)

**Plans**: TBD
**UI hint**: yes

---

### Phase 3: Member Management

**Goal**: The admin can create members (with auto-generated QR codes), view the member list, edit member data, and deactivate/reactivate members. QR codes are displayable and printable from the admin panel.

**Depends on**: Phase 2

**Requirements**: MEMB-01, MEMB-02, MEMB-03, MEMB-04, MEMB-05, MEMB-06, MEMB-07

**Success Criteria** (what must be TRUE):
  1. Admin fills a form with name, email, CPF (required), and optional phone number — member is saved to the DB under their org
  2. The gym's shared QR code is visible and printable at `/dashboard/qr-code` — members scan it and identify via CPF at check-in (D-01)
  3. Admin sees a list of all members showing name, email, and last check-in status
  4. Admin can click a member to view their full profile (CPF masked) and a check-in history placeholder (Phase 5)
  5. Admin can edit name, email, CPF, or phone number of any member
  6. Admin can deactivate a member — they disappear from active lists but their data is not deleted; reactivating them restores full history
  7. The `members` table has an `external_id` column (nullable) reserved for future Fácil integration

**UAT Criteria**:
  - Create a member → navigate to their profile → member data (masked CPF) is displayed correctly
  - Navigate to `/dashboard/qr-code` → gym QR code is displayed and scannable by a phone camera
  - Create two members with the same email — second one is rejected with a clear error
  - Create two members with the same CPF — second one is rejected with a clear error
  - Deactivate a member → they no longer appear in the active member list → reactivate → they reappear with history intact
  - Inspect `members` table in Supabase — `external_id` column exists and is nullable

**Pitfall Guards**:
  - Check-in uses gym QR + CPF identification — no per-member QR codes (D-01)
  - `qrcode.react` used for gym QR display at `/dashboard/qr-code`
  - Check `org_id` is always set from JWT app_metadata when inserting — never trust client-provided org_id

**Plans**: 5 plans

Plans:
- [x] 03-01-PLAN.md � Server Actions: createMember, updateMember, deactivate/reactivate; CPF utils (Wave 1)
- [x] 03-02-PLAN.md � Member list page /dashboard/members + SidebarNav QR Code link (Wave 1)
- [x] 03-03-PLAN.md � Member create form page /dashboard/members/new (Wave 2)
- [ ] 03-04-PLAN.md � Member profile page + edit form /dashboard/members/[id] (Wave 2)
- [x] 03-05-PLAN.md � Gym QR code display page /dashboard/qr-code (Wave 1)

---

### Phase 4: QR Check-In Flow

**Goal**: A member scans their QR code on any device and their check-in is recorded without login or app installation. Duplicate check-ins within 4 hours are rejected gracefully. Invalid or deactivated codes show a clear error.

**Depends on**: Phase 1 (schema), Phase 3 (member records exist)

**Requirements**: CHKN-01, CHKN-02, CHKN-03, CHKN-04, CHKN-05, CHKN-06

**Success Criteria** (what must be TRUE):
  1. Scanning a valid QR code on a mobile browser opens a page showing the member's name and a confirmation prompt — no login required
  2. Confirming the check-in records the event and shows a success screen with the member's name and current timestamp
  3. Attempting a second check-in within 4 hours shows a friendly "already checked in today" message — no duplicate row is created
  4. Every check-in record stores `checked_in_at`, IP address, and user-agent in the `checkins` table
  5. The `members.last_checked_in` field is updated to the current timestamp after each successful check-in
  6. Scanning an invalid QR code hash or a code belonging to a deactivated member displays a clear, friendly error page (no 500 or blank screen)

**UAT Criteria**:
  - Print or open a member's QR code on a phone → scan with default camera app → check-in page loads on mobile browser → tap "Confirmar" → success screen appears
  - Check `checkins` table — new row exists with correct `member_id`, `checked_in_at`, `ip_address`, `user_agent`
  - Check `members` table — `last_checked_in` matches the check-in timestamp
  - Scan the same QR code again within 4 hours → "já registrado" message appears, no new row in `checkins`
  - Navigate to `/checkin/abc-invalid-hash` → error page renders (not a 500)

**Pitfall Guards**:
  - QR code hash is the credential; server validates it exists and member is active before any action (Anti-Pattern 3)
  - Duplicate check-in window is 4 hours (CHKN-03), enforced in API — not just UI
  - Audit trail (`ip_address`, `user_agent`) enables fraud detection in Phase 9 (Pitfall 1)
  - Page is a public Server Component — no auth header, no session required

**Plans**: TBD
**UI hint**: yes

---

### Phase 5: Dashboard — Member Overview

**Goal**: The admin dashboard shows the full member list sorted by days since last check-in (most at-risk first), summary counters for active/at-risk/inactive members, and a paginated check-in history per member.

**Depends on**: Phase 2 (auth), Phase 4 (check-in data exists)

**Requirements**: DASH-01, DASH-02, DASH-03

**Success Criteria** (what must be TRUE):
  1. The main dashboard page lists all active members sorted by days since last check-in, with the longest-absent members at the top
  2. The dashboard shows three counters: "Ativos" (checked in within 4 days), "Em risco" (4-7 days), "Inativos" (7+ days)
  3. Clicking a member opens their detail page showing a paginated check-in history (maximum 50 records per page)
  4. Data is fetched via Server Components (not useEffect) — the page is fast on first load

**UAT Criteria**:
  - Create three members with different `last_checked_in` dates (2 days, 5 days, 10 days ago) → dashboard shows them in that order (10-day member first)
  - Counter badges show correct counts matching the three date buckets
  - Create a member with 60 check-ins → their history page shows 50 and a "next page" control
  - Disable JavaScript in browser → member list still loads (Server Component, no JS dependency)

**Pitfall Guards**:
  - Use Server Components for initial data fetch — no `useEffect` fetch (Anti-Pattern 1)
  - Paginate at 50 records maximum — never `SELECT *` check-ins without limit (Pitfall 5)
  - Days-away calculation done in DB query (`NOW() - last_checked_in`) — not in JavaScript

**Plans**: TBD
**UI hint**: yes

---

### Phase 6: Dashboard — Actions & Churn Fallback

**Goal**: The admin can mark a member as "contacted" to silence repeat alerts for 7 days. A "Verificar Agora" button on the dashboard manually triggers churn detection as a cron fallback.

**Depends on**: Phase 5

**Requirements**: DASH-04, DASH-05

**Success Criteria** (what must be TRUE):
  1. Each at-risk/inactive member has a "Marcar como Contatado" button; clicking it updates the member's alert status and removes them from the unhandled alert list for 7 days
  2. The dashboard has a "Verificar Churn Agora" button that triggers the churn detection logic on-demand — the admin does not depend on the cron job for first use
  3. The "contacted" status automatically clears when the member checks in again (no manual reset needed)
  4. After marking as contacted, the UI reflects the change immediately without a full page reload

**UAT Criteria**:
  - Mark a member as contacted → they disappear from the alert list → wait 7 simulated days (update DB timestamp directly) → they reappear in the alert list
  - Member marked as contacted checks in via QR code → their contacted status is cleared automatically
  - Click "Verificar Churn Agora" → page shows updated at-risk counts within 3 seconds

**Pitfall Guards**:
  - "Contacted" auto-clears on next check-in — never requires manual admin reset (Pitfall 6)
  - Manual trigger button uses the same logic as the cron job (same function, not a duplicate) — prevents divergence
  - Server Action or Route Handler mutation with `revalidatePath` — no full page reload needed

**Plans**: TBD
**UI hint**: yes

---

### Phase 7: Churn Detection Engine

**Goal**: A nightly cron job at 6h UTC queries all active members using the Supabase service role key, identifies those without a check-in for 7+ days, creates alert records in the database, and respects members already marked as contacted.

**Depends on**: Phase 4 (check-in data), Phase 2 (admin email in org record)

**Requirements**: ALRT-01, ALRT-04, ALRT-05

**Success Criteria** (what must be TRUE):
  1. The cron job triggers at 6h UTC daily without manual intervention (configured in `vercel.json`)
  2. Calling `GET /api/cron/detect-churn` without the correct `CRON_SECRET` returns 401 — the endpoint is not publicly triggerable
  3. Members inactive for 7+ days who have not been marked as contacted in the last 7 days receive a new alert record in the `alerts` table
  4. Members already marked as contacted within the last 7 days are skipped — no duplicate alert is created
  5. The cron job uses `createClient` with `SUPABASE_SERVICE_ROLE_KEY` — it can read all active members regardless of RLS

**UAT Criteria**:
  - Call `GET /api/cron/detect-churn` with no auth header → 401 returned
  - Call with wrong secret → 401 returned
  - Call with correct secret after seeding a member with `last_checked_in` = 8 days ago → `alerts` table has a new row for that member
  - Call again immediately → no duplicate alert row created (idempotent)
  - Mark member as "contacted" → call cron → no new alert row for that member
  - Verify in Vercel logs that cron job ran at 6h UTC (after first deploy)

**Pitfall Guards**:
  - `SUPABASE_SERVICE_ROLE_KEY` used in cron — NOT anon key (critical, Pitfall from SUMMARY.md, ALRT-05)
  - Secret token validation is the first check before any DB query
  - Alert creation is idempotent: checks for existing unresolved alert before inserting
  - Cron job logs start time, member count processed, and completion status (Pitfall 3)

**Plans**: TBD

---

### Phase 8: Email Alerts & Delivery

**Goal**: When the churn detection engine creates alert records, the admin receives a personalized email for each inactive member with frequency history and an approach suggestion. Email sending respects the 100/day free tier limit and logs failures without crashing the cron.

**Depends on**: Phase 7 (alerts exist in DB), Phase 2 (admin email address)

**Requirements**: ALRT-02, ALRT-03, ALRT-06, ALRT-07

**Success Criteria** (what must be TRUE):
  1. Admin receives an email for each newly created alert; the email includes the member's name, exact days since last check-in, last 4 weeks of check-in history, and a suggested outreach message
  2. Each alert email has a direct link to the member's profile in the dashboard
  3. Failed email sends are caught and logged — they do not crash the cron job or prevent other emails from sending
  4. If more than 100 alerts are pending in a single cron run, only the first 100 emails are sent and the rest are queued for the next run (batch guard)
  5. Sending the same alert email twice is prevented — `email_sent_at` is set on the alert record after the first send

**UAT Criteria**:
  - Seed an inactive member → run cron → check admin inbox → email arrives with correct member name, days count, and check-in history
  - Email contains a working link to `https://[domain]/dashboard/members/[member-id]`
  - Manually cause a Resend API error (invalid key temporarily) → cron completes → other emails still send → error is in Vercel logs
  - Seed 110 inactive members → run cron → only 100 emails sent → remaining 10 alerts have `email_sent_at = NULL` (processed next run)
  - Run cron twice → admin receives each alert email only once

**Pitfall Guards**:
  - Each email send is wrapped in try/catch — failure is logged, not re-thrown (ALRT-06)
  - `email_sent_at` set immediately after successful send — prevents duplicates on retry (Pitfall 3)
  - Email template uses real data (member name, admin name) — no unreplaced template variables (Pitfall 8)
  - Resend free tier cap respected: batch guard at 100 emails/run (ALRT-07, Pitfall 4)
  - Test email preview endpoint (`/api/preview-email`) available for local QA

**Plans**: TBD

---

### Phase 9: Polish, Edge Cases & Launch Hardening

**Goal**: The application is safe to share with first real users. Rate limiting blocks check-in abuse, error boundaries prevent blank pages, and free tier usage is visible in the dashboard. End-to-end smoke test passes.

**Depends on**: Phases 1-8 complete

**Requirements**: (cross-cutting — no new requirements; this phase validates the full system and closes pitfall gaps identified in research)

**Note on Coverage**: All 35 v1 requirements are fully delivered by Phases 1-8. Phase 9 is a hardening phase that validates the complete system, applies pitfall mitigations that span multiple flows, and ensures the app is safe to hand to first real users. It has no orphaned requirements — it owns the quality bar for the full milestone.

**Success Criteria** (what must be TRUE):
  1. The check-in API rejects more than one request from the same QR code within a 5-minute window with a clear response — brute-force and replay attacks are not silently accepted
  2. Navigating to a broken URL or triggering a server error shows a friendly error page (not a blank screen or raw stack trace)
  3. The admin dashboard displays the Supabase row count and a visual indicator of free tier usage
  4. An end-to-end smoke test passes: create member → scan QR → check-in recorded → cron detects churn → email received → mark as contacted → alert silenced
  5. The app handles the "member not found" and "member deactivated" edge cases on the check-in page without a 500 error

**UAT Criteria**:
  - Send 5 rapid POST requests to `/api/checkin` with the same QR hash → first succeeds, subsequent ones within 5 min return 429 or friendly block
  - Navigate to `/dashboard/this-page-does-not-exist` → branded error page renders (not Next.js default)
  - Open dashboard → "Uso do Supabase" widget shows row counts for members and checkins
  - Run full end-to-end: new member → QR scan → wait (or manually set `last_checked_in` to 8 days ago) → trigger cron → receive email → mark contacted → re-scan QR → alert cleared
  - Set an env var to a wrong value → app fails with a clear config error message (not a cryptic null pointer)

**Pitfall Guards**:
  - Rate limiting on check-in is backend-enforced (not just UI) — a POST via curl must also be blocked (Pitfall 1)
  - Timezone awareness: check-in timestamps stored as UTC, displayed in admin's local browser timezone (Pitfall 10)
  - Vercel Cron execution timestamp visible in dashboard ("Último verificação: X horas atrás") (Pitfall 3)

**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Scaffold & Database Foundation | 1/4 | In Progress|  |
| 2. Admin Authentication | 4/4 | In Progress|  |
| 3. Member Management | 3/5 | In Progress|  |
| 4. QR Check-In Flow | 0/? | Not started | - |
| 5. Dashboard — Member Overview | 0/? | Not started | - |
| 6. Dashboard — Actions & Churn Fallback | 0/? | Not started | - |
| 7. Churn Detection Engine | 0/? | Not started | - |
| 8. Email Alerts & Delivery | 0/? | Not started | - |
| 9. Polish, Edge Cases & Launch Hardening | 0/? | Not started | - |

---

## Requirement Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFR-01 | Phase 1 | Pending |
| INFR-02 | Phase 1 | Pending |
| INFR-03 | Phase 1 | Pending |
| INFR-04 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| MEMB-01 | Phase 3 | Pending |
| MEMB-02 | Phase 3 | Pending |
| MEMB-03 | Phase 3 | Pending |
| MEMB-04 | Phase 3 | Pending |
| MEMB-05 | Phase 3 | Pending |
| MEMB-06 | Phase 3 | Pending |
| MEMB-07 | Phase 3 | Pending |
| CHKN-01 | Phase 4 | Pending |
| CHKN-02 | Phase 4 | Pending |
| CHKN-03 | Phase 4 | Pending |
| CHKN-04 | Phase 4 | Pending |
| CHKN-05 | Phase 4 | Pending |
| CHKN-06 | Phase 4 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |
| DASH-04 | Phase 6 | Pending |
| DASH-05 | Phase 6 | Pending |
| ALRT-01 | Phase 7 | Pending |
| ALRT-04 | Phase 7 | Pending |
| ALRT-05 | Phase 7 | Pending |
| ALRT-02 | Phase 8 | Pending |
| ALRT-03 | Phase 8 | Pending |
| ALRT-06 | Phase 8 | Pending |
| ALRT-07 | Phase 8 | Pending |

**Coverage: 35/35 v1 requirements mapped. No orphans.**

---

## Design Notes

### Build Order Rationale

The phase sequence follows hard dependency constraints from the architecture:

1. **Schema before everything** — RLS policies are expensive to retrofit; indexes must exist before data arrives
2. **Auth before admin features** — admin email drives the cron alert destination; JWT custom claims drive all RLS policies
3. **Members before check-in** — check-in requires a valid member record with a QR hash to validate against
4. **Check-in before dashboard** — dashboard visualizes check-in data; without real data the dashboard has nothing to show
5. **Dashboard overview before actions** — the "contacted" action and manual cron trigger require the list UI to be in place
6. **Churn engine before email** — alerts must exist in the DB before Resend can send notifications; separating these two phases makes the cron logic independently testable without email side effects
7. **Polish last** — rate limiting and error boundaries add no new features; they harden what already works

### Free Tier Constraints Addressed

| Constraint | Where Addressed |
|------------|-----------------|
| Vercel Cron: 3 invocations/day on Hobby | Phase 6 (manual fallback button); Phase 7 (single daily cron at 6h UTC) |
| Resend: 100 emails/day | Phase 8 (batch guard at 100 emails/run; queue remainder) |
| Supabase: ~500MB, ~20 connections | Phase 5 (pagination at 50 rows), Phase 9 (row count widget) |
| Vercel function timeout: 60s | Phase 7 (cron targets <30s; paginated DB queries) |

### Critical Pitfalls Addressed

| Pitfall | Phase Where Mitigated |
|---------|-----------------------|
| Cron uses anon key instead of service role (silent alert failure) | Phase 7 (ALRT-05 explicit, tested) |
| QR code replay / spoofing | Phase 4 (4h duplicate window) + Phase 9 (rate limiting) |
| RLS misconfiguration leaks data | Phase 1 (RLS from day one, tested with anon role) |
| Cron failure is silent (no alerts for days) | Phase 7 (execution logging) + Phase 6 (manual fallback) |
| "Contacted" status never clears | Phase 6 (auto-clear on next check-in) |
| Email template variables unreplaced | Phase 8 (preview endpoint for local QA) |
| Supabase free tier row overflow | Phase 5 (pagination) + Phase 9 (usage widget) |
| Timezone mismatch in churn calculation | Phase 4 (UTC storage) + Phase 9 (local display) |

---

*Roadmap created: 2026-03-25*
*Last updated: 2026-03-25 after initial creation*
