# Architecture Patterns

**Domain:** Gym retention SaaS (QR check-in + churn alerts)
**Stack:** Next.js 14 App Router + TypeScript + Supabase + Resend
**Researched:** 2026-03-25

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  Admin Dashboard        │    Public Check-in UI                  │
│  (Protected routes)     │    (Stateless, no auth)                │
│                         │                                         │
│  /dashboard/...         │    /checkin/[gym_qr_hash]              │
│  (Server + Client)      │    (Server Component, CPF form)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API/SERVER LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  /api/auth/*           │  /api/checkin         │  /api/admin/*  │
│  (Supabase Auth)       │  (Record check-in)    │  (Data access)  │
│                        │                       │                 │
│  • signUp              │  • POST /checkin      │  • GET members  │
│  • signIn              │    Upsert in DB       │  • GET stats    │
│  • signOut             │    Update last_seen   │  • POST contact │
│  • resetPassword       │    Trigger alert?     │  • GET alerts   │
│                        │                       │                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Churn Detection       │  Alert Generation     │  Auth/RLS      │
│  (Cron Job)            │  (Async, in DB)       │  (Supabase)     │
│                        │                       │                 │
│  • Query members       │  • Check threshold    │  • Single-tenant│
│  • Calculate days away │  • Generate alert rec │  • Org ID in    │
│  • Compare threshold   │  • Mark as unhandled  │    every table  │
│  • Trigger alert email │  • Send via Resend    │  • RLS policies │
│                        │                       │    enforce org  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Supabase PostgreSQL                                             │
│  ├─ organizations (single per MVP instance)                      │
│  ├─ members (students with QR codes)                            │
│  ├─ checkins (history log, indexed by member_id + date)         │
│  ├─ alerts (unhandled churn alerts)                             │
│  └─ alert_interactions (contact tracking)                       │
│                                                                   │
│  Real-time: checkins table for dashboard live updates           │
│  RLS: All queries filtered by org_id                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

| Component | Responsibility | Communicates With | Notes |
|-----------|---------------|-------------------|-------|
| **Admin Dashboard** | Display member list, check-in history, alert status, contact tracking | /api/admin/*, Supabase RT subscription | Server + Client components (RSC + interactive UI) |
| **Public Check-in UI** | Scan gym QR → CPF input form → confirm success | /api/checkin | Server component, no auth. Route: /checkin/[gym_qr_hash] |
| **Auth API** | Sign up, sign in, sign out, password reset | Supabase Auth | Protected by PKCE, session tokens in secure cookies |
| **Check-in API** | Validate gym QR, lookup member by CPF (service role), record check-in, update last_checked_in | Database layer | Uses service role client — RLS blocks anon member SELECT. Validates 4h duplicate window. |
| **Churn Detection Service** | Query members by threshold, generate alert records, send emails | Database + Resend API | Cron job (nightly), marks alerts as unhandled, respects contact_marked_at |
| **Admin API Routes** | Fetch members, check-in stats, mark contact, fetch alerts | RLS-protected Supabase | All queries scoped to org_id via RLS policy |
| **Database (Supabase)** | Single source of truth for members, check-ins, alerts, contact status | All layers via PostgREST | PostgreSQL with RLS, real-time enabled on checkins table |

## Data Flow

### Flow 1: Member Check-In (No Auth)

> **UPDATED (Phase 3 design pivot):** Check-in is no longer per-member QR.
> Gym has one QR code; members identify themselves with CPF.
> See: `.planning/phases/03-member-management/03-CONTEXT.md`

```
1. Member scans gym QR code → /checkin/[gym_qr_hash]
2. GET request hits server component
3. Component looks up org by gym_qr_hash (service role client — bypasses RLS)
4. Displays CPF input form with gym name
5. Member submits CPF → POST /api/checkin { cpf, org_qr_hash }
6. API uses service role client to lookup: SELECT member WHERE org_id = $1 AND cpf = $2
7. If member not found or inactive → return error with friendly message
8. API validates duplicate check-in window (4h): SELECT checkins WHERE member_id AND checked_in_at > NOW()-4h
9. API creates checkin record: { member_id, org_id, checked_in_at, ip_address, user_agent }
10. API updates members.last_checked_in = NOW()
11. Response: JSON { success: true, member_name, message }
12. UI shows success screen with member name and timestamp
```

**Data Written:**
- `checkins` table: { member_id, checked_in_at, org_id, ip_address, user_agent }
- `members.last_checked_in`: NOW()

**No Authentication:** Gym QR is public and unique per gym (UUID-based hash in organizations table).
Member lookup uses **service role client** server-side — required because members RLS blocks anon SELECT.
CPF validation (11-digit checksum) done at app layer before DB lookup.

---

### Flow 2: Admin Login & Dashboard
```
1. Admin visits /auth/login
2. Enters email/password → POST /api/auth/signin
3. Supabase Auth validates credentials
4. Session token stored in secure httpOnly cookie
5. Redirect to /dashboard
6. Dashboard server component checks middleware for org_id in session
7. Queries members with RLS filter: org_id = session.org_id
8. Subscribes to real-time checkins (RSC suspension pattern)
9. Displays member list with last_checked_in, days_away
10. Admin sees unhandled alerts for members > 7 days
```

**Data Read:**
- `members` (org_id-filtered via RLS)
- `checkins` (org_id-filtered, last 30 days)
- `alerts` (org_id-filtered, unhandled = true)

**Security:** RLS policy ensures admin_id can only see org_id's data. Session middleware enforces auth on all /dashboard/* routes.

---

### Flow 3: Churn Detection Cron (Nightly)
```
1. Cron triggers at 2 AM UTC → /api/cron/detect-churn (secret token)
2. API validates cron secret token
3. Query members: SELECT * WHERE org_id = $1 AND status = 'active'
4. For each member:
   a. Calculate: last_checkin - NOW() = days_away
   b. If days_away >= 7:
      - Check if alert already exists: SELECT * FROM alerts WHERE member_id = $1 AND resolved_at IS NULL
      - If no unhandled alert, CREATE alert { member_id, org_id, alert_type: 'churn', triggered_at }
      - Set alert.needs_email = true
5. Query alerts WHERE needs_email = true AND email_sent_at IS NULL
6. For each alert:
   a. Fetch member details + last 5 check-ins
   b. Build email body with frequency insights
   c. Call Resend.emails.send() with admin_email
   d. Update alerts.email_sent_at = NOW()
7. Log cron completion
```

**Data Written:**
- `alerts` table: { member_id, org_id, alert_type, triggered_at, needs_email }
- `alerts.email_sent_at`: NOW()

**Email Content Example:**
```
Subject: 🚨 [Member Name] hasn't checked in for 10 days

Hi [Admin Name],

[Member Name] has been inactive for 10 days.
Last check-in: [Date]
Frequency (last 30 days): 8 visits
Suggestion: Send a quick message to check in.

Mark as contacted → [dashboard link]
```

---

### Flow 4: Admin Marks Contact (Manual Interaction)
```
1. Admin sees alert in dashboard
2. Admin clicks "I've contacted them"
3. POST /api/admin/alerts/[alert_id]/contact
4. API checks RLS: org_id matches
5. Updates alerts: contact_marked_at = NOW(), needs_email = false
6. Clears alert from "unhandled" list
7. Response: success, refreshes dashboard (RSC revalidatePath)
```

**Data Written:**
- `alerts.contact_marked_at`: NOW()
- `alerts.needs_email`: false

**Follow-up:** If member still doesn't check in, new alert triggers in next cron cycle (separate alert record).

## Build Order (Dependency Sequence)

### Phase 1: Core Infrastructure
**Why first:** Everything depends on it
- [ ] Supabase project setup + auth configuration
- [ ] Database schema (organizations, members, checkins, alerts tables)
- [ ] RLS policies for single-tenant enforcement
- [ ] Environment variables and secrets (.env.local)

### Phase 2: Admin Auth
**Why second:** Protects all admin features
- [ ] /api/auth/* routes (sign-up, sign-in, sign-out)
- [ ] Middleware to enforce auth on /dashboard/*
- [ ] Login page UI (/auth/login)
- [ ] Session management in secure cookies

### Phase 3: Public Check-in
**Why third:** Core user-facing feature, no admin dependency
- [ ] QR code generation at member creation
- [ ] /checkin/[qr_code_hash] route (public, server component)
- [ ] /api/checkin POST endpoint
- [ ] Check-in confirmation UI
- [ ] Database upsert logic for check-ins

### Phase 4: Admin Dashboard
**Why fourth:** Depends on auth + check-in data
- [ ] Member list view with filtering
- [ ] Check-in history per member
- [ ] Days-away calculation and display
- [ ] Real-time subscription to checkins table
- [ ] Alert list view (unhandled alerts)
- [ ] "Mark as contacted" UI + API

### Phase 5: Churn Detection & Email
**Why fifth:** Depends on check-in data + admin setup (needs email address)
- [ ] Cron job setup (Vercel deployments, serverless function)
- [ ] Churn detection logic (days_away calculation, alert creation)
- [ ] Resend integration (email template, send logic)
- [ ] Email sending API call in cron function
- [ ] Alert status tracking (email_sent_at, resolved_at fields)

### Phase 6: Polish & Optimization
**Why last:** After core flows work end-to-end
- [ ] Error handling and retry logic for Resend
- [ ] Rate limiting on check-in API
- [ ] Pagination for large member lists
- [ ] Email template customization
- [ ] Cron job monitoring and alerts

## Database Schema Outline

```sql
-- Organizations (single-tenant MVP)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_email)  -- One org per admin email
);

-- Members (students at a gym)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  qr_code_hash TEXT NOT NULL UNIQUE,  -- UUID-based, unique globally
  qr_code_generated_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_in TIMESTAMPTZ,  -- NULL until first check-in
  status TEXT DEFAULT 'active',  -- 'active', 'paused', 'inactive'
  external_id TEXT,  -- Reserved for Fácil integration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email),  -- Email unique per org
  UNIQUE(org_id, external_id)  -- If using external_id
);

-- Check-ins (audit log)
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,  -- Optional: for fraud detection later
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts (churn detection)
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  alert_type TEXT DEFAULT 'churn',  -- 'churn', future: 'milestone', etc.
  triggered_at TIMESTAMPTZ NOT NULL,  -- When churn was detected
  email_sent_at TIMESTAMPTZ,  -- When admin was emailed
  contact_marked_at TIMESTAMPTZ,  -- When admin marked "I contacted them"
  resolved_at TIMESTAMPTZ,  -- When alert is resolved (member checks in or manually closed)
  notes TEXT,  -- Admin notes on the alert
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_members_org_id ON members(org_id);
CREATE INDEX idx_members_last_checked_in ON members(last_checked_in DESC);
CREATE INDEX idx_members_qr_code_hash ON members(qr_code_hash);
CREATE INDEX idx_checkins_org_id_member_id ON checkins(org_id, member_id);
CREATE INDEX idx_checkins_checked_in_at ON checkins(checked_in_at DESC);
CREATE INDEX idx_alerts_org_id_resolved ON alerts(org_id, resolved_at);
CREATE INDEX idx_alerts_member_id ON alerts(member_id);

-- RLS Policies (Single-Tenant Enforcement)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Organizations: Admin sees only their own
CREATE POLICY "orgs_select_own" ON organizations
  FOR SELECT TO authenticated
  USING (admin_email = auth.email());

-- Members: Scoped by org_id (via middleware setting custom claim)
CREATE POLICY "members_select_org" ON members
  FOR SELECT TO authenticated
  USING (org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid);

CREATE POLICY "members_insert_org" ON members
  FOR INSERT TO authenticated
  WITH CHECK (org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid);

-- Check-ins: Public insert (no auth), select via org_id RLS
CREATE POLICY "checkins_insert_public" ON checkins
  FOR INSERT
  WITH CHECK (true);  -- Public check-in, validated by API

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

## Patterns to Follow

### Pattern 1: Server Components for Data Fetching
**What:** Use React Server Components (default in App Router) to fetch data directly from Supabase in component render.

**When:** Dashboard pages, member list, check-in history display — anywhere you read-only query the database.

**Example:**
```typescript
// app/dashboard/members/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function MembersPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('org_id', session?.user?.user_metadata?.org_id)
    .order('last_checked_in', { ascending: false });

  return (
    <div>
      {members.map(m => (
        <div key={m.id}>
          {m.name} — Last seen: {m.last_checked_in}
        </div>
      ))}
    </div>
  );
}
```

**Why:** Server components reduce JavaScript bundle, eliminate waterfalls (direct DB access), and simplify auth context.

---

### Pattern 2: Client Components for Interactivity
**What:** Minimal client components for buttons, forms, real-time updates. Fetch via Route Handlers (/api/*).

**When:** Modal opens, user clicks "Mark as contacted", real-time subscription updates needed.

**Example:**
```typescript
// app/dashboard/members/client.tsx
'use client';

import { useState } from 'react';
import { revalidatePath } from 'next/cache';  // Can't use in client, use API instead

export function ContactButton({ alertId }: { alertId: string }) {
  const [loading, setLoading] = useState(false);

  const handleContact = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/alerts/contact', {
      method: 'POST',
      body: JSON.stringify({ alertId }),
    });
    setLoading(false);
    // Trigger revalidation via API callback
    window.location.reload();
  };

  return (
    <button onClick={handleContact} disabled={loading}>
      {loading ? 'Marking...' : 'I contacted them'}
    </button>
  );
}
```

**Why:** Keeps serialization clean (no passing functions to client), maintains auth isolation, leverages Route Handlers for mutations.

---

### Pattern 3: Route Handlers for API Logic
**What:** /api/* files are server-side endpoints that validate, mutate data, call external APIs (Resend).

**When:** Check-in submission, alert status updates, email sending.

**Example (Check-in):**
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
    .select('id, org_id')
    .eq('id', member_id)
    .single();

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  // Record check-in
  const { error } = await supabase.from('checkins').insert({
    org_id: member.org_id,
    member_id: member.id,
    checked_in_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update last_checked_in
  await supabase
    .from('members')
    .update({ last_checked_in: new Date().toISOString() })
    .eq('id', member.id);

  return NextResponse.json({ success: true });
}
```

**Why:** Centralized validation, external API calls (Resend), database mutations in protected context.

---

### Pattern 4: Cron Jobs via Vercel Functions
**What:** Serverless functions triggered on schedule (Vercel Cron) for churn detection.

**When:** Nightly churn detection, recurring batch operations.

**Example:**
```typescript
// api/cron/detect-churn.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Use service role key for cron jobs (unscoped queries)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  // Verify cron secret
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
        .single();

      if (!existingAlert) {
        await supabase.from('alerts').insert({
          org_id: member.org_id,
          member_id: member.id,
          alert_type: 'churn',
          triggered_at: new Date().toISOString(),
        });
      }
    }

    // Send emails for alerts
    const { data: pendingAlerts } = await supabase
      .from('alerts')
      .select('*, members(name, email), organizations(admin_email)')
      .is('email_sent_at', null);

    for (const alert of pendingAlerts) {
      await resend.emails.send({
        from: 'alerts@gymretain.app',
        to: alert.organizations.admin_email,
        subject: `Inactive member: ${alert.members.name}`,
        html: `<p>Member ${alert.members.name} hasn't checked in for 7+ days.</p>`,
      });

      await supabase
        .from('alerts')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', alert.id);
    }

    return NextResponse.json({ success: true, processed: churnMembers.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Cron trigger (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/detect-churn",
      "schedule": "0 2 * * *"  // 2 AM UTC daily
    }
  ]
}
```

**Why:** Decoupled from user requests, handles long-running operations, respects free tier limits.

---

### Pattern 5: RLS + Middleware for Auth
**What:** Combine Supabase RLS policies with Next.js middleware to enforce org_id context.

**When:** Every database query, ensuring admins only see their org's data.

**Example (Middleware):**
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

  // Attach org_id to custom claims (set during sign-up)
  if (session?.user?.user_metadata?.org_id) {
    // Claims already in JWT, used by RLS policies
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
};
```

**Why:** Prevents unauthorized queries at the database layer (RLS), not just application layer.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fetching Data in Client Components
**What:** Using `useEffect` + `fetch` in a client component to load dashboard data.

**Why bad:**
- Waterfalls: Component renders, then fetches, then re-renders (slow)
- Auth context: Can't easily access session in useEffect
- Bundle size: Supabase client library added to JavaScript

**Instead:** Use Server Components (RSC) to fetch directly in component, or use Route Handlers + SWR for specific interactive sections.

---

### Anti-Pattern 2: Storing org_id in State
**What:** Extracting org_id from session and storing in React state to pass to children.

**Why bad:**
- Serialization issues between server/client
- Prop drilling through deeply nested components
- RLS policies become unreliable if org_id is client-controlled

**Instead:** Use middleware to inject org_id into JWT custom claims; RLS policies read from auth.jwt().

---

### Anti-Pattern 3: Public Check-in Requiring Member Lookup by Email
**What:** Asking member to enter email + name to match QR code.

**Why bad:**
- Introduces friction: member must remember email or type carefully
- Increases failed check-ins
- Doesn't align with "no login" requirement

**Instead:** Encode member_id directly in QR code (UUID hash), no email needed at check-in.

---

### Anti-Pattern 4: Storing Passwords in Database
**What:** Rolling custom auth instead of Supabase Auth.

**Why bad:**
- Security liability (password hashing bugs)
- No MFA, no password reset flow
- GDPR compliance headaches

**Instead:** Delegate to Supabase Auth; it handles session management, password resets, secure storage.

---

### Anti-Pattern 5: Cron Jobs Querying Without Service Role
**What:** Using a regular authenticated Supabase client in a cron job.

**Why bad:**
- RLS policies apply; cron job can only see data filtered by its org_id (which is None)
- Cron job queries return empty results
- Email alerts never send

**Instead:** Use `createClient` with SUPABASE_SERVICE_ROLE_KEY for cron jobs; bypasses RLS for administrative operations.

---

## Scalability Considerations

| Concern | At 100 users (MVP) | At 10K users | At 1M users |
|---------|-------------------|--------------|-------------|
| **Member list rendering** | Server component direct query, no pagination | Add pagination (50 members/page), indexed by org_id + name | Materialized view for aggregate stats, full-text search |
| **Check-in volume** | Batch inserts (100s/day), no issue | Batch inserts (1000s/day), consider connection pooling | Partitioned checkins table by date, async event stream |
| **Churn detection query** | Full table scan, <1s | Indexed query on (org_id, last_checked_in), <100ms | Pre-computed churn flags, incremental updates |
| **Email throughput** | Resend free: 100/day, sufficient | Upgrade to Resend pro: 10K+/day, batch sending | Resend enterprise, queue-based retry (Bull/Temporal) |
| **Database connections** | Supabase free: 10 concurrent, sufficient | Increase to Pro plan: 100 connections | Connection pooling (PgBouncer), read replicas |
| **Real-time subscriptions** | 1-2 admins, <1KB events | 10-20 admins, edge caching for checkins feed | Broadcast channels instead of table subscriptions |

**Immediate optimizations (MVP → 10K):**
- Add pagination to member list (prevents timeout on 10K query)
- Index `members.last_checked_in` for churn detection
- Cache dashboard stats (invalidate on check-in)
- Batch email sends in cron job (5 at a time, 1s delay between)

**Future optimizations (10K → 1M):**
- Separate read replica for reports
- Checkins table partitioning by month
- Event-driven churn detection (trigger on check-in, not cron)
- Dedicated email queue (Bull/Temporal) instead of direct Resend calls

## Next.js App Router-Specific Patterns

### Dynamic Routes for QR Codes
**File structure:**
```
app/
├── checkin/
│   └── [qr_code_hash]/
│       └── page.tsx          # Server component, no auth
├── dashboard/
│   ├── members/
│   │   └── page.tsx          # Server component, protected
│   ├── alerts/
│   │   └── page.tsx          # Server component, protected
│   └── layout.tsx            # Middleware redirect if not logged in
└── api/
    ├── checkin/
    │   └── route.ts          # POST check-in submission
    ├── admin/
    │   ├── members/
    │   │   └── route.ts      # GET members list (protected by RLS)
    │   └── alerts/
    │       └── contact/
    │           └── route.ts  # POST mark alert as contacted
    └── cron/
        └── detect-churn.ts   # GET nightly churn job
```

### Real-Time Subscriptions in RSC
**Pattern:** Server component with async Suspense boundary.

```typescript
// app/dashboard/members/page.tsx
import { Suspense } from 'react';

export default function MembersPage() {
  return (
    <Suspense fallback={<div>Loading members...</div>}>
      <MembersList />
    </Suspense>
  );
}

async function MembersList() {
  const supabase = createServerComponentClient({ cookies });

  // Fetch initial data
  const { data: members } = await supabase
    .from('members')
    .select('*')
    .order('last_checked_in', { ascending: false });

  // For real-time, attach client component with subscription
  return (
    <div>
      <MembersListClient initialMembers={members} />
    </div>
  );
}
```

**Client subscription wrapper:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

function MembersListClient({ initialMembers }) {
  const [members, setMembers] = useState(initialMembers);
  const supabase = useSupabaseClient();

  useEffect(() => {
    // Subscribe to checkins table changes
    const subscription = supabase
      .from('checkins')
      .on('INSERT', payload => {
        // Member just checked in, update UI
        setMembers(prev =>
          prev.map(m =>
            m.id === payload.new.member_id
              ? { ...m, last_checked_in: payload.new.checked_in_at }
              : m
          )
        );
      })
      .subscribe();

    return () => supabase.removeSubscription(subscription);
  }, [supabase]);

  return (
    <table>
      {members.map(m => <tr key={m.id}>{m.name}</tr>)}
    </table>
  );
}
```

**Why:** Combines server-side data fetch (fast initial load) with client-side real-time updates (interactive dashboard).

## Sources

- **Next.js 14 App Router:** Project stack constraint (vercel.com/docs/app)
- **Supabase RLS & Auth:** Single-tenant architecture, project requirement
- **Resend API:** Email provider constraint, free tier 100/day emails
- **QR code generation:** Stateless, member_id → UUID hash, no login required
- **Cron job patterns:** Vercel Functions, serverless execution
- **Real-time dashboard:** Supabase broadcast channels, minimal polling

**Confidence:** HIGH — Based on Next.js 14 App Router official docs, Supabase best practices, and single-tenant SaaS architecture patterns. Validated against project constraints (free tier, solo dev, TypeScript+Tailwind stack).
