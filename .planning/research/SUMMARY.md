# Research Summary: GymRetain SaaS

**Domain:** Gym retention SaaS (churn detection + QR check-in alerts)
**Stack:** Next.js 14 App Router + TypeScript + Supabase + Resend
**Researched:** 2026-03-25
**Overall confidence:** HIGH

## Executive Summary

GymRetain is a single-tenant SaaS for gym owners to detect member churn via QR-code check-ins and receive automated email alerts when members go inactive. The architecture centers on three independent flows: (1) stateless public check-in (no auth), (2) admin dashboard with real-time updates (protected), and (3) nightly churn detection cron job (service-role queries).

The recommended architecture leverages Next.js 14 App Router's Server Components for data fetching, Supabase RLS policies for single-tenant isolation, and Resend for transactional emails. The design separates concerns into presentation, API, business logic, and data layers, each with clear component boundaries. This structure enables the solo developer to build and test phases independently without cascading refactors.

Key architectural insight: QR code check-ins require **no member authentication** — the QR code itself (a UUID hash unique to each member) is the credential. This eliminates signup friction and simplifies the user journey. Admin authentication (email/password) is handled entirely by Supabase Auth, reducing custom security code. Churn detection runs nightly via Vercel Cron, isolated from user-facing requests, making it resilient to traffic spikes.

The single-tenant approach (one org per database instance in MVP) simplifies auth and RLS; multi-tenancy is deferred to post-MVP. All admin queries are automatically scoped to their org_id via database policies, preventing accidental data leaks and simplifying the codebase.

Database design prioritizes two critical indexes: `members(org_id, last_checked_in)` for fast churn detection, and `checkins(org_id, member_id, checked_in_at)` for dashboard history. RLS policies enforce org_id filtering at the database layer, not application layer, making data isolation failsafe.

## Key Findings

**Stack:**
Next.js 14 App Router (server components for data fetching, route handlers for APIs) + Supabase (auth + RLS + real-time) + Resend (transactional email). No custom backend required; all logic runs in serverless functions.

**Architecture:**
Three-layer pattern: (1) presentation (dashboard + public check-in UI), (2) API (auth, check-in submission, churn detection), (3) database (RLS-protected queries). Components communicate via HTTP (route handlers) and real-time subscriptions (Supabase). Data flows are unidirectional: user actions → API → database → dashboard updates.

**Critical pitfall:**
Cron jobs must use `createClient()` with `SUPABASE_SERVICE_ROLE_KEY`, not the anon/authenticated client. Without service role, RLS policies filter churn queries to empty results, and alerts are never generated. This is a hard blocker that requires explicit testing.

## Implications for Roadmap

Based on the architecture, the roadmap should follow this strict dependency order:

### Phase Structure Recommendation

**Phase 1: Database & Core Infrastructure**
- Set up Supabase project, schema, RLS policies
- Generate QR codes (UUID-based)
- Deploy environment variables (service role key, cron secret)
- **Rationale:** Everything depends on the database schema and auth setup. RLS policies must be correct from the start; retrofitting them later is painful. QR generation logic is trivial but foundational.
- **Avoid pitfall:** Delaying service role key setup; must test cron queries immediately.

**Phase 2: Admin Authentication**
- Implement Supabase Auth (sign-up, sign-in, sign-out)
- Protect /dashboard/* routes with middleware
- Build login/logout UI
- Test session persistence in secure cookies
- **Rationale:** Unblocks admin features; churn detection emails must have a destination (admin_email from auth).
- **Avoid pitfall:** Store admin's org_id in JWT custom claims during sign-up, not in state or cookies.

**Phase 3: Public Check-In (No Auth)**
- Build /checkin/[qr_code_hash] server component
- Implement POST /api/checkin to record check-in
- Design check-in confirmation UI (simple, mobile-friendly)
- Test QR scanning with real devices
- **Rationale:** Core user-facing feature; validates the zero-friction check-in model. Independent of admin features (no auth required).
- **Avoid pitfall:** Don't ask for member email/name at check-in. QR code is the member_id; validation happens server-side.

**Phase 4: Admin Dashboard**
- Display member list with last_checked_in and days_away calculation
- Show check-in history per member
- Display unhandled alerts (churn > 7 days)
- Implement "Mark as contacted" button to silence alerts
- Add real-time subscription to checkins table
- **Rationale:** Depends on admin auth (for login) and check-in data. Real-time updates make dashboard feel alive.
- **Avoid pitfall:** Use Server Components for initial data fetch (fast), then attach Client Component for real-time subscription. Don't fetch in useEffect.

**Phase 5: Churn Detection & Email**
- Implement /api/cron/detect-churn (nightly job)
- Write logic to identify members > 7 days without check-in
- Create alert records in database
- Integrate Resend API (email template, send)
- Set up Vercel Cron to trigger at 2 AM UTC
- Test with real email delivery
- **Rationale:** Depends on check-in data (Phase 3) and admin email (Phase 2). Isolated from user requests (cron job), so can fail/retry without breaking dashboard.
- **Avoid pitfall:** Test cron in staging first with service role key. Missing service role key = silent failure (no alerts generated).

**Phase 6: Optimization & Edge Cases**
- Retry logic for failed email sends
- Rate limiting on check-in API (prevent spam)
- Pagination for member lists > 100
- Error recovery (e.g., what if admin deletes member mid-alert?)
- Monitor cron job success/failure
- **Rationale:** After core flows work end-to-end. Polish doesn't block MVP launch.
- **Avoid pitfall:** Don't over-engineer pagination initially; test with 100 members first, add pagination when needed.

### Phase Ordering Rationale

1. **Database first:** All downstream work depends on schema. RLS must be correct; retrofitting is expensive.
2. **Auth second:** Unblocks admin features (dashboard, cron destination). No admin auth = no email address for alerts.
3. **Check-in third:** Independent of admin features; validates zero-friction model. Can test with curl/Postman.
4. **Dashboard fourth:** Visualizes check-in data; depends on phases 2-3. Real-time subscription is nice-to-have, not blocking.
5. **Churn detection fifth:** Depends on check-in data (phase 3) and admin email (phase 2). Runs independently after phases complete.
6. **Polish last:** Core flows working; optimization is incremental.

### Research Flags for Phases

| Phase | Flag | Reason | Depth Needed |
|-------|------|--------|--------------|
| Phase 1 | ✓ | Database schema finalized in research | None — ready to build |
| Phase 2 | ✓ | Supabase Auth is standard, well-documented | None — follow docs |
| Phase 3 | ✓ | QR code check-in flow is core feature, researched in detail | **SHALLOW:** Test real QR scanning behavior (e.g., what does QR scanner return? how to parse?) |
| Phase 4 | ✓ | Dashboard patterns are well-known; real-time subscriptions may need testing | **SHALLOW:** Test Supabase real-time performance with 100+ concurrent subscriptions. Scaling may require broadcast channels instead of table subscriptions. |
| Phase 5 | ⚠️ **FLAG** | Cron job setup with Vercel + service role is critical and error-prone | **DEEP:** Test cron job in staging with real Resend API. Verify service role key is injected correctly. Simulate failure scenarios (e.g., what if Resend is down?). Plan retry strategy. |
| Phase 6 | ✓ | Standard optimization; defer until metrics show need | None — incremental testing |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Next.js 14, Supabase, Resend are production-ready. Project constraints (free tier, TypeScript, Tailwind) are explicit. |
| **Components & Boundaries** | HIGH | App Router file structure, route handlers, RLS patterns are documented best practices. Single-tenant isolation is straightforward. |
| **Data Flow** | HIGH | Three flows (check-in, admin login, churn detection) are orthogonal and well-defined. No ambiguous dependencies. |
| **Database Schema** | HIGH | Schema follows SaaS best practices (org_id scoping, proper indexing, RLS policies). Verified against Supabase docs. |
| **Build Order** | HIGH | Dependency chain is explicit: DB → Auth → Check-in → Dashboard → Churn → Polish. No circular dependencies. |
| **Anti-Patterns** | MEDIUM | Documented common pitfalls (client-side fetching, org_id in state, missing service role), but specific to this stack. Not globally verified. |
| **Scalability** | MEDIUM | Scaling analysis is based on typical SaaS patterns, not load-tested on GymRetain specifically. Real-world bottlenecks may differ. |

## Gaps to Address

1. **QR Code Parsing:** Research didn't cover how QR scanners return data (raw text? JSON?). Phase 3 deep research needed: test on iOS/Android browsers.

2. **Real-Time Subscription Limits:** Supabase free tier has unclear limits on concurrent subscriptions. Phase 4 should test with 20-30 admins simultaneously to find breaking point.

3. **Resend Rate Limiting:** Resend free tier allows 100 emails/day, but no mention of rate limits (emails/second). Phase 5 should test burst sending and plan queue strategy if needed.

4. **Cron Job Reliability:** Vercel Cron is documented, but retries on failure are unclear. Phase 5 should verify: does Vercel retry failed crons? How long before timeout? Plan monitoring/alerting.

5. **Multi-Tenant Transition:** Architecture is single-tenant now, but code should be written for eventual multi-tenancy. Phase 6+ should document the migration path (org_id in schema already prepared, but auth layer assumes one org).

6. **Data Privacy & Compliance:** Architecture doesn't cover GDPR/CCPA implications (e.g., member data deletion, export). Future phases should add compliance layer, but not blocking MVP.

## Critical Build Sequence

For solo developer working 10-20h/week, this is the sequence that minimizes context switching:

```
Week 1-2: Phase 1 (Database)
  - Supabase project setup
  - Schema creation + indexing
  - RLS policies
  - Test: Create member, record check-in, verify RLS filters org correctly

Week 3-4: Phase 2 (Auth) + Phase 3 (Check-in)
  - Supabase Auth routes
  - Check-in endpoint
  - Middleware
  - Test: Admin login → create member → scan QR code → record check-in

Week 5-6: Phase 4 (Dashboard)
  - Member list page
  - Check-in history
  - Alert display
  - Real-time subscription
  - Test: Live check-in updates dashboard without refresh

Week 7-8: Phase 5 (Churn Detection)
  - Cron job scaffolding
  - Churn detection logic
  - Resend integration
  - Test: Trigger cron, verify email sent, alert created

Week 9+: Phase 6 (Polish)
  - Error handling
  - Edge cases
  - Performance tuning
```

This sequencing ensures:
- Early validation of core flows (check-in by week 4)
- No rework of foundation (database is stable by week 2)
- Each phase can be tested in isolation before next phase depends on it
- Dashboard comes before churn detection (visual feedback helps motivation)

## Roadmap Ready

This research is sufficient to drive the roadmap. Phases can be detailed in phase-specific research, focusing on:

- Phase 1: Database schema details (field types, constraints, test data setup)
- Phase 3: QR code generation library (qrcode.js vs alternatives), mobile scanning UX
- Phase 5: Resend email template design, cron job monitoring setup
- Phases 2, 4, 6: Standard Next.js/Supabase patterns; less research needed

**Recommendation:** Start with Phase 1. Don't parallelize phases; the solo dev should go deep on database before touching auth. Build in order, validate each phase before next.
