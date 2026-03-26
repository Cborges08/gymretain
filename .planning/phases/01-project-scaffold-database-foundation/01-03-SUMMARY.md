---
phase: 01-project-scaffold-database-foundation
plan: 03
subsystem: data-layer
tags: [supabase, typescript, database-types, client-factories, vercel, cron]
requirements: [INFR-02]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [supabase-client-factories, typescript-database-types, vercel-cron-config]
  affects: [all-future-phases]
tech_stack:
  added: []
  patterns:
    - createBrowserClient for client components
    - createServerClient for App Router server components
    - createServiceRoleClient for RLS-bypass cron jobs (Phase 7)
key_files:
  created:
    - src/lib/supabase/browser.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/service.ts
    - src/lib/types/database.ts
    - vercel.json
    - .env.local (not committed)
  modified:
    - tests/phase1/supabase-clients.test.ts
decisions:
  - server.ts uses createServerClient from @supabase/auth-helpers-nextjs v0.15, calling cookies() directly (not passing the function reference)
  - service.ts throws descriptive errors for both missing URL and missing service role key
metrics:
  duration_s: 190
  completed_date: "2026-03-26"
  tasks_completed: 3
  files_created: 6
---

# Phase 01 Plan 03: Supabase Client Factories and Database Types Summary

**One-liner:** Three typed Supabase client factories (browser/server/service-role) with TypeScript interfaces for all four tables and Vercel cron config wired for Phase 7.

## What Was Built

### Client Factories (`src/lib/supabase/`)

- **browser.ts** — `createBrowserClient()`: for use in `'use client'` components. Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **server.ts** — `createServerClient()`: for use in Server Components and Route Handlers. Calls `cookies()` from `next/headers` and passes the resolved store to `createServerClient` from `@supabase/auth-helpers-nextjs`.
- **service.ts** — `createServiceRoleClient()`: for use ONLY in cron jobs and admin-only RLS-bypass operations. Uses `SUPABASE_SERVICE_ROLE_KEY` exclusively — throws a clear descriptive error if either `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. Never references `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### TypeScript Types (`src/lib/types/database.ts`)

Interfaces matching `001-init-schema.sql` exactly:

| Type           | Notable nullable fields                                       |
|----------------|---------------------------------------------------------------|
| `Organization` | none (all required)                                           |
| `Member`       | `phone`, `last_checked_in`, `external_id` (Fácil placeholder)|
| `Checkin`      | `ip_address`, `user_agent`                                    |
| `Alert`        | `email_sent_at`, `contact_marked_at`, `resolved_at`, `notes` |

`Database` interface also exported for use with `createClient<Database>()`.

`Member.status` is `'active' | 'inactive'` (two-state model per D-05).

### Vercel Config (`vercel.json`)

Configures `/api/cron/detect-churn` to run at `0 6 * * *` (06:00 UTC daily) — ready for Phase 7.

### .env.local

Created at project root with placeholder values for all five required env vars. **Not committed** (already in .gitignore). Developer must fill in real values before running the app locally.

## Test Results

- 7 concrete tests passing in `tests/phase1/supabase-clients.test.ts`
- TypeScript: `npx tsc --noEmit` exits 0 — no errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong export name in server.ts**
- **Found during:** Task 1, TypeScript verification
- **Issue:** Plan specified `createServerComponentClient` from `@supabase/auth-helpers-nextjs`, but v0.15 exports `createServerClient` instead
- **Fix:** Changed import to `createServerClient` aliased as `createClient`
- **Commit:** 72c9b2c

**2. [Rule 1 - Bug] Fixed cookies() call pattern in server.ts**
- **Found during:** Task 1, second TypeScript check
- **Issue:** Passing `cookies` (function reference) to the client options failed type check — v0.15 requires calling `cookies()` first to get the resolved `ReadonlyRequestCookies` store
- **Fix:** Added `const cookieStore = cookies()` and passed `cookieStore` instead
- **Commit:** 72c9b2c

## What the Developer Must Do Before Plan 04

1. **Fill in `.env.local`** with real values:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Dashboard > Project Settings > API
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard > Project Settings > API > service_role key (scroll down)
   - `RESEND_API_KEY`: resend.com > API Keys > Create API Key
   - `CRON_SECRET`: run `openssl rand -hex 32` in terminal

2. **Apply the migration SQL** to your Supabase project if not already done: paste `supabase/migrations/001-init-schema.sql` into Supabase Dashboard > SQL Editor > New query and run it.

3. **Connect Vercel to the repo** and add all five env vars in Vercel project settings (Settings > Environment Variables) — the `vercel.json` cron will not fire until the project is deployed.

## Known Stubs

None — all client factories are fully wired. `.env.local` contains placeholder values by design; the developer fills these in manually (Plan 04 checkpoint will prompt them).

## Self-Check: PASSED
