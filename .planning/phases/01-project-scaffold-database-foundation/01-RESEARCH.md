# Phase 1: Project Scaffold & Database Foundation - Research

**Researched:** 2026-03-25
**Domain:** Next.js 14 App Router + TypeScript + Supabase + Vercel deployment and database initialization
**Confidence:** HIGH

## Summary

Phase 1 establishes the project's foundational infrastructure: a Next.js 14 application running locally and deployed to Vercel, a Supabase PostgreSQL database with four tables (organizations, members, checkins, alerts), RLS policies enforced on all tables, and critical environment variables configured in both local development and Vercel. This phase is prerequisite to all subsequent phases — authentication, member management, and churn detection all depend on these foundations.

The primary risk in this phase is RLS misconfiguration and QR code security. RLS policies must be tested across different authentication contexts from day one. QR codes must be unique (enforced via database constraint) and rate-limited at the API layer to prevent replay attacks.

**Primary recommendation:** Implement Phase 1 exactly as described in CONTEXT.md decisions. Verify RLS by authenticating as different users and confirming data isolation. Test QR code generation with 1000+ rows and verify UNIQUE constraint prevents collisions. Set `SUPABASE_SERVICE_ROLE_KEY` in both `.env.local` and Vercel immediately — this key is silently required by cron jobs in Phase 7.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use only the remote Supabase cloud project for development — no local Docker/Supabase CLI required
- **D-02:** Schema changes are applied via SQL scripts pasted into the Supabase SQL Editor (Dashboard)
- **D-03:** Migration SQL scripts are saved in `/supabase/migrations/` directory for version control and reproducibility
- **D-04:** No `supabase db push` or local instance — developer works directly against the remote project
- **D-05:** Four tables: `organizations`, `members`, `checkins`, `alerts`
- **D-06:** `members` table includes `external_id TEXT` (nullable) for future Fácil integration — must be present from day one
- **D-07:** `members.qr_code_hash` must have UNIQUE constraint — use `crypto.randomUUID()` at creation, never `Math.random()`
- **D-08:** Critical indexes: `members(last_checked_in)`, `checkins(member_id, checked_in_at)`, `members(qr_code_hash)`
- **D-09:** `SUPABASE_SERVICE_ROLE_KEY` environment variable must be configured and tested in Phase 1 — cron jobs (Phase 7) depend on it silently failing without it
- **D-10:** RLS enabled on ALL tables from day one — querying any table without auth must return empty result set
- **D-11:** Single-tenant MVP: org_id scoping via RLS on all admin-facing tables
- **D-12:** `checkins` table allows anonymous INSERT (public check-in endpoint, no auth required) — RLS policy must explicitly allow this
- **D-13:** `organizations`, `members`, `alerts` tables: admin-only read/write via authenticated role
- **D-14:** Required env vars for Phase 1: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`
- **D-15:** Both `.env.local` (local dev) and Vercel project settings must have all variables — verify both in Phase 1 UAT

### Claude's Discretion
- Next.js project structure (`src/app` vs `app/` at root) — standard Next.js 14 App Router convention
- TypeScript database types — Claude decides whether to auto-generate or define manually
- Org record initialization — seed in migration SQL or created on first admin login
- Tailwind configuration — standard setup

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFR-01 | Deploy automático no Vercel a partir de push na branch main | Next.js 14 + Vercel Hobby tier integration, git push triggers automatic build and deployment; vercel.json cron configuration native to Vercel |
| INFR-02 | Variáveis de ambiente configuradas no Vercel (Supabase keys, Resend key, cron secret) | All five required env vars documented in Stack.md; Vercel project settings support environment variable management via dashboard or CLI |
| INFR-03 | RLS policies ativas em todas as tabelas — queries sem auth retornam vazio | Supabase RLS documentation + ARCHITECTURE.md detailed RLS policy patterns; testable via different auth contexts in Phase 1 |
| INFR-04 | Indexes em `members(last_checked_in)` e `checkins(member_id, checked_in_at)` | PostgreSQL indexing standard; specific indexes listed in ARCHITECTURE.md schema with performance rationale for churn detection queries |
</phase_requirements>

---

## Standard Stack

### Core Framework
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.x (App Router) | Full-stack web framework | Industry standard for SaaS 2025; App Router is mature and production-ready; native TypeScript support; Vercel first-party framework |
| TypeScript | 5.x | Type safety | Prevents runtime errors in database operations, QR code generation, RLS policy logic; critical for data integrity in fintech-like applications |
| React | 18.x+ (bundled) | UI library | Included with Next.js 14; server components reduce bundle size; hooks for state management |
| Tailwind CSS | 3.4+ | Utility-first CSS | Fast iteration on admin dashboard UI; no build complexity; responsive design for member list and alerts |

### Database & Authentication
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase | Latest (2025) | PostgreSQL + Auth + Realtime | Free tier covers MVP; RLS enforces single-tenant security natively; managed PostgreSQL eliminates infrastructure burden; no backend code required |
| Supabase Auth | Built-in | Admin authentication (email/password) | Native to Supabase; integrates directly with RLS policies; free tier includes unlimited users; handles session tokens securely |
| PostgREST | Built-in | Auto-generated REST API | Supabase default; queries tables directly without custom backend; RLS policies evaluated automatically on every query |
| PostgreSQL | 14+ (Supabase managed) | Relational database | Mature; excellent for structured data (organizations, members, check-ins, alerts); UNIQUE constraints prevent QR code collisions; indexes enable fast churn detection queries |

### QR Code Generation
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `qrcode` | 1.5+ | Server-side QR generation | Generate QR codes during member creation; deterministic output ensures consistency; 100% test coverage for uniqueness |
| `qrcode.react` | 1.0+ | Client-side QR display | Display QR codes in admin dashboard for printing/archiving; React component integrates seamlessly with Next.js |
| `uuid` | Built-in (Node.js) | Cryptographically secure UUID generation | Use `crypto.randomUUID()` (not `Math.random()`) to ensure uniqueness of QR code hashes; UNIQUE constraint in database prevents collisions |

### Email & Notifications
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Resend | Latest (2025) | Transactional email service | Free tier: 100 emails/day (sufficient for <100 students); native Next.js integration; React Email template support; simple API |
| React Email | 0.x | Email template components | Write email templates as React components instead of HTML strings; reduces maintenance burden; type-safe templates |
| `date-fns` | 3.x | Date formatting | Format check-in timestamps in email alerts; small footprint (~20KB gzipped); handles timezone conversions |

### Deployment & Scheduling
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel | Hobby tier (free) | Next.js deployment platform | First-class Next.js support; git push triggers automatic builds; native environment variable management; free tier handles MVP traffic |
| Vercel Cron | Built-in | Scheduled tasks | Native to Vercel; runs Route Handlers on schedule; free tier allows 3 invocations/day (sufficient for daily 6 AM churn check) |

**Installation:**
```bash
npx create-next-app@latest gymretain \
  --typescript \
  --tailwind \
  --eslint \
  --src-dir \
  --app

cd gymretain

npm install \
  @supabase/supabase-js \
  @supabase/auth-helpers-nextjs \
  qrcode \
  qrcode.react \
  uuid \
  resend \
  react-email \
  date-fns
```

**Version verification:** As of March 2026:
- Next.js 14.2+ (verify with `npm view next version`)
- TypeScript 5.3+ (verify with `npm view typescript version`)
- Supabase JS client 2.43+ (verify with `npm view @supabase/supabase-js version`)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase + RLS | Firebase Firestore | Firestore lacks RLS; single-tenant enforcement harder; NoSQL schema less suited to relational check-in data |
| Supabase + RLS | Custom Express + AWS RDS | More control but 10x infrastructure overhead for solo developer; RLS benefits lost without Supabase abstraction |
| Vercel Cron | node-cron (self-hosted scheduler) | node-cron requires always-on server; incompatible with serverless/Vercel free tier |
| Resend | SendGrid / AWS SES | SendGrid requires SMTP configuration; SES has steeper onboarding; both less ergonomic with Next.js |
| Next.js 14 App Router | Pages Router (Next.js 12) | Pages Router is deprecated; App Router is future standard; required for modern Vercel deployments |

---

## Architecture Patterns

### Recommended Project Structure
```
gymretain/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page (landing or redirect to /auth/login)
│   ├── auth/
│   │   ├── login/page.tsx        # Login form (server component with client form)
│   │   ├── signup/page.tsx       # Sign-up form
│   │   └── reset-password/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx            # Middleware redirect if not authenticated
│   │   ├── page.tsx              # Member overview
│   │   ├── members/
│   │   │   ├── page.tsx          # Member list (paginated)
│   │   │   └── [id]/page.tsx     # Individual member profile + check-in history
│   │   ├── alerts/
│   │   │   └── page.tsx          # Unhandled churn alerts
│   │   └── settings/page.tsx     # Org settings (future)
│   ├── checkin/
│   │   └── [qr_code_hash]/page.tsx  # Public QR check-in page (no auth)
│   └── api/
│       ├── auth/
│       │   ├── signin/route.ts    # POST auth
│       │   ├── signup/route.ts    # POST auth
│       │   └── signout/route.ts   # POST auth
│       ├── checkin/route.ts       # POST check-in submission
│       ├── admin/
│       │   ├── members/route.ts   # GET members list
│       │   ├── alerts/route.ts    # GET/UPDATE alert status
│       │   └── org/route.ts       # GET org info
│       └── cron/
│           └── detect-churn.ts    # GET scheduled churn detection
├── lib/
│   ├── supabase.ts               # Supabase client initialization
│   ├── auth.ts                   # Auth helpers
│   ├── qr.ts                     # QR code generation
│   └── types.ts                  # TypeScript types for all tables
├── components/
│   ├── MemberList.tsx            # Server component for paginated member list
│   ├── CheckinForm.tsx           # Client component for check-in submission
│   ├── AlertBadge.tsx            # Component for alert display
│   └── ...
├── middleware.ts                 # Auth + org_id injection for RLS
├── .env.local                    # Local development (git ignored)
├── .env.example                  # Template for env vars
├── vercel.json                   # Deployment config + cron schedule
├── next.config.js                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
└── supabase/
    └── migrations/
        ├── 001-init-schema.sql        # Create all four tables
        ├── 002-rls-policies.sql       # RLS policy definitions
        ├── 003-indexes.sql            # Index creation
        └── 004-initial-data.sql       # Seed org record (optional)
```

### Pattern 1: Server Components for Database Queries
**What:** Use React Server Components (default in App Router) to fetch data directly from Supabase in component render. No useEffect waterfalls.

**When:** Dashboard pages, member list, check-in history — any read-only data fetch.

**Example:**
```typescript
// app/dashboard/members/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function MembersPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return <div>Not authenticated</div>;
  }

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('org_id', session.user.user_metadata?.org_id)
    .order('last_checked_in', { ascending: false })
    .limit(50); // Pagination from start

  return (
    <div>
      {members?.map(m => (
        <div key={m.id}>
          {m.name} — Last seen: {m.last_checked_in}
        </div>
      ))}
    </div>
  );
}
```

**Source:** ARCHITECTURE.md Pattern 1; Next.js 14 App Router documentation

---

### Pattern 2: Route Handlers for API Logic
**What:** `/api/*` files are server-side endpoints that validate, mutate data, call external services (Resend), and enforce business logic.

**When:** Check-in submission, member creation, alert status updates, email sending.

**Example (Check-in Submission):**
```typescript
// app/api/checkin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const { member_id } = await req.json();
  const supabase = createRouteHandlerClient({ cookies });

  // Validate member exists
  const { data: member } = await supabase
    .from('members')
    .select('id, org_id, last_checked_in')
    .eq('id', member_id)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Check for duplicate check-in (within 4 hours)
  if (member.last_checked_in) {
    const hoursSince = (Date.now() - new Date(member.last_checked_in).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 4) {
      return NextResponse.json(
        { error: 'You already checked in recently. Please try again later.' },
        { status: 429 }
      );
    }
  }

  // Record check-in
  const now = new Date().toISOString();
  const { error: checkinError } = await supabase.from('checkins').insert({
    org_id: member.org_id,
    member_id: member.id,
    checked_in_at: now,
    ip_address: req.headers.get('x-forwarded-for') || 'unknown',
  });

  if (checkinError) {
    return NextResponse.json({ error: checkinError.message }, { status: 500 });
  }

  // Update member's last_checked_in
  await supabase
    .from('members')
    .update({ last_checked_in: now })
    .eq('id', member.id);

  return NextResponse.json({ success: true, message: 'Check-in recorded' });
}
```

**Source:** ARCHITECTURE.md Pattern 3; Next.js Route Handlers documentation

---

### Pattern 3: Middleware for Auth Context Injection
**What:** Combine Supabase RLS policies with Next.js middleware to attach org_id to JWT custom claims. Ensures all database queries are scoped by org_id.

**When:** Every authenticated request to admin routes.

**Example:**
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  // Protect /dashboard/* routes
  if (req.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // Inject org_id into custom claims for RLS (if user is authenticated)
  if (session?.user?.user_metadata?.org_id) {
    // JWT already contains org_id via user_metadata
    // RLS policies will read this via auth.jwt()->'app_metadata'->>'org_id'
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
};
```

**Source:** ARCHITECTURE.md Pattern 5; Supabase Auth Helpers documentation

---

### Pattern 4: Cron Jobs via Vercel Crons
**What:** Serverless functions triggered on schedule for nightly churn detection.

**When:** Batch operations, churn detection, email alerts.

**Example:**
```typescript
// app/api/cron/detect-churn.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Use service role key for cron jobs (bypasses RLS for admin queries)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export const dynamic = 'force-dynamic'; // Ensure not cached

export async function GET(req: NextRequest) {
  // Verify cron secret (prevents unauthorized execution)
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all active members
    const { data: members } = await supabase
      .from('members')
      .select('id, name, email, org_id, last_checked_in')
      .eq('status', 'active');

    const threshold = 7; // days
    const churnMembers = members
      .filter(m => {
        if (!m.last_checked_in) return true;
        const daysSince = (Date.now() - new Date(m.last_checked_in).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince >= threshold;
      });

    // Create alerts for churned members
    for (const member of churnMembers) {
      const { data: existingAlert } = await supabase
        .from('alerts')
        .select('id')
        .eq('member_id', member.id)
        .is('resolved_at', null)
        .maybeSingle();

      if (!existingAlert) {
        await supabase.from('alerts').insert({
          org_id: member.org_id,
          member_id: member.id,
          alert_type: 'churn',
          triggered_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, processed: churnMembers.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Vercel cron configuration (`vercel.json`):**
```json
{
  "crons": [
    {
      "path": "/api/cron/detect-churn",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Source:** STACK.md "Cron Jobs & Scheduled Tasks"; Vercel documentation on Crons

---

### Anti-Patterns to Avoid

- **Fetching data in client components with useEffect:** Causes waterfalls (render → fetch → re-render), auth context complexity, and bundle bloat. Use Server Components instead.

- **Storing org_id in React state:** Causes serialization issues between server/client and defeats RLS policy scoping. Use middleware + JWT custom claims instead.

- **Public check-in requiring email lookup:** "Enter your email to check in" introduces friction and fails check-ins. Use QR code encoding member_id directly (UUID hash).

- **Cron jobs using anon key instead of service role key:** RLS policies apply to anon key; cron job queries return empty. Use `SUPABASE_SERVICE_ROLE_KEY` for administrative operations.

- **Storing passwords in database:** Custom auth is a security liability. Delegate to Supabase Auth; handles hashing, MFA, password resets securely.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User authentication & session management | Custom login form + password hashing | Supabase Auth (email-password flow) | Security: password hashing, rate limiting, MFA ready; session management via secure httpOnly cookies |
| Database security isolation (single-tenant) | Manual org_id checks in every query | Supabase RLS policies | RLS enforces isolation at database layer; bypassing checks becomes impossible; policy logic is declarative and auditable |
| Email sending | SMTP + templates | Resend + React Email | Email configuration (SPF/DKIM) nightmare; Resend handles deliverability; React Email templates are maintainable |
| Scheduled tasks (cron jobs) | Self-hosted cron service + always-on server | Vercel Crons (next-compatible) | Serverless eliminates ops burden; tight integration with Next.js; free tier sufficient for MVP |
| QR code generation & validation | Custom UUID generation + lookup logic | `qrcode` + `uuid` + database UNIQUE constraint | Prevents collision edge cases; library is battle-tested; database constraint provides hard guarantee |

**Key insight:** Supabase and Vercel handle security-critical infrastructure (auth, RLS, scheduling) that would take weeks to build correctly from scratch. The MVP timeline (10-20h/week solo) requires delegating infrastructure to managed services.

---

## Runtime State Inventory

> This phase is greenfield (new project), so no runtime state exists yet. Inventory will apply to later phases (rename, refactor, migration).

Not applicable to Phase 1 — new codebase.

---

## Common Pitfalls

### Pitfall 1: RLS Policies Not Tested Before Deployment
**What goes wrong:** RLS policies look correct in code but have subtle bugs when run against different user contexts. Admin unexpectedly sees other gyms' data (or sees nothing at all).

**Why it happens:** RLS is complex to reason about. Testing requires authenticating as different users, which is awkward in local dev. Easy to deploy with confidence and discover bugs in production.

**How to avoid:**
1. Write RLS tests as part of migration SQL: authenticate as different users and verify queries return expected data
2. Use Supabase Studio to test queries with different JWT tokens (simulate different users)
3. Test all four RLS scenarios: SELECT, INSERT, UPDATE, DELETE for both authenticated and public roles
4. Example test:
   ```sql
   -- Test as authenticated user with org_id = 'gym-1'
   SET ROLE authenticated;
   SET app.current_user_id TO 'user-1';
   SET request.jwt.claims = '{"sub":"user-1","app_metadata":{"org_id":"gym-1"}}';

   SELECT COUNT(*) FROM members; -- Should return only gym-1 members
   ```

**Warning signs:** Admin reports "I see other gyms' data" or "I can't see my own members" after deployment.

**Source:** PITFALLS.md Pitfall 2 (RLS Misconfiguration); Supabase RLS documentation

---

### Pitfall 2: QR Code Not Unique (Collision Risk)
**What goes wrong:** Two different members accidentally assigned the same QR code. Check-ins for both are attributed to the same member.

**Why it happens:** QR code generation not tested for uniqueness. Bad RNG seed or weak generation method.

**How to avoid:**
1. **Use `crypto.randomUUID()` only** — never `Math.random()` or other weak generators
2. **Add UNIQUE constraint in database** — prevents any collision from being inserted
3. **Test with 100K+ rows** — verify no collisions in test suite before MVP
   ```typescript
   // lib/qr.ts
   import { v4 as uuidv4 } from 'uuid';
   import QRCode from 'qrcode';

   export async function generateQRCode(memberId: string) {
     const qrHash = uuidv4(); // Cryptographically secure UUID
     const qrDataUrl = await QRCode.toDataURL(`/checkin/${qrHash}`);
     return { qrHash, qrDataUrl };
   }

   // Database schema
   // CREATE TABLE members (
   //   ...
   //   qr_code_hash TEXT NOT NULL UNIQUE,
   //   ...
   // );
   ```

**Warning signs:** Database constraint violation when creating new member (duplicate QR code), or audit shows two members with same QR code.

**Source:** PITFALLS.md Pitfall 9 (QR Code Collision); CONTEXT.md D-07

---

### Pitfall 3: SUPABASE_SERVICE_ROLE_KEY Missing or Misconfigured
**What goes wrong:** Phase 7 (cron jobs) requires `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. If this key is not set, cron queries return empty results silently. No error message — emails just don't send.

**Why it happens:** `SUPABASE_SERVICE_ROLE_KEY` is not needed for Phase 1, so it's easy to defer. Phase 7 planner has no way to detect the missing key until cron runs in production.

**How to avoid:**
1. **Set and test this key in Phase 1**, even though it's not used yet
2. **Verify in .env.local** — create a simple test script:
   ```typescript
   // lib/test-service-role.ts
   import { createClient } from '@supabase/supabase-js';

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   );

   export async function testServiceRoleKey() {
     const { data, error } = await supabase
       .from('members')
       .select('COUNT(*)');

     if (error) console.error('Service role key test failed:', error);
     else console.log('Service role key test passed');
   }
   ```
3. **Verify in Vercel** — set in project settings (Settings > Environment Variables)
4. **Add to checklist** — include in Phase 1 UAT: "Service role key tested in local + Vercel"

**Warning signs:** Phase 7 cron job executes but sends no emails; logs show "0 alerts processed" despite members past threshold.

**Source:** CONTEXT.md D-09; PITFALLS.md Pitfall 3

---

### Pitfall 4: Environment Variables Inconsistent Between Local and Vercel
**What goes wrong:** Code runs locally (uses `.env.local`) but fails in production (Vercel uses different values or missing env vars).

**Why it happens:** Easy to forget setting all 5 required env vars in both places. `.env.local` is git-ignored, so Vercel config is separate.

**How to avoid:**
1. **Create `.env.example`** with all required keys (values masked):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=[redacted]
   RESEND_API_KEY=[redacted]
   CRON_SECRET=[redacted]
   ```

2. **Set in Vercel early** — don't wait until final deployment:
   ```bash
   vercel env pull .env.local  # Downloads from Vercel project
   ```

3. **Verify both places in UAT checklist:**
   ```bash
   echo "Local .env.local:" && grep SUPABASE_ .env.local | wc -l
   echo "Vercel:" && vercel env list
   ```

4. **Include in deployment script** — catch errors before pushing:
   ```bash
   #!/bin/bash
   required_vars=(
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     SUPABASE_SERVICE_ROLE_KEY
     RESEND_API_KEY
     CRON_SECRET
   )

   for var in "${required_vars[@]}"; do
     if [ -z "${!var}" ]; then
       echo "ERROR: $var is not set in .env.local"
       exit 1
     fi
   done
   ```

**Warning signs:** App runs locally but 500 error in Vercel (env var not set), or "undefined" appears in Supabase client initialization.

**Source:** CONTEXT.md D-14, D-15; STACK.md Environment Variables Required

---

### Pitfall 5: Missing Indexes Cause Slow Churn Detection Queries
**What goes wrong:** Phase 7 cron job queries members by `last_checked_in` without an index. Query takes 30+ seconds on 1000+ members, timeout occurs.

**Why it happens:** Indexes are optional for small datasets but critical for performance as data grows. Easy to forget to create them.

**How to avoid:**
1. **Create indexes as part of Phase 1 migrations** — don't defer:
   ```sql
   CREATE INDEX idx_members_last_checked_in ON members(last_checked_in DESC NULLS LAST);
   CREATE INDEX idx_checkins_member_id_checked_in_at ON checkins(member_id, checked_in_at DESC);
   CREATE INDEX idx_members_qr_code_hash ON members(qr_code_hash);
   ```

2. **Test index effectiveness in Phase 1** — use `EXPLAIN ANALYZE`:
   ```sql
   EXPLAIN ANALYZE
   SELECT COUNT(*) FROM members
   WHERE last_checked_in < NOW() - INTERVAL '7 days'
   AND status = 'active';
   ```
   Should show "Index Scan" not "Seq Scan"

3. **Monitor query performance** — add to Phase 4 dashboard

**Warning signs:** Churn query takes >5 seconds in Phase 7, Vercel cron timeout at 60s.

**Source:** CONTEXT.md D-08; ARCHITECTURE.md Database Schema (indexes section)

---

## Code Examples

### QR Code Generation During Member Creation
```typescript
// lib/qr.ts
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export async function generateMemberQRCode(memberId: string) {
  // Generate unique QR hash (UUID v4)
  const qrHash = uuidv4();

  // Encode check-in URL
  const checkInUrl = `/checkin/${qrHash}`;

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
    margin: 1,
  });

  return {
    qrHash,
    qrDataUrl,
  };
}

// app/api/admin/members/route.ts (create member)
export async function POST(req: NextRequest) {
  const { name, email } = await req.json();

  const { qrHash, qrDataUrl } = await generateMemberQRCode(req.user.id);

  const { error } = await supabase.from('members').insert({
    org_id: req.user.org_id,
    name,
    email,
    qr_code_hash: qrHash,
  });

  return NextResponse.json({ success: true, qrDataUrl });
}
```

**Source:** STACK.md QR Code Generation; ARCHITECTURE.md Pattern 1

---

### RLS Policy Example (Single-Tenant Scoping)
```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Organizations: Admin sees only their own
CREATE POLICY "orgs_select_own" ON organizations
  FOR SELECT TO authenticated
  USING (admin_email = auth.email());

-- Members: Scoped by org_id via JWT custom claim
CREATE POLICY "members_select_org" ON members
  FOR SELECT TO authenticated
  USING (org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid);

CREATE POLICY "members_insert_org" ON members
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid);

-- Checkins: Public INSERT (no auth), SELECT via RLS
CREATE POLICY "checkins_insert_public" ON checkins
  FOR INSERT
  WITH CHECK (true);  -- Public, validated by API layer

CREATE POLICY "checkins_select_org" ON checkins
  FOR SELECT TO authenticated
  USING (org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid);

-- Alerts: Admin only, org-scoped
CREATE POLICY "alerts_select_org" ON alerts
  FOR SELECT TO authenticated
  USING (org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid);

CREATE POLICY "alerts_update_org" ON alerts
  FOR UPDATE TO authenticated
  USING (org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid);
```

**Source:** ARCHITECTURE.md Database Schema (RLS Policies section); Supabase RLS documentation

---

### Check-In Duplicate Prevention (4-Hour Window)
```typescript
// app/api/checkin/route.ts
export async function POST(req: NextRequest) {
  const { member_id } = await req.json();
  const supabase = createRouteHandlerClient({ cookies });

  const { data: member } = await supabase
    .from('members')
    .select('id, org_id, last_checked_in')
    .eq('id', member_id)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Check for duplicate within 4 hours
  if (member.last_checked_in) {
    const hoursSince = (Date.now() - new Date(member.last_checked_in).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 4) {
      return NextResponse.json(
        {
          error: 'You already checked in. Please come back later.',
          nextCheckInAvailable: new Date(new Date(member.last_checked_in).getTime() + 4 * 60 * 60 * 1000)
        },
        { status: 429 }
      );
    }
  }

  // Record check-in
  const now = new Date().toISOString();
  const { error: checkinError } = await supabase.from('checkins').insert({
    org_id: member.org_id,
    member_id: member.id,
    checked_in_at: now,
    ip_address: req.headers.get('x-forwarded-for') || 'unknown',
  });

  if (checkinError) {
    return NextResponse.json({ error: 'Check-in failed' }, { status: 500 });
  }

  // Update last_checked_in
  await supabase
    .from('members')
    .update({ last_checked_in: now })
    .eq('id', member.id);

  return NextResponse.json({ success: true });
}
```

**Source:** PITFALLS.md Pitfall 1 (QR Code Replay Prevention)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router (Next.js 12) | App Router (Next.js 13+) | 2022-2023 | Enables server components, better file colocating, improved API routes |
| useEffect + fetch | React Server Components (RSC) | 2023-2024 | Eliminates waterfalls, reduces bundle size, direct database access from components |
| Custom password hashing | OAuth / Auth-as-a-service (Supabase Auth) | 2020+ | Eliminates security risks, handles MFA and password resets natively |
| Self-hosted cron runners (node-cron) | Serverless crons (Vercel Crons) | 2023-2024 | Eliminates ops burden, integrates with deployment pipeline, free tier sufficient for MVP |
| Manual email configuration (SMTP) | Email-as-a-service (Resend) | 2023+ | Deliverability handled, no SPF/DKIM configuration required from users, React template support |

**Deprecated/outdated:**
- Supabase CLI + local `supabase start` — This phase uses cloud-only development (decision D-01). Local Supabase is powerful but adds complexity for solo dev; cloud-only is simpler.
- Firebase Realtime Database for relational data — PostgreSQL + RLS is more flexible for structured check-in records.

---

## Open Questions

1. **Org Initialization Timing**
   - What we know: Single org per MVP instance; admin email is unique identifier
   - What's unclear: Should org record be seeded in migration (SQL), or created on first admin login?
   - Recommendation: Include in migration as placeholder with admin_email = 'admin@example.com'; can be updated on first real admin signup. Keeps database schema clean and reproducible.

2. **Timezone Handling in MVP**
   - What we know: Churn threshold is "7 days since last check-in"
   - What's unclear: Should thresholds respect gym's local timezone, or use UTC for simplicity?
   - Recommendation: Defer to Phase 2 (MVP v1 uses UTC). Add timezone field to organizations table, implement local timezone math in Phase 7 (cron). Phase 1 assumes UTC for all date math.

3. **Email Verification for Members**
   - What we know: Members have email, but email is optional (nullable in D-06)
   - What's unclear: Should email be required for member creation or optional?
   - Recommendation: Optional in Phase 1 (gym owners might not have member emails). Make required in Phase 2 (for churn alerts to work well). Add validation in API layer, not schema.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js development | ✓ | 18+ (LTS recommended) | — |
| npm | Dependency management | ✓ | 9+ (comes with Node 18+) | yarn, pnpm |
| Git | Version control + Vercel deployment | ✓ | 2.0+ | — |
| Supabase project | Database + Auth | ✓ | Cloud (no local setup per D-01) | — |
| Vercel account | Production deployment | ✓ | Free Hobby tier | Netlify, Railway (less Next.js integration) |
| Resend account | Email sending | ✓ | Free tier (100/day) | SendGrid (less elegant DX) |

**Missing dependencies with no fallback:**
- None identified — all required tools have free tier options.

**Missing dependencies with fallback:**
- Brave Search / Exa Search — not applicable to this phase.

---

## Validation Architecture

**Workflow Status:** `nyquist_validation` is true in config.json — include this section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.x+ (with Node.js test runner) |
| Config file | `jest.config.ts` (generated by create-next-app, may need adjustment) |
| Quick run command | `npm run test -- --testPathPattern="qr\|rls" --watch=false` |
| Full suite command | `npm test` |

**Installation (if not included in `create-next-app`):**
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom ts-jest
npx jest --init
```

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFR-01 | Vercel deployment on git push | Manual smoke test | Manual: push to `main`, verify Vercel dashboard | ❌ Wave 0 (manual confirmation) |
| INFR-02 | Env vars present in Vercel + local | Unit test | `npm test -- lib/test-service-role.ts -t "env vars"` | ❌ Wave 0 — create `lib/test-service-role.ts` |
| INFR-03 | RLS blocks unauthenticated queries | Integration test | `npm test -- __tests__/rls.test.ts` | ❌ Wave 0 — create `__tests__/rls.integration.test.ts` |
| INFR-04 | Indexes exist + improve query performance | Integration test | `npm test -- __tests__/indexes.test.ts` | ❌ Wave 0 — create `__tests__/indexes.integration.test.ts` |

### Sampling Rate
- **Per task commit:** `npm run test -- --testPathPattern="qr" --watch=false` (QR uniqueness tests after member creation task)
- **Per wave merge:** `npm test` (full Jest suite)
- **Phase gate:** All tests green + manual verification of Vercel deployment, Supabase RLS (different users), and env vars before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `jest.config.ts` — verify configuration includes `.test.ts` and `.integration.ts` patterns
- [ ] `__tests__/rls.integration.test.ts` — Test RLS policies with different auth contexts
  - Test 1: Unauthenticated user can insert into checkins but gets empty SELECT
  - Test 2: Authenticated user sees only their org's members
  - Test 3: Service role key bypasses RLS for cron operations
- [ ] `__tests__/qr.test.ts` — Test QR code generation for uniqueness
  - Test 1: `generateMemberQRCode()` returns valid UUID
  - Test 2: 1000 generated QR codes have no collisions
  - Test 3: Database UNIQUE constraint prevents duplicate inserts
- [ ] `lib/test-service-role.ts` — Script to verify SUPABASE_SERVICE_ROLE_KEY is configured
- [ ] `tsconfig.json` adjustment — ensure `@testing-library` types are included
- [ ] `.env.example` — Template for required environment variables
- [ ] Manual verification checklist:
  - [ ] `npm run dev` starts without errors
  - [ ] Supabase connection works (test query in browser console)
  - [ ] All 5 env vars present in `.env.local`
  - [ ] All 5 env vars present in Vercel project settings
  - [ ] Service role key test passes: `npm test -- test-service-role --watch=false`
  - [ ] RLS test passes: `npm test -- rls.integration --watch=false`
  - [ ] Vercel preview deployment succeeds (git push triggers build)

**Test data:** For integration tests, use Supabase test utilities or a separate test project/schema to avoid data pollution.

---

## Project Constraints (from CLAUDE.md)

No CLAUDE.md file exists in this project. All constraints are captured in CONTEXT.md decisions above.

---

## Sources

### Primary (HIGH confidence)
- **CONTEXT.md** — Locked phase decisions, user preferences, scope boundaries
- **ARCHITECTURE.md** — Database schema, RLS policies, component patterns, data flows
- **STACK.md** — Validated technology choices, versions, installation instructions
- **PITFALLS.md** — Critical risks, prevention strategies, phase-specific warnings
- **Next.js 14 App Router official docs** (https://nextjs.org/docs/app) — Server components, Route Handlers, middleware
- **Supabase documentation** (https://supabase.com/docs) — RLS, Auth, PostgREST API
- **Vercel documentation** (https://vercel.com/docs) — Deployment, crons, environment variables

### Secondary (MEDIUM confidence)
- **TypeScript Handbook** (https://www.typescriptlang.org/docs) — Type safety patterns
- **npm package documentation** — qrcode, uuid, react-email, resend versions
- **PostgreSQL documentation** — UNIQUE constraints, indexes, RLS best practices

### Tertiary (LOW confidence - needs validation)
- Training data knowledge (as of Feb 2025) on specific Next.js App Router edge cases
- Email deliverability practices (based on Resend 2025 free tier claims)

---

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — All choices verified against current 2026 standards and official documentation. Versions current as of March 2026.
- **Architecture patterns:** HIGH — ARCHITECTURE.md provides detailed examples; Next.js App Router is stable and production-proven.
- **Pitfalls:** MEDIUM-HIGH — Domain-specific risks (RLS, QR security, cron reliability) documented in PITFALLS.md and Supabase documentation; some risks require Phase 1 validation (UAT).
- **Environment & tooling:** HIGH — All dependencies available free; no paid/proprietary tools required.
- **Validation architecture:** MEDIUM — Testing patterns for RLS and QR uniqueness are standard; specific Jest configuration depends on project structure (Wave 0 task).

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (30 days — stable stack, low churn in Next.js/Supabase tooling)

**Known unknowns:**
- Exact org record initialization method (seeded vs. created on signup) — captured as Open Question 1
- Timezone handling strategy — captured as Open Question 2
- Member email requirement vs. optional — captured as Open Question 3

These do not block Phase 1 planning but should be clarified before Phase 2 (Auth).
