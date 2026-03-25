# Pitfalls Research Summary — Gym Retention SaaS

**Project:** GymRetain (Gym Retention SaaS with QR Check-In)

**Researched:** 2026-03-25

**Overall Confidence:** MEDIUM-HIGH

---

## Executive Summary

Gym retention SaaS with QR check-in has **3 critical failure modes** and **4 moderate pain points**. The critical pitfalls are not about scale or missing features—they're about data integrity, security, and reliability of the core value proposition (churn alerts reaching the gym owner).

**Core risk:** A gym owner adopts GymRetain, but:
- QR codes get shared → attendance data corrupted
- Cron job doesn't run → churn alerts never sent
- Emails land in spam → gym owner never sees alerts
- RLS misconfigured → data leaks to other gyms

If any of these happen in first 2 months, gym owner abandons the product. They're not scaling issues—they're trust issues.

---

## Key Findings from Research

### The Three Pillars of Trust

1. **Data Integrity (QR Code Security)**
   - QR code must not be a bearer token
   - Single use per session, or time-windowed with HMAC
   - Rate-limit check-ins (max 1 per student per 4 hours)
   - Audit trail required (IP, user-agent, timestamp)

2. **Reliability (Cron Job Execution)**
   - Free tier is best-effort; expect failures
   - Design manual override ("Check Now" button)
   - Add observability logging (what ran, when, errors)
   - Stagger jobs; don't assume all executions succeed

3. **Deliverability (Email Reaches Inbox)**
   - Resend free tier has soft limits (100/day, not hard caps)
   - Gym owner needs SPF/DKIM for corporate email
   - Monitor bounces and spam folder; alert gym owner
   - Batch emails; don't send 50 at once

### The RLS Gotcha

Row-Level Security in Supabase is **not optional** even for single-tenant MVP. One misconfigured policy and:
- Gym A sees Gym B's students
- Data breach; GDPR violation
- Legal liability

RLS policies must be tested with different auth contexts from MVP launch.

### The Free Tier Resource Wall

Supabase free tier doesn't hard-cap rows (1M is a soft target), but:
- Query performance degrades silently
- Connection pool exhausts (too many connections error)
- No warning; gym owner discovers via crash

Design for pagination and monitoring from day 1. Archive old check-ins monthly.

---

## Critical Path for Pitfall Prevention

**Phase 1 (MVP):**
- [ ] Implement session-based QR (not bearer token)
- [ ] Add rate limiting to check-in endpoint
- [ ] Test RLS policies with different user contexts
- [ ] Add pagination to all queries
- [ ] Row count monitoring widget in dashboard
- [ ] Timezone handling in churn threshold (use gym timezone)
- [ ] Email delivery monitoring (Resend webhooks)

**Phase 2 (Alerts & Reliability):**
- [ ] Manual "Check Now" button for churn detection
- [ ] Cron job observability logging
- [ ] Email batching (respect 100/day limit)
- [ ] SPF/DKIM setup guide for gym owners
- [ ] Auto-clear "contacted" status on re-engagement
- [ ] Bounce rate tracking and alerts

**Phase 3+ (Scaling):**
- [ ] Archive check-ins older than 90 days
- [ ] Upgrade path to Supabase paid (docs ready before hitting free tier)
- [ ] Advanced QR rotation (optional; v1 static is fine)

---

## Phase Roadmap Implications

### Phase 1: MVP — QR Check-In System
**Pitfall risks:** QR spoofing, RLS misconfiguration, pagination performance, timezone bugs

**Must include:**
- Session-based QR (not just UUID)
- Rate limiting on check-in endpoint
- RLS tests in CI/CD
- Pagination on all list views
- Row count monitoring
- Gym timezone in profile, churn calc uses local time

**Can defer:**
- Manual check-in marks (Phase 2)
- Advanced QR rotation (Phase 3)

---

### Phase 2: Churn Detection & Email Alerts
**Pitfall risks:** Cron unreliability, email spam folder, quota limits, incomplete logging

**Must include:**
- Manual "Check Now" button (cron is fallback)
- Cron execution logging (external service like Axiom)
- Email batching (max 20-50/day per gym)
- Resend webhook monitoring (track bounces)
- SPF/DKIM setup guide in onboarding
- Email preview endpoint

**Can defer:**
- Email preference center (Phase 3)
- Archive mechanism (Phase 3)

---

### Phase 3: Optimization & Scaling
**Pitfall risks:** Free tier row limits, connection pool exhaustion, data export complexity

**Must include:**
- Archive old check-ins (monthly cron job)
- Supabase upgrade path documentation
- Data export endpoint for compliance

**Can defer:**
- Advanced analytics
- Rate limiting by usage tier

---

## Confidence Assessment

| Area | Level | Notes |
|------|-------|-------|
| QR Code Security | HIGH | Bearer token vulnerabilities are well-documented; replay attack prevention is standard |
| RLS Pitfalls | HIGH | Supabase documentation is authoritative; tested against real deployments |
| Cron Reliability | MEDIUM-HIGH | Vercel free tier behavior documented; some users report sporadic runs on free tier |
| Email Deliverability | MEDIUM | Resend free tier limits are documented; spam folder behavior depends on gym owner's domain setup |
| Supabase Limits | MEDIUM-HIGH | Row count limits are advisory (not enforced); performance degradation is gradual, not sudden |

---

## Gaps & Open Questions

1. **QR Code Session Storage:**
   - How long should a session-based QR remain valid? (5 minutes? 1 hour?)
   - Where to store session state? (Supabase table? Redis on free tier?)
   - Decision needed before Phase 1 implementation.

2. **Cron Job Fallback:**
   - Should manual "Check Now" trigger immediately or schedule for next cron slot?
   - Email rateLimit: should "Check Now" bypass the 100/day limit, or count against it?
   - Decision impacts user experience; clarify in Phase 2 spec.

3. **RLS Testing Strategy:**
   - How to test RLS in CI/CD without full Supabase instance?
   - Use test Supabase instance? Docker Postgres with RLS emulation?
   - Decision impacts local dev workflow.

4. **Email Batching Algorithm:**
   - Send all pending alerts at fixed time (8 AM gym time)?
   - Or rate-limit across the day (every 2 hours)?
   - Or per-gym batching (each gym gets max 20/day)?
   - Decision impacts gym owner experience (more timely vs. less spam).

---

## Recommended Action Items for Roadmap

**Before Phase 1 kickoff:**
1. Clarify QR code session design (duration, storage)
2. Specify RLS testing approach (CI/CD strategy)
3. Design email batching algorithm
4. Set up monitoring infrastructure (Axiom/Logtail for logs, Resend webhooks)

**Phase 1 Definition of Done:**
- All pitfalls in "Must-Have from MVP" section addressed
- RLS tests passing
- Pagination working on all lists
- Row count monitoring visible in dashboard
- Manual test: gym owner can't see other gyms' data

**Phase 2 Definition of Done:**
- Cron job logged externally (visible in dashboard)
- Email delivery tracking working
- Manual "Check Now" button functional
- Email batching respect limits

**Ongoing:**
- Monitor Supabase row count weekly
- Track cron job execution rate (monthly)
- Monitor email bounce rate and spam complaints

---

## Summary for Phase Planning

GymRetain's critical success factor is **trust through reliability**. Gym owners adopt based on "I'll get churn alerts automatically." If:
- QR codes get shared (data corruption) → lost trust
- Cron doesn't run (no alerts) → lost trust
- Emails never arrive (no alerts) → lost trust
- RLS breaks (data leak) → lost business

The roadmap must prioritize these three pillars before scaling to 100 gyms. Build trust with 5-10 early adopters, then scale.

All critical pitfalls are **preventable with design**, not masked with workarounds.
