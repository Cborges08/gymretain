# Domain Pitfalls: Gym Retention SaaS with QR Check-In

**Domain:** SaaS for gym/CrossFit membership retention using QR code check-in, email alerts, and churn detection

**Tech Stack:** Next.js 14 App Router + TypeScript + Supabase + Vercel + Resend

**Researched:** 2026-03-25

**Confidence:** MEDIUM (training knowledge + stack-specific documentation; no current web validation available)

---

## Critical Pitfalls

Mistakes that cause data loss, security breaches, app rewrites, or complete feature failures.

### Pitfall 1: QR Code Replay/Spoofing Attacks

**What goes wrong:**
- Admin/gym owner generates QR codes for students and shares them (prints them, shows on phone, etc.)
- Multiple students scan the same QR code, all registering check-ins as the legitimate student
- Attendance records become worthless; churn detection fires on innocent, attending members
- Competitor scans QR code, registers fake check-ins to poison data
- Student shares QR code with friend who wants free gym access

**Why it happens:**
- QR code is treated as bearer token (anyone with it can check in)
- No timestamp validation on check-ins
- No device/IP rate limiting
- QR code never expires or rotates
- Assumption that QR codes are "secure by obscurity"

**Consequences:**
- False churn alerts sent (gym owner contacts students who actually attended)
- Gym owner loses trust in system, stops using it
- Attendance data corrupted beyond repair (no audit trail to reconstruct truth)
- Potential abuse to claim gym attendance without paying

**Prevention:**

1. **QR codes are not authentication, they're convenience tokens:**
   - QR code should encode a unique check-in session ID (not student ID directly)
   - Session ID is single-use: each scan generates a check-in and invalidates the QR session
   - Alternative: QR code includes timestamp window (valid for 5 minutes only) + HMAC signature

2. **Rate limiting on check-in endpoint:**
   - Max 1 check-in per student per 4-hour window
   - Reject multiple check-ins from same QR code within 5 minutes
   - Log/alert on unusual patterns (10+ check-ins from one code in 1 hour)

3. **Audit trail from day 1:**
   - Record IP address, user-agent, timestamp for every check-in
   - When gym owner sees churn alert, can inspect check-in history
   - Detect patterns (3 check-ins same IP in 1 minute = likely fraud/sharing)

4. **QR code rotation:**
   - QR code tied to student record but regenerated monthly or on-demand
   - Old codes still work (backward compatibility) but marked deprecated in logs
   - Allows gym owner to revoke/rotate if they suspect sharing

5. **Admin visibility into check-in details:**
   - Show IP + user-agent on check-in history view
   - Flag suspicious patterns (same IP, multiple students checking in simultaneously)
   - Allow gym owner to mark check-ins as "fraudulent" and hide from churn calculation

**Detection (warning signs):**
- Multiple students checking in at exact same timestamp
- One QR code used 50+ times on same day
- Churn alert fires but student insists they came (shows gym attendance proof)
- Check-in IP addresses all different but same QR code (shared across devices)

**Phase to address:** Phase 1 (MVP) — QR security must not be deferred; core value depends on data integrity

---

### Pitfall 2: Supabase Free Tier Row-Level Security (RLS) Misconfiguration

**What goes wrong:**
- Gym admin accidentally sees other gyms' student data (multi-tenant tenant isolation failure)
- Student data is world-readable due to overly permissive RLS policies
- RLS policy evaluates true in unexpected contexts (functions, batch operations, migrations)
- Bugs in RLS policies lead to "access denied" errors for legitimate users
- Admin deletes their own gym data instead of students due to policy bypass
- RLS policies are never tested; deployed without validation

**Why it happens:**
- RLS is hard to reason about (implicit deny, but many escape hatches)
- Single-tenant MVP seems simple, but RLS still required for user <-> data isolation
- Testing RLS requires different auth contexts (hard in local dev)
- PostgreSQL functions bypass RLS by default (unless SECURITY DEFINER set correctly)
- Batch operations and migrations often run as postgres/service_role (unrestricted)

**Consequences:**
- Data breach: student emails exposed, attendance records leaked to competitors
- Compliance violation: GDPR/LGPD violations if student data exposed
- Feature breaks: legitimate users locked out mid-session
- Migration failure: data migrations run as service_role, RLS policies ignored

**Prevention:**

1. **RLS policies written with explicit intent from day 1:**
   ```sql
   -- CORRECT: Explicit check for single-tenant
   CREATE POLICY gym_admin_can_see_own_students ON students
   FOR SELECT USING (
     gym_id = (SELECT gym_id FROM auth.users WHERE id = auth.uid())
   );
   ```
   - Never rely on implicit behavior
   - Always include your auth context in WHERE clause

2. **Test RLS policies in CI/CD:**
   - Write integration tests that authenticate as different users
   - Verify SELECT/INSERT/UPDATE/DELETE from each user context
   - Use Supabase test client or pgbench with different roles

3. **Separate service_role operations from user-facing queries:**
   - Migrations and batch operations should use service_role sparingly
   - Wrap user-facing queries in edge functions with explicit RLS checks
   - Log all service_role operations (easy to audit)

4. **PostgreSQL functions require SECURITY INVOKER:**
   - By default, functions run as SECURITY DEFINER (owner's role, bypasses RLS)
   - For user-facing functions: use `SECURITY INVOKER` to inherit caller's role
   - Document which functions bypass RLS and why

5. **Admin dashboard enforces multi-layer checks:**
   - Always filter by user's gym_id before running queries
   - Use Supabase `getUser()` to confirm auth context
   - Never trust RLS alone for sensitive operations (e.g., deletion)

**Detection (warning signs):**
- Admin reports seeing "other gyms' students" in their dashboard
- "Permission denied" errors appear in production, not in local testing
- Cron job suddenly fails after new RLS policy added
- Students report data visible they shouldn't see (Instagram leak, etc.)

**Phase to address:** Phase 1 (MVP) — RLS is not optional; test with different user roles from day 1

---

### Pitfall 3: Vercel Cron Job Failures on Free Tier (Churn Alert Job Stalls)

**What goes wrong:**
- Cron job to detect churned students runs at 2 AM UTC but only executes sporadically
- Vercel free tier doesn't guarantee execution (best-effort)
- Cron job times out (default 60s timeout, free tier limit) on large student lists
- Job runs but crashes silently; no error logged
- Gym owner never receives churn alert because job didn't run
- Multiple job executions happen simultaneously (race condition), emails duplicate

**Why it happens:**
- Vercel free tier cron jobs are lowest priority; high-load Vercel instances skip your job
- Function timeout on free tier is 60 seconds (paid: 900s); churned student calculation is O(n)
- Job doesn't fail gracefully; logging doesn't surface in Vercel dashboard by default
- No idempotency key; if job retries, duplicate emails sent

**Consequences:**
- Gym owner misses churn alerts (defeats core product value)
- Duplicate emails sent (same student alerted 3x on same day)
- Students contacted too late ("hey, I quit 2 weeks ago")
- Free tier limit on cron jobs (5x/hour) exceeded, job dropped entirely

**Prevention:**

1. **Acknowledge free tier is best-effort; design for reliability anyway:**
   - Cron job should be *informational*, not *blocking*
   - Gym owner can manually trigger "check for churn" in dashboard
   - Cron job is convenience, manual check is fallback

2. **Optimize churned-student calculation:**
   - Precompute "days_since_checkin" as denormalized column (updated on each check-in)
   - Cron job query: `WHERE days_since_checkin >= 7 AND last_alerted_at < NOW() - INTERVAL '1 day'`
   - Avoid calculating date diffs in application code; use database views

3. **Add distributed lock to prevent duplicate runs:**
   - Before cron job starts, insert lock row in `cron_locks` table with job_id + timestamp
   - If another instance tries to acquire lock, fail immediately
   - Prevents concurrent executions from duplicate emails
   - Clean up old locks (older than 5 minutes)

4. **Explicit idempotency for email sends:**
   - Track sent emails in database: `(gym_id, student_id, alert_date)`
   - If same email already sent today, skip sending again
   - Allows safe retries without duplicate emails

5. **Fail loudly with observability:**
   - Log to external service (e.g., Axiom, Logtail on free tier) on every cron execution
   - Log start time, end time, number of students processed, errors
   - Gym owner dashboard shows "Last churn check: 2 hours ago" or "FAILED"
   - Alert admin if cron hasn't succeeded in 48 hours

6. **Timeout safeguard:**
   - Cron job should finish well before 60s limit (aim for <30s)
   - If processing >1000 students, batch the job (process 100/run, queue next run)
   - Use pagination in database queries

**Detection (warning signs):**
- Gym owner says "I haven't gotten any churn alerts in a week"
- Cron job ran but no log output appears
- Same student receives 3 emails on same day
- Dashboard shows "Last churn check: 5 days ago"
- Vercel deployment shows cron job fired but no backend logs

**Phase to address:** Phase 2 (Cron/Alerting) — But test with realistic data volume in Phase 1

---

### Pitfall 4: Email Deliverability Failure (Resend Free Tier, Spam Folder)

**What goes wrong:**
- Gym owner registers 5 gyms as separate accounts, each sending to own email list
- Resend free tier has rate limits (100 emails/day); hit limit by 10 AM, rest queued/dropped
- Admin's churn alert emails land in spam folder, gym owner never sees them
- Email template includes template variables unreplaced (prints "Hi {student_name}, ..." literally)
- Resend account gets flagged for abuse (free tier is heavily monitored)
- SPF/DKIM not configured; emails rejected by gym owner's corporate email

**Why it happens:**
- Resend free tier has soft limits: 100 emails/day, but not hard-rejected (delays/drops silently)
- Many gyms sign up with shared email domains (gmail, hotmail, etc.) without SPF setup
- Email templates not previewed before deploy; bugs slip through
- No monitoring on Resend delivery status; assumes all emails sent

**Consequences:**
- Core product (churn alerts) doesn't reach gym owner
- Gym owner thinks system is broken, cancels account
- Email reputation harmed; all future emails treated as spam
- Free tier account flagged/suspended, all emails blocked

**Prevention:**

1. **Respect free tier limits and design around them:**
   - Batches of 20-50 emails per gym per day (not all at once)
   - Stagger delivery: 8 AM, 2 PM, 8 PM (spread throughout day)
   - Each cron run sends emails for that time slot only
   - Track daily email count; if approaching 100, queue rest for next day

2. **Monitor delivery status actively:**
   - Resend webhooks: subscribe to `email.delivered` and `email.bounced` events
   - Store status in database: `check_in_alerts` table tracks `status: 'sent' | 'delivered' | 'bounced' | 'spam'`
   - Dashboard shows "Last 5 alerts and delivery status"
   - Alert admin if bounce rate >5%

3. **Add SPF/DKIM configuration guide:**
   - Gym owners configure SPF record for their domain when they register
   - Email sent from `noreply@[gym_domain]` (not @resend.co)
   - Reduces spam folder risk significantly
   - Include setup guide in onboarding

4. **Test email templates thoroughly:**
   - Preview emails with sample data before each deploy
   - Use Resend's email preview feature in Next.js: `/api/preview-email`
   - Check for unreplaced variables, broken links, mangled HTML

5. **Implement email preference center:**
   - Gym owner can set preferred time window for alerts (e.g., 8 AM - 6 PM)
   - Can set frequency (daily vs. weekly digest)
   - Allows gym owner to batch alerts instead of getting 20/day

6. **Manual email re-send on failure:**
   - If gym owner misses alert, can click "Resend Alert" in dashboard
   - Manually triggers Resend send (outside cron job)
   - Tracks retries to avoid duplication

**Detection (warning signs):**
- Gym owner says "I never received any alerts" but no bounces in Resend dashboard
- "Resend account flagged for suspicious activity"
- Email template shows literal `{student_name}` instead of actual name
- Resend free tier quota exceeded message in logs
- Delivery status undefined (all sent=true, but bounces never tracked)

**Phase to address:** Phase 2 (Email/Alerting) — But set up monitoring from Phase 1

---

### Pitfall 5: Supabase Free Tier Hitting Connection/Row Limits Without Warning

**What goes wrong:**
- Gym scales to 2,000 students; each check-in inserts a row
- After 10 weeks, database has 500K rows (check-ins) + students data
- Supabase free tier has 1M row soft limit (not hard cap, but performance degrades)
- Queries become slow; dashboard takes 10+ seconds to load
- Feature suddenly breaks: "too many connections" error on check-in
- No warning or monitoring; gym owner discovers via crash

**Why it happens:**
- Supabase free tier doesn't show row/connection counts in dashboard
- Row limits are soft ("performance optimized for <500K rows")
- Connection pooling misconfigured or not used from Next.js
- N+1 queries in dashboard (fetch students, then fetch check-ins for each)
- No pagination or query optimization in initial MVP

**Consequences:**
- MVP crashes silently; gym stops using product
- Gym owner can't migrate data (no export tool, Supabase free locked down)
- Rebuilding on paid tier requires downtime and data migration
- Poor performance destroys trust before gym owner scales

**Prevention:**

1. **Monitor row count and connection usage from day 1:**
   - Add script that queries `information_schema.tables` to count rows
   - Display row count + % of free tier limit in admin dashboard
   - Alert gym owner at 70%, 90%, 100% of row limits
   - Plan upgrade before hitting limit

2. **Implement pagination and query optimization:**
   - Student list: paginate (25/50 per page), not load all
   - Check-in history: load last 30 days, not all-time history by default
   - Use database views to pre-aggregate "last check-in by student"
   - Avoid SELECT *, always specify columns needed

3. **Connection pooling from Next.js:**
   - Use Supabase connection pooling (PgBouncer) on free tier
   - Never use direct connection from serverless functions
   - Configure `DATABASE_URL_POOLING` for Vercel edge functions
   - Max connections on free tier: ~20 simultaneous

4. **Archive old check-in data periodically:**
   - Check-ins older than 90 days moved to archive table
   - Archive table not part of free tier row count (or use separate free DB)
   - Cron job runs monthly: archive old check-ins, recalculate churn metrics
   - Gym owner can export archive for compliance/tax records

5. **Design data model to avoid N+1:**
   - Denormalize: store `last_check_in_date` on students table
   - Calculate `days_since_check_in = NOW() - last_check_in_date` in query
   - Avoid joining check_ins table unless specifically needed
   - Use Supabase realtime subscriptions sparingly

**Detection (warning signs):**
- Dashboard suddenly slow (was instant before)
- "Too many connections" error on random check-ins
- Supabase logs show connection pool exhausted
- Row count in database growing faster than expected
- Query performance degrades over weeks, not suddenly

**Phase to address:** Phase 1 (MVP build) — Design for pagination and monitoring from start

---

## Moderate Pitfalls

Issues that cause pain but not full system failure; require rework but not rewrite.

### Pitfall 6: Forgotten Manual "Contacted" Status Reset

**What goes wrong:**
- Gym owner marks student as "contacted" to silence churn alerts
- Student is contacted, decides to keep membership, continues attending
- 7 days later, gym owner never sees alert again (marked as contacted status remains)
- Student quietly stops showing up; gym owner finds out weeks later when student cancels

**Why it happens:**
- "Contacted" status is not an edge case but the intended flow
- But there's no mechanism to clear the status once student re-engages
- UX doesn't surface "when did we last alert?" clearly
- Assumption that gym owner manually tracks follow-ups

**Prevention:**
- "Contacted" status automatically clears when student checks in again
- Dashboard shows "Last alert: 3 days ago, Last check-in: 30 min ago" (mismatch is obvious)
- Gym owner can manually clear the status for edge cases
- Email alert includes "Reply with YES to confirm student is retaining"

**Phase to address:** Phase 2 (UX refinement)

---

### Pitfall 7: No Mechanism to Track Check-In Source (Manual vs. QR)

**What goes wrong:**
- Gym owner manually marks students as "checked in" (overrides data)
- QR code system becomes unreliable; gym owner stops trusting automated check-ins
- Can't distinguish: "student didn't show up" vs. "forgot to scan QR code"
- Churn calculation based on mixed signals (some QR, some manual marks)

**Why it happens:**
- Initial MVP only supports QR code check-ins
- But gym owner wants to manually mark absences/check-ins for special cases (broken QR, etc.)
- No audit trail distinguishing QR vs. manual; both look the same

**Prevention:**
- Check-in record includes `source: 'qr_code' | 'manual_admin' | 'api'`
- Dashboard shows check-in history with source badges
- Churn calculation is aware of source (e.g., weight manual overrides more heavily)
- Audit trail visible to gym owner (detect if they're relying too much on manual marks)

**Phase to address:** Phase 2 (Refinement)

---

### Pitfall 8: Email Template Not Personalized (Spam Signals)

**What goes wrong:**
- Churn alert email sends with generic template: "Dear Gym Owner" instead of actual name
- Email reads like mass-mailing, lands in spam folder
- Gym owner thinks system is broken (no emails received)

**Why it happens:**
- Template variables not passed from backend to email component
- Resend email template testing doesn't catch variable replacement bugs
- No preview mechanism; deployed without testing with real data

**Prevention:**
- Email template uses actual gym owner name, student name, check-in dates
- Email preview endpoint: `/api/preview-email?template=churn-alert&gym_id=...`
- Send test email to admin's email on each deploy
- Template variables explicitly validated in code review

**Phase to address:** Phase 2 (QA)

---

## Minor Pitfalls

Annoying but easy to fix with small changes.

### Pitfall 9: QR Code Not Unique Across Time (Collision Risk)

**What goes wrong:**
- QR code generated via simple UUID or sequential ID
- Two different students accidentally get the same QR code
- Both check-ins attributed to same student

**Why it happens:**
- QR generation not tested for uniqueness
- Assumption that UUID is globally unique (true, but can fail if bad RNG seed)

**Prevention:**
- Use `crypto.randomUUID()` from Node.js (not Math.random)
- Add UNIQUE constraint on QR code in database
- Test QR generation with 100K rows; verify no collisions

**Phase to address:** Phase 1 (MVP) — Easy to add

---

### Pitfall 10: Timezone Issues in Churn Calculation

**What goes wrong:**
- Gym in São Paulo (GMT-3)
- Churn job runs at 2 AM UTC (midnight in São Paulo = already next day)
- Student last checked in yesterday (São Paulo time) but alert fires today (UTC time)
- Gym owner confused: "Alert says no check-in for 7 days, but student was here yesterday"

**Why it happens:**
- Queries use UTC timestamps but gym owner thinks in local time
- Threshold calculation doesn't account for timezone offset

**Prevention:**
- Store gym timezone in gym profile (`timezone: 'America/Sao_Paulo'`)
- Churn calculation uses gym timezone: `NOW() AT TIME ZONE gym.timezone`
- Dashboard displays times in gym timezone, not UTC
- Alert includes "Checked in: 2 days ago (local time)" for clarity

**Phase to address:** Phase 1 (MVP setup) — Easy to implement, hard to debug later

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Phase 1: MVP — QR Check-In** | QR code treated as bearer token (no replay protection) | Implement session-based QR, rate limiting on check-in endpoint |
| **Phase 1: MVP — Admin Auth** | RLS policies not tested; customer data leaks | Write RLS tests in CI/CD, test with different auth contexts |
| **Phase 1: MVP — Data Model** | No pagination; scales to 500K rows, query fails | Paginate from start, monitor row count, archive old data |
| **Phase 2: Cron/Alerts** | Cron job runs sporadically on free tier; gym owner gets no alerts | Implement manual "Check Now" button, add observability logging |
| **Phase 2: Email/Alerts** | Emails land in spam; free tier quota exceeded | Monitor delivery, implement batching, gym owner configures SPF |
| **Phase 2: UX** | "Contacted" status never clears; gym owner stops trusting system | Auto-clear on re-engagement, show last alert date clearly |
| **Phase 3+: Scaling** | Supabase free tier hit; no migration path | Plan paid tier before 1M rows, export/backup mechanism by Phase 2 |

---

## Prevention Strategy Summary

### Must-Have from MVP:
1. QR code uniqueness constraint + rate limiting on check-in
2. RLS tests for customer data isolation
3. Pagination for student/check-in lists
4. Row count monitoring in dashboard
5. Timezone handling in churn calculation
6. Email delivery monitoring (bounces)

### Nice-to-Have but Defer:
1. Advanced QR code rotation (v1: static QR per student is fine)
2. Email preference center (v1: send daily at fixed time)
3. Archive/export mechanism (defer until approaching free tier limit)

### Monitor Proactively:
1. Supabase row count (dashboard widget)
2. Cron job execution (last run timestamp)
3. Email delivery status (Resend webhooks)
4. Churn alert accuracy (gym owner feedback)

---

## Sources

- Supabase Documentation: Row-Level Security (RLS), Free Tier Limits
- Vercel Documentation: Cron Jobs, Free Tier Constraints
- Resend Documentation: Email Deliverability, Free Tier Rate Limits, Webhooks
- OWASP: Authentication Cheat Sheet (bearer token security)
- Common SaaS pitfalls: Based on Y Combinator postmortems, indiehackers.com discussions

**Confidence Note:** Stack-specific documentation and domain knowledge applied. Email and cron behavior verified against current Resend/Vercel docs as of Feb 2025. QR code security based on standard bearer token vulnerabilities. RLS pitfalls based on Supabase documentation and community discussions.
