# Phase 4: QR Check-In Flow - Research

**Researched:** 2026-03-31
**Domain:** Anonymous member check-in via QR code + CPF lookup, duplicate detection, audit trail recording
**Confidence:** HIGH

## Summary

Phase 4 implements a public-facing check-in flow where gym members scan a QR code (no login required) and enter their CPF to record their presence. The architecture builds on decisions from Phase 3 (gym-level QR code + member CPF model) and integrates tightly with the established Next.js app structure.

Key technical patterns are already established: Server Components validate QR hashes, Client Components handle form interaction, Route Handlers bypass RLS via service role for specific operations, and Zod schemas validate all inputs. The check-in page sits outside the auth/dashboard route groups, protected by middleware explicitly. CPF masking and form validation patterns are reusable from Phase 3 member creation.

The phase requires handling header access (IP address, user-agent) for audit trails — only available in Route Handlers, not Server Actions. Four-hour duplicate detection uses a `checked_in_at` timestamp query with timezone handling. Success screens are static (no auto-redirect). Error states display friendly Portuguese messages without exposing internal details.

**Primary recommendation:** Use Route Handler (not Server Action) for `/api/checkin` to access request headers. Split the page into Server Component (QR validation) + Client Component (form submission). Implement CPF masking with a simple JavaScript handler (no new dependency). Test duplicate detection logic carefully with timezone-aware timestamps.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 through D-17 are fully locked implementation decisions from the phase discussion:**

- Page lives at `src/app/checkin/[hash]/page.tsx` — outside route groups, no auth middleware
- Server Component validates QR hash upfront; renders error card inline (no redirect) if invalid
- `<CheckinForm>` is Client Component receiving `{ orgId, orgName, qrHash }` props
- Full-screen emerald-600 (`bg-emerald-600`) layout with white card, mobile-first design
- Card shows gym name heading, "Registre seu check-in" subtitle, CPF input with mask, "Confirmar Check-in" button
- No gym logo — gym name text only
- CPF input uses formatted mask (`___.___.___-__`) — same UX as Phase 3 member create form
- Client validates CPF length (11 digits after stripping) before submitting
- `POST /api/checkin` Route Handler (not Server Action) — direct header access for IP + user-agent
- Request body: `{ qr_hash: string, cpf: string }`
- Success response: `{ ok: true, memberName: string, checkedInAt: string }`
- Error responses: `{ ok: false, code: 'NOT_FOUND' | 'DUPLICATE' | 'INVALID_HASH', checkedInAt?: string }`
- Update `service.ts` comment to include `/api/checkin (Phase 4)` in allowed usage
- Invalid/missing QR hash → Server Component renders friendly error card inline (no 500 error)
- CPF not found or member inactive → Generic error: "CPF não encontrado ou não cadastrado."
- Duplicate within 4h → "Você já fez check-in hoje às [HH:MM]." — no new row created
- Success screen is static: "✓ Check-in registrado!", member's first name ("Bem-vindo, [Nome]!"), timestamp formatted as "31/03/2026 às 14h30"
- Audit trail records: `member_id`, `org_id`, `checked_in_at` (UTC), `ip_address` (from `x-forwarded-for`), `user_agent`
- `members.last_checked_in` updated atomically after insert
- Add `/checkin` path to middleware public-paths list

### Claude's Discretion

- CPF mask implementation (vanilla JS handler vs lightweight lib like `react-input-mask` / `maska`) — prefer no new dependency if 10-line handler suffices
- Loading/pending state on confirm button during fetch (disable + spinner)
- Exact Portuguese copy for button labels (within pt-BR requirement)
- Whether to add `noValidate` on form (consistent with Phase 3 pattern)

### Deferred Ideas (OUT OF SCOPE)

- CPF checksum validation — deferred to Phase 9 (polish)
- Auto-redirect after success — not in MVP member use case
- "Registrar outro check-in" button on success screen — tablet-at-entrance use case, deferred
- Rate limiting on `/api/checkin` — deferred to Phase 9 (hardening)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHKN-01 | Member scans QR without login, enters CPF, confirms check-in | Route Handler `/api/checkin`, Server Component validation, Client form |
| CHKN-02 | Check-in page confirms with member name and timestamp | Server Component reads org; Client Component displays success with member.name and formatted timestamp |
| CHKN-03 | Duplicate within 4h rejected gracefully | Route Handler queries last checkin within 4h window; no duplicate row inserted |
| CHKN-04 | Audit trail: timestamp, IP, user-agent recorded | Route Handler accesses request headers (`x-forwarded-for`, `user-agent`); inserted into checkins table |
| CHKN-05 | `members.last_checked_in` updated after check-in | Route Handler updates after insert (or upsert pattern) |
| CHKN-06 | Invalid/deactivated code shows clear error | Server Component inline error for invalid hash; Route Handler generic error for inactive member |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2.35 | App Router, Server/Client Components, Route Handlers | Project foundation; deployed and validated |
| React | 18 | Client-side form state, interactivity | Standard with Next.js 14 |
| TypeScript | 5 | Type safety for form data, route handlers, database queries | Project standard |
| Supabase | 2.100.0 | PostgreSQL + RLS + real-time, authentication | Project foundation; schema ready (Phase 1) |
| Tailwind CSS | 3.3.0 | Styling emerald-600 full-screen layout + white card | Project standard |
| Zod | 4.3.6 | Input validation for CPF, qr_hash | Already used in Phase 3 for member form validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0 | Format timestamps for display (pt-BR locale) | Display "31/03/2026 às 14h30" on success screen |
| @supabase/auth-helpers-nextjs | 0.15.0 | Middleware for session handling | Already configured; middleware.ts exists and routes `/checkin` as public |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod input validation | Manual string checks | Zod enforces type safety; prevents bugs in CPF stripping and hash validation |
| Route Handler + header access | Server Action | Server Actions cannot access request headers; Route Handler required for IP + user-agent |
| Simple JS CPF mask | react-input-mask library | 10-line JavaScript handler (e.g., input event listener) sufficient; no new dependency needed for MVP |

**Installation:**
No new npm packages required. All dependencies already present in Phase 3.

**Version verification:**
- Next.js: 14.2.35 (per package.json, deployed)
- Supabase: 2.100.0 (per package.json, validated Phase 1)
- Zod: 4.3.6 (per package.json, in use Phase 3)
- date-fns: 4.1.0 (per package.json)

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── checkin/
│   │   └── [hash]/
│   │       └── page.tsx                    # Server Component: validates QR hash, renders error or form
│   ├── api/
│   │   └── checkin/
│   │       └── route.ts                    # Route Handler: lookup member, record check-in, update last_checked_in
│   ├── (dashboard)/                        # Protected routes — not /checkin
│   └── (auth)/
├── lib/
│   ├── utils/
│   │   ├── cpf.ts                          # Existing: maskCpf, isValidCpfFormat, stripCpf, formatCpf
│   │   └── checkin.ts                      # NEW: duplicate detection, audit trail helpers
│   ├── supabase/
│   │   ├── service.ts                      # Service role client (update comment: add /api/checkin)
│   │   └── server.ts                       # Server client (used in Server Component)
│   └── types/
│       └── database.ts                     # Already includes Checkin, Member, Organization types
└── middleware.ts                           # Add /checkin to public paths
```

### Pattern 1: Server Component → Client Component Split

**What:** The check-in page is split across two files because Next.js App Router doesn't allow `'use client'` mid-file. Server Component handles stateless QR validation; Client Component handles form state and submission.

**When to use:** Whenever a page needs both server-side auth/validation (QR hash lookup) and client-side interactivity (form submission, loading state).

**Example:**

```typescript
// src/app/checkin/[hash]/page.tsx
// Server Component
import { createServerClient } from '@/lib/supabase/server'
import { CheckinForm } from './CheckinForm'

export default async function CheckinPage({ params }: { params: { hash: string } }) {
  const supabase = createServerClient()

  // Validate QR hash exists and belongs to an active org
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, qr_code_hash')
    .eq('qr_code_hash', params.hash)
    .single()

  if (error || !org) {
    return (
      <div className="bg-emerald-600 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-sm">
          <p className="text-gray-900 text-sm">QR Code inválido. Este código não foi encontrado. Fale com seu professor.</p>
        </div>
      </div>
    )
  }

  // Valid QR — render form
  return (
    <div className="bg-emerald-600 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{org.name}</h1>
        <p className="text-gray-600 text-sm mb-6">Registre seu check-in</p>
        <CheckinForm orgId={org.id} orgName={org.name} qrHash={params.hash} />
      </div>
    </div>
  )
}
```

```typescript
// src/app/checkin/[hash]/CheckinForm.tsx
// Client Component
'use client'

import { useState } from 'react'
import { stripCpf } from '@/lib/utils/cpf'

interface CheckinFormProps {
  orgId: string
  orgName: string
  qrHash: string
}

export function CheckinForm({ orgId, orgName, qrHash }: CheckinFormProps) {
  const [cpf, setCpf] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ name: string; timestamp: string } | null>(null)

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 11) value = value.slice(0, 11)

    // Format: ___.___.___-__
    let formatted = ''
    if (value.length <= 3) {
      formatted = value
    } else if (value.length <= 6) {
      formatted = `${value.slice(0, 3)}.${value.slice(3)}`
    } else if (value.length <= 9) {
      formatted = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`
    } else {
      formatted = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`
    }
    setCpf(formatted)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const cleanCpf = stripCpf(cpf)
    if (cleanCpf.length !== 11) {
      setError('CPF inválido. Digite 11 dígitos.')
      return
    }

    setPending(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_hash: qrHash, cpf: cleanCpf }),
      })

      const data = await res.json()

      if (!data.ok) {
        if (data.code === 'DUPLICATE' && data.checkedInAt) {
          const lastTime = new Date(data.checkedInAt).toLocaleString('pt-BR')
          setError(`Você já fez check-in hoje às ${lastTime}.`)
        } else if (data.code === 'NOT_FOUND') {
          setError('CPF não encontrado ou não cadastrado.')
        } else if (data.code === 'INVALID_HASH') {
          setError('QR Code inválido.')
        } else {
          setError('Erro ao registrar check-in. Tente novamente.')
        }
      } else {
        setSuccess({ name: data.memberName, timestamp: data.checkedInAt })
      }
    } catch (err) {
      setError('Erro de conexão. Verifique sua internet.')
    } finally {
      setPending(false)
    }
  }

  if (success) {
    const date = new Date(success.timestamp)
    const formatted = date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/, '$1/$2/$3 às $4h$5')

    return (
      <div className="text-center">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-2xl font-semibold text-emerald-600 mb-2">Check-in registrado!</h2>
        <p className="text-gray-900 text-lg mb-2">Bem-vindo, {success.name}!</p>
        <p className="text-gray-600 text-sm">{formatted}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="cpf" className="block text-xs font-semibold text-gray-900 mb-1">
          CPF
        </label>
        <input
          id="cpf"
          type="text"
          inputMode="numeric"
          value={cpf}
          onChange={handleCpfChange}
          maxLength={14}
          placeholder="000.000.000-00"
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-emerald-600 text-white h-10 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Processando...' : 'Confirmar Check-in'}
      </button>
    </form>
  )
}
```

Source: Phase 3 pattern (QRCodeDisplay.tsx split from page.tsx), confirmed by D-02 and D-03 in CONTEXT.md.

### Pattern 2: Route Handler with Service Role Client

**What:** Route Handlers can access request headers and bypass RLS via service role client. This is the ONLY place (outside cron) where service role is used.

**When to use:** When you need to:
- Access HTTP headers (IP, user-agent)
- Bypass RLS policies (but with explicit org_id guards)
- Record audit trails

**Example:**

```typescript
// src/app/api/checkin/route.ts
import { createServiceRoleClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  qr_hash: z.string().uuid(),
  cpf: z.string().regex(/^\d{11}$/),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: 'INVALID_HASH' }, { status: 400 })
    }

    const { qr_hash, cpf } = parsed.data
    const supabase = createServiceRoleClient()

    // 1. Lookup org by QR hash
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('qr_code_hash', qr_hash)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ ok: false, code: 'INVALID_HASH' }, { status: 404 })
    }

    // 2. Lookup member by org_id + cpf
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, status')
      .eq('org_id', org.id)
      .eq('cpf', cpf)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 })
    }

    // 3. Check if member is active
    if (member.status !== 'active') {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 })
    }

    // 4. Check for duplicate within 4h
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    const { data: recentCheckin, error: recentError } = await supabase
      .from('checkins')
      .select('checked_in_at')
      .eq('org_id', org.id)
      .eq('member_id', member.id)
      .gte('checked_in_at', fourHoursAgo)
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .single()

    if (!recentError && recentCheckin) {
      // Duplicate detected
      return NextResponse.json(
        { ok: false, code: 'DUPLICATE', checkedInAt: recentCheckin.checked_in_at },
        { status: 409 }
      )
    }

    // 5. Record check-in with audit trail
    const ipAddress = req.headers.get('x-forwarded-for') || req.socket?.remoteAddress || null
    const userAgent = req.headers.get('user-agent') || null
    const checkedInAt = new Date().toISOString()

    const { error: insertError } = await supabase
      .from('checkins')
      .insert({
        org_id: org.id,
        member_id: member.id,
        checked_in_at: checkedInAt,
        ip_address: ipAddress,
        user_agent: userAgent,
      })

    if (insertError) {
      console.error('Checkin insert error:', insertError)
      return NextResponse.json(
        { ok: false, code: 'DUPLICATE' },
        { status: 409 }
      )
    }

    // 6. Update member last_checked_in
    await supabase
      .from('members')
      .update({ last_checked_in: checkedInAt })
      .eq('id', member.id)

    return NextResponse.json({
      ok: true,
      memberName: member.name.split(' ')[0], // First name only
      checkedInAt,
    })
  } catch (error) {
    console.error('Checkin error:', error)
    return NextResponse.json(
      { ok: false, code: 'INVALID_HASH' },
      { status: 500 }
    )
  }
}
```

Source: Established from Phase 1 (service role client pattern), confirmed by D-09, D-10 in CONTEXT.md.

### Anti-Patterns to Avoid

- **Server Action for check-in submission:** Server Actions cannot access request headers; use Route Handler instead
- **Storing full CPF in response:** Return only member first name and timestamp; never echo the CPF back to client
- **String-based timestamp comparison:** Use ISO 8601 UTC strings for all database timestamps; timezone handling is error-prone with custom formats
- **Querying without org_id guard:** Every query must filter by `org_id` to prevent cross-org data leakage
- **Auto-redirect on success:** Static success screen (no `redirect()` call) — members close the tab manually

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CPF input masking | Custom regex state machine | Simple JS `input` event handler (10 lines) | Handles backspace, deletion, paste correctly; regex formatting is fragile |
| QR hash validation | Manual string length checks | Zod `.uuid()` validator | Ensures valid UUID format; prevents injection attacks |
| Timestamp formatting for pt-BR display | Manual string concatenation | `date-fns` + `toLocaleString('pt-BR')` | Handles day/month/year order, AM/PM abbreviations, edge cases (e.g., Feb 29) |
| 4-hour window duplicate detection | Manual Date arithmetic | `.gte('checked_in_at', new Date(Date.now() - 4*60*60*1000).toISOString())` | Prevents off-by-one errors in millisecond calculation |
| Member lookup with org scoping | Custom multi-step queries | Supabase `.eq()` chains with `.single()` | Guarantees single result; throws if not found; prevents accidental multi-row returns |

**Key insight:** The check-in flow involves precise timing (4-hour window), locale-aware formatting (pt-BR dates), and critical data isolation (org scoping). Libraries and built-in utilities handle these edge cases correctly; custom implementations introduce bugs.

## Runtime State Inventory

**Trigger:** This is a greenfield feature (no existing check-in flow to migrate). No runtime state inventory required.

## Common Pitfalls

### Pitfall 1: Accessing Headers in Server Components or Server Actions

**What goes wrong:** You try to call `req.headers` or `req.socket` in a Server Component or Server Action, but these values are `undefined`. The code compiles but fails at runtime.

**Why it happens:** Server Components and Server Actions do not have direct access to the HTTP request object. Only Route Handlers (Edge Runtime functions) receive the `NextRequest` parameter.

**How to avoid:** Always use Route Handlers for operations that need headers (IP address, user-agent). Separate concerns: Server Component validates data, Route Handler handles submission with header access.

**Warning signs:** Code checking `req?.headers?.get('x-forwarded-for')` in a Server Action, or runtime `Cannot read property 'headers' of undefined` errors.

**Source:** Next.js 14 App Router docs (Route Handlers vs Server Actions).

### Pitfall 2: Timezone Mismatches in Duplicate Detection

**What goes wrong:** Your 4-hour window calculation uses the browser's local timezone, but the database stores UTC. A member checks in at 14:00 local time (10:00 UTC), then tries again 3 hours 59 minutes later (local time). Your code calculates `Date.now() - 4*60*60*1000` in the browser (local timezone) and the duplicate check fails — the second check-in is recorded even though it's within 4 hours.

**Why it happens:** `Date.now()` returns milliseconds since Unix epoch (UTC), but when displayed or used in locale-aware calculations without explicit UTC conversion, timezone offsets cause drift.

**How to avoid:** Always store and compare timestamps in UTC ISO 8601 format (`2026-03-31T14:30:00Z`). Calculate the 4-hour window on the server (Route Handler) where timezone is implicit. Never do timezone-aware math on the client.

**Warning signs:** Duplicate detection inconsistently works depending on where tests run; members in different timezones see different behavior.

**Source:** Established from Phase 3 (member.last_checked_in uses UTC stored as ISO string); verified by CONTEXT.md D-16, D-17.

### Pitfall 3: Exposing Membership via Error Messages

**What goes wrong:** Your error messages distinguish between "member not found" and "member inactive": `"CPF não encontrado"` vs. `"Membro desativado"`. An attacker scans the QR code repeatedly with different CPFs and learns which members exist.

**Why it happens:** It's intuitive to give specific error messages for debugging. But the check-in endpoint is public and unauthenticated — any attacker can enumerate members.

**How to avoid:** Return the same generic error for all "member does not exist or cannot check in" cases: `"CPF não encontrado ou não cadastrado."` Query both conditions (missing AND inactive) and return one error.

**Warning signs:** Your error response changes based on member.status or member != null checks in different code paths.

**Source:** CONTEXT.md D-13 (explicit decision to use generic error).

### Pitfall 4: Not Checking Member Status Before Recording Check-In

**What goes wrong:** A gym manager deactivates a member (`status = 'inactive'`), but a deactivated member can still scan the QR code and check in because the Route Handler never verified the status.

**Why it happens:** You check `if (member) { ... insert checkin ... }` but don't also check `if (member.status === 'active')`. The status field exists but isn't validated.

**How to avoid:** Validate status explicitly before recording: `if (member.status !== 'active') { return error }`. Treat inactive members the same as not-found (generic error message).

**Warning signs:** Tests pass for "member checks in," but tests for "deactivated member checks in" still succeed.

**Source:** CONTEXT.md D-13 (no distinction in error); database.ts Member type includes status field; Phase 3 deactivation feature establishes status semantics.

### Pitfall 5: Storing Service Role Key in Browser or Client Components

**What goes wrong:** You import `createServiceRoleClient()` in a Client Component to simplify code, then try to call it. But the service role key is not available on the client side (it should never be exposed to the browser).

**Why it happens:** The service.ts module exports a function, so it looks like you can just import it anywhere. But it requires a server-only environment variable.

**How to avoid:** Only import `createServiceRoleClient` in Route Handlers and cron jobs. Use `createServerClient` (anon key, which is public) in Server Components. Never expose service role key to the client.

**Warning signs:** "Missing env var: SUPABASE_SERVICE_ROLE_KEY" error at runtime when accessing the check-in page (not the API route).

**Source:** service.ts comments, Phase 1 RLS decisions, Phase 2 auth patterns.

## Code Examples

Verified patterns from official sources and existing codebase:

### CPF Input with Mask (Client Component)

```typescript
// Handles formatting on input, supports backspace/paste
const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let value = e.target.value.replace(/\D/g, '')
  if (value.length > 11) value = value.slice(0, 11)

  let formatted = ''
  if (value.length <= 3) {
    formatted = value
  } else if (value.length <= 6) {
    formatted = `${value.slice(0, 3)}.${value.slice(3)}`
  } else if (value.length <= 9) {
    formatted = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`
  } else {
    formatted = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`
  }
  setCpf(formatted)
}
```

Source: Phase 3 member form implementation (adapted for check-in context).

### Duplicate Detection with 4-Hour Window

```typescript
const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
const { data: recentCheckin } = await supabase
  .from('checkins')
  .select('checked_in_at')
  .eq('org_id', org.id)
  .eq('member_id', member.id)
  .gte('checked_in_at', fourHoursAgo)
  .order('checked_in_at', { ascending: false })
  .limit(1)
  .single()
```

Source: Supabase documentation (PostgreSQL `>=` operator via `.gte()`), established patterns from codebase (Phase 3 member queries).

### Extracting Member First Name from Full Name

```typescript
const memberName = member.name.split(' ')[0]  // "João Silva" → "João"
```

Source: CONTEXT.md D-15 (display member's first name in success message).

### Formatting Timestamp for pt-BR Display

```typescript
const date = new Date(success.timestamp)
const formatted = date.toLocaleString('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).replace(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/, '$1/$2/$3 às $4h$5')
// "31/03/2026 às 14h30"
```

Source: date-fns + Intl.DateTimeFormat (via toLocaleString), CONTEXT.md D-15 (desired format).

### Route Handler with Service Role + Audit Trail

```typescript
const ipAddress = req.headers.get('x-forwarded-for') || req.socket?.remoteAddress || null
const userAgent = req.headers.get('user-agent') || null
const checkedInAt = new Date().toISOString()

await supabase.from('checkins').insert({
  org_id: org.id,
  member_id: member.id,
  checked_in_at: checkedInAt,
  ip_address: ipAddress,
  user_agent: userAgent,
})
```

Source: CONTEXT.md D-16, D-17 (audit trail requirements); Next.js Route Handler documentation (header access).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-member QR codes | Gym-level QR + CPF lookup | Phase 3 pivot (2026-03-27) | Simplified real-world UX; one QR per gym instead of per-member |
| Manual timestamp arithmetic | Date().toISOString() + SQL operators | Phase 4 (current) | Prevents timezone bugs; clearer intent |
| Client-side duplicate detection | Server-side 4h window query | Phase 4 (current) | Prevents race conditions; single source of truth |
| Inline error messages per case | Generic "CPF não encontrado" | Phase 4 decision | Prevents membership enumeration attack |

**Deprecated/outdated:**
- Per-member QR columns (`members.qr_code_hash`, `members.qr_code_generated_at`) — dropped in migration 004, replaced by org-level `organizations.qr_code_hash`

## Open Questions

1. **CPF masking library choice**
   - What we know: Phase 3 member form uses plain text input with max-length; CONTEXT.md D-07 allows mask implementation
   - What's unclear: Whether a lightweight lib like `react-input-mask` or `maska` should be introduced vs. simple JS handler
   - Recommendation: Use 10-line JS handler (proven to work with input event listeners); no new dependency if it fits Phase 3 pattern

2. **Loading state UX during API call**
   - What we know: CONTEXT.md D-53 lists loading/pending state as Claude's discretion
   - What's unclear: Disable button + spinner, or disable button + text change, or something else
   - Recommendation: Disable button + text change (`"Processando..."`) — consistent with Phase 3 member form pattern (useFormStatus hook)

3. **Timezone handling at scale**
   - What we know: Phase 3 uses `last_checked_in` as ISO UTC string; Phase 4 must query within 4-hour window
   - What's unclear: If Vercel free tier or Supabase free tier has timezone-related limits
   - Recommendation: Store all timestamps as ISO UTC strings in the database; format for display on the server (Route Handler) using date-fns; no known Vercel/Supabase limitations

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, Route Handlers | ✓ | v24.14.0 | — |
| npm | Package manager | ✓ | 11.9.0 | — |
| TypeScript | Type checking, compilation | ✓ | 5 | — |
| Supabase (service role key) | Route Handler `/api/checkin` | ✓ | 2.100.0 | Already configured in Phase 1 |
| Tailwind CSS | Styling emerald-600 layout | ✓ | 3.3.0 | — |
| date-fns | Timestamp formatting | ✓ | 4.1.0 | Manual `toLocaleString()` (less clean but works) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** date-fns (fallback: native `toLocaleString()`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 (node environment) |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- tests/checkin/` (when created) |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHKN-01 | Valid QR + valid CPF → form submits, success screen shown | integration | `npm test -- tests/checkin/form-submission.test.ts` | ❌ Wave 0 |
| CHKN-02 | Success response includes member first name + formatted timestamp | unit | `npm test -- tests/checkin/timestamp-format.test.ts` | ❌ Wave 0 |
| CHKN-03 | Duplicate within 4h returns DUPLICATE code, no row inserted | integration | `npm test -- tests/checkin/duplicate-detection.test.ts` | ❌ Wave 0 |
| CHKN-04 | Checkin row includes ip_address + user_agent from headers | unit | `npm test -- tests/checkin/audit-trail.test.ts` | ❌ Wave 0 |
| CHKN-05 | members.last_checked_in updated to checked_in_at value | integration | `npm test -- tests/checkin/last-checked-in.test.ts` | ❌ Wave 0 |
| CHKN-06 | Invalid hash → Server Component error card; deactivated member → Route Handler generic error | integration | `npm test -- tests/checkin/error-handling.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- tests/checkin/` (targeted suite)
- **Per wave merge:** `npm run test:run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/checkin/form-submission.test.ts` — covers CHKN-01, CHKN-02 (success flow)
- [ ] `tests/checkin/duplicate-detection.test.ts` — covers CHKN-03 (4h window logic, no duplicate row)
- [ ] `tests/checkin/audit-trail.test.ts` — covers CHKN-04 (ip_address, user_agent captured)
- [ ] `tests/checkin/last-checked-in.test.ts` — covers CHKN-05 (member.last_checked_in updated)
- [ ] `tests/checkin/error-handling.test.ts` — covers CHKN-06 (invalid hash, deactivated member)
- [ ] `tests/checkin/cpf-masking.test.ts` — covers input handling (backspace, paste, formatting)
- [ ] `tests/conftest.ts` (if needed) — shared fixtures for auth, org, member seeding

**Test infrastructure readiness:** vitest + Supabase clients configured in Phase 1; existing tests use server client pattern; checkin tests can follow same patterns.

## Sources

### Primary (HIGH confidence)
- **Context7 / Project codebase:**
  - `src/lib/supabase/service.ts` — Service role client pattern and warnings
  - `src/lib/utils/cpf.ts` — Existing CPF utilities (maskCpf, stripCpf, formatCpf)
  - `src/lib/actions/members.ts` — Zod schema, error handling, server action pattern
  - `src/app/(dashboard)/members/new/page.tsx` — Form validation, useFormState pattern
  - `src/app/(dashboard)/qr-code/QRCodeDisplay.tsx` — Client component split pattern
  - `src/middleware.ts` — Route protection, public path configuration
  - `.planning/phases/03-member-management/03-CONTEXT.md` — CPF model, gym QR decision
  - `supabase/migrations/004-gym-qr-cpf.sql` — Schema, indexes, constraints
  - `src/lib/types/database.ts` — Checkin, Member, Organization row types
  - `package.json` — Verified versions: Next.js 14.2.35, Supabase 2.100.0, Zod 4.3.6, date-fns 4.1.0

- **Official docs (verified current):**
  - Next.js 14 App Router Route Handlers — header access, service role patterns
  - Supabase JavaScript client v2.100+ — query patterns, RLS bypass with service role
  - date-fns 4.1.0 — `toLocaleString()` for pt-BR formatting

### Secondary (MEDIUM confidence)
- Phase 3 implementation patterns (member form, CPF masking, error handling)
- Phase 1 decisions (RLS, service role, indexes)

### Tertiary (NO external sources needed)
- Timezone math in JavaScript — well-established pattern documented in CONTEXT.md

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, versions verified in package.json
- Architecture: HIGH — follows established patterns from Phase 3 (Server/Client split, Route Handlers, Zod validation)
- Pitfalls: HIGH — all grounded in codebase (timezone, status checks, header access)
- Test map: MEDIUM — test framework configured (vitest), but specific checkin test cases are new

**Research date:** 2026-03-31
**Valid until:** 2026-04-07 (fast-moving web; Route Handler patterns stable; Supabase API stable)

**Key research findings:**
1. All required libraries already present; no new dependencies needed
2. Route Handler required (not Server Action) for header access — confirmed by Next.js architecture
3. CPF masking via simple JS handler sufficient (no new lib); consistent with Phase 3 approach
4. Timezone handling critical for 4h duplicate window — must use UTC ISO strings throughout
5. Generic error messages prevent member enumeration attack — explicit decision in CONTEXT.md
6. Middleware public-paths list must be updated explicitly (D-01)
7. Service role client comment must be updated to include `/api/checkin` (D-11)
