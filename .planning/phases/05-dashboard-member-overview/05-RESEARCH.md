# Phase 5: Dashboard — Member Overview - Research

**Researched:** 2026-04-06
**Domain:** Next.js Server Components + Supabase pagination + date calculation utilities
**Confidence:** HIGH

## Summary

Phase 5 enhances the existing `/dashboard/members` page with three risk-level counters and changes the member list table to sort by days-since-last-checkin rather than just displaying status. The member detail page `/dashboard/members/[id]` will replace its check-in history placeholder with a real paginated table showing audit trail data (Data, Horário, IP). All data is fetched server-side using Server Components (no `useEffect`) for fast first load.

The phase leans heavily on established patterns from Phases 3 and 4: the existing member list query infrastructure, the `getDaysAgo()` utility for days calculation, and the Supabase Server Component client factory. The primary technical challenge is implementing server-side pagination via URL search params (`?page=N`) while respecting the free tier row limit constraints.

**Primary recommendation:** Use the existing server-side member fetch, add counter calculation in the component, modify the table columns from "Último check-in" + "Status" to "Dias sem aparecer" + "Nível de risco", and implement check-in history pagination with plain `<Link>` anchors (no JavaScript needed).

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Enhance `/dashboard/members` in-place — no new routes created
- **D-02:** No new routes created; member overview delivered at existing `/dashboard/members`
- **D-03:** Replace columns: Nome | Email | Dias sem aparecer | Nível de risco
- **D-04:** Reuse `getDaysAgo()` utility for days calculation — do NOT move to DB query
- **D-05:** Sorting: `ORDER BY last_checked_in ASC NULLS FIRST` (existing pattern, nullsFirst: true)
- **D-06:** Three counters: Ativos (≤4 days), Em risco (4–7 days), Inativos (>7 days)
- **D-07:** Counter thresholds: Active = `days <= 4`, At-risk = `days > 4 && days <= 7`, Inactive = `days > 7`; never-checked = Inactive
- **D-08:** Counters calculated in Server Component from same query as member list — no extra DB call
- **D-09:** Server-side URL param pagination (`?page=2`), no Client Component wrapper needed
- **D-10:** Page reads `searchParams.page`, fetches `range((page-1)*50, page*50-1)` with `{ count: 'exact' }`
- **D-11:** Pagination controls are `<Link>` anchors, no JS required
- **D-12:** Check-in history replaces Phase 3 placeholder; preserve member info grid and actions
- **D-13:** History columns: Data (dd/MM/yyyy), Horário (HH:mm), IP — `user_agent` excluded

### Claude's Discretion
- Whether to add Suspense/skeleton for check-in history (not strictly needed per Server Component)
- Exact Tailwind classes for counter badge styling (follow color system in UI-SPEC)
- Whether to show "hoje" vs "0d" for same-day check-in (reuse `formatLastCheckin` — already returns "hoje")

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Dashboard lists all active members sorted by days since last check-in, longest-absent first | Server Component fetches with `ORDER BY last_checked_in ASC NULLS FIRST`; `getDaysAgo()` calculates days for display |
| DASH-02 | Dashboard shows three counters: Ativos (≤4d), Em risco (4-7d), Inativos (>7d) | Counter calculation done in component from member list query; risk thresholds applied post-fetch |
| DASH-03 | Member detail page shows paginated check-in history (max 50 per page) | Server Component reads `searchParams.page`, uses Supabase `.range()` for pagination, `count: 'exact'` for total |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2.35 | App Router with Server Components | Already in use (Phases 2-4); App Router required for `searchParams` prop in page.tsx |
| Supabase Auth Helpers | 0.15.0 | Server-side client factory | Already established; `createServerClient()` used in all dashboard pages |
| date-fns | 4.1.0 | Date math (`differenceInDays`, ISO parsing) | Already in use; `getDaysAgo()` utility already implemented |
| Tailwind CSS | 3.3.0 | Styling (no component library) | Established pattern across all phases; no shadcn initialized |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase JS Client | 2.100.0 | Paginated RLS-protected queries with `count: 'exact'` | For check-in history fetch with page range; auth helpers wrap this |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side pagination via URL params | Client-side pagination (fetch all, slice in JS) | Client-side requires large initial query; risk free tier overrun (Pitfall 5). URL params preferred for bookmarkability + free tier safety |
| `getDaysAgo()` JS utility | DB query `NOW() - last_checked_in` | D-04 locks this: reuse JS utility for consistency. DB approach would require date math in SQL for 50+ checkins query. |
| Plain Tailwind badge | shadcn Badge or other component | No component library in project (UI-SPEC). Plain Tailwind maintains consistency |

**Installation:** No new packages — all dependencies already in package.json.

**Version verification:**
- `next@14.2.35` (installed, confirmed in package.json)
- `date-fns@4.1.0` (installed, confirmed in package.json)
- `@supabase/auth-helpers-nextjs@0.15.0` (installed, confirmed in package.json)
- `tailwindcss@3.3.0` (installed, confirmed in package.json)

## Architecture Patterns

### Recommended Project Structure

No new directories required. Modifications in-place:

```
src/
├── app/(dashboard)/members/
│   ├── page.tsx              # Existing list page — ADD counters, modify columns
│   ├── [id]/
│   │   └── page.tsx          # Existing detail page — REPLACE history placeholder
│   ├── [id]/DeactivateButton.tsx    # Existing (no changes)
│   └── [id]/ReactivateButton.tsx    # Existing (no changes)
└── lib/
    ├── utils/members.ts      # Existing — getDaysAgo() + formatLastCheckin (already present, no changes)
    └── supabase/server.ts    # Existing (no changes)
```

### Pattern 1: Server Component with URL-Param Pagination

**What:** Page receives `searchParams: { page?: string }` prop. Server Component reads the param, calculates the DB range, fetches with Supabase `.range()`, and renders HTML. Navigation links update the URL param without JavaScript.

**When to use:** Dashboard pages with large paginated datasets (e.g., check-in history). Safe for free tier because page size is capped at 50 records.

**Example:**
```typescript
// src/app/(dashboard)/members/[id]/page.tsx
interface Props {
  params: { id: string }
  searchParams: { page?: string }  // <-- Add this
}

export default async function MemberProfilePage({ params, searchParams }: Props) {
  const supabase = createServerClient()
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const pageSize = 50
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  // Fetch with .range() and count: 'exact'
  const { data: checkins, count } = await supabase
    .from('checkins')
    .select('id, checked_in_at, ip_address', { count: 'exact' })
    .eq('member_id', params.id)
    .order('checked_in_at', { ascending: false })
    .range(start, end)

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  // Render with <Link href={`?page=${page + 1}`}>
}
```

**Source:** [Next.js App Router searchParams](https://nextjs.org/docs/app/api-reference/file-conventions/page) — standard pattern for server-side pagination

### Pattern 2: Risk Level Calculation in Component

**What:** Member list is fetched from Supabase (already sorted, RLS-filtered). The Server Component applies `getDaysAgo()` to each member to calculate days-since-checkin, then categorizes into risk levels (Active, At-risk, Inactive). Counters are derived by summing each category.

**When to use:** When calculation is simple (one function call per row) and already-available utilities exist. Avoids database query complexity.

**Example:**
```typescript
// Within src/app/(dashboard)/members/page.tsx
const memberList = members ?? []

// Calculate risk level for each member
const membersWithRisk = memberList.map(member => {
  const days = getDaysAgo(member.last_checked_in)
  let riskLevel = 'inactive'  // default for never-checked-in
  if (days !== null) {
    if (days <= 4) riskLevel = 'active'
    else if (days <= 7) riskLevel = 'at-risk'
  }
  return { ...member, days, riskLevel }
})

// Calculate counters
const counters = {
  active: membersWithRisk.filter(m => m.riskLevel === 'active').length,
  atRisk: membersWithRisk.filter(m => m.riskLevel === 'at-risk').length,
  inactive: membersWithRisk.filter(m => m.riskLevel === 'inactive').length,
}

// Render counters + table with membersWithRisk
```

**Source:** Pattern used in Phase 3 member list with `formatLastCheckin()`; adapted for threshold logic

### Anti-Patterns to Avoid
- **useEffect for initial data fetch (Anti-Pattern 1):** Page must be Server Component. Avoid `'use client'` at page level. Pagination controls can be plain `<Link>` — no Client Component needed.
- **Unbounded checkin history query (Pitfall 5):** Always use `.range(start, end)` with `{ count: 'exact' }`. Never `SELECT *` checkins without limit.
- **Fetching check-in history twice:** Only fetch on initial page load. Pagination is just URL navigation + new Server Component render.
- **Calculating risk level in SQL:** D-04 overrides the DB approach. Use JS utility for consistency with Phase 3.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic for "days ago" | Custom date diff logic | `date-fns differenceInDays()` + `getDaysAgo()` utility | Already in use (Phase 3, Phase 4); handles edge cases (midnight boundary) |
| Paginated query with total count | Manual offset/limit + separate COUNT query | Supabase `.range()` with `{ count: 'exact' }` | Single query, accurate count, RLS-safe |
| URL parameter parsing | Manual string parsing + parseInt | Next.js `searchParams` prop (automatic) | Type-safe, handles encoding, no custom parsing |
| Status/risk badge styling | Custom CSS class logic | Tailwind conditional classes (`bg-emerald-100` for active, `bg-amber-100` for at-risk, etc.) | Consistent with Phase 3 status badges; no CSS modules needed |

**Key insight:** Pagination is expensive to hand-roll correctly (off-by-one errors, race conditions between count and fetch, timezone issues). Supabase `.range()` handles all edge cases. URL params + Server Component renders are the simplest, most stateless approach — far cheaper than Client Component state management or `useEffect` re-fetches.

## Runtime State Inventory

**Trigger:** This phase involves no rename, refactor, or migration. All changes are additive (new counters, new columns, new history table) or replacement-in-place (history placeholder → real table).

**Analysis:** No stored state needs inventory updates. Data structures (members, checkins tables) remain unchanged. No OS-registered tasks, no secrets, no build artifacts with embedded phase references.

**Conclusion:** SKIPPED — No runtime state inventory required.

## Common Pitfalls

### Pitfall 1: useEffect in Server Component
**What goes wrong:** Developer adds `'use client'` to page.tsx for `useEffect` to fetch check-in history. Page becomes interactive, loses Server Component benefits (fast first load, no JS dependency, RLS at request time).

**Why it happens:** Developer assumes "data fetching" requires Client Component. Next.js 14 App Router allows async Server Components — intuitive for developers from older Next.js patterns.

**How to avoid:** Keep `page.tsx` as a Server Component. Add `searchParams: { page?: string }` prop. For pagination, use `<Link>` anchors pointing to `?page=N`. No Client Component wrapper needed.

**Warning signs:** If you write `'use client'` at the top of `members/[id]/page.tsx` or `members/page.tsx`, stop. The page should be a Server Component.

### Pitfall 2: Unbounded Check-In Query
**What goes wrong:** Query fetches all check-ins for a member without `.range()`. On free tier (~500MB), a member with 1000+ checkins over 2 years can cause the query to exceed free tier bandwidth or timeout (60s function limit on Vercel).

**Why it happens:** Developer reasons "we want all the history for client-side pagination." Client-side pagination requires the full dataset upfront.

**How to avoid:** Use server-side pagination (D-09). Always `.range(start, end)` on check-in queries. Max 50 per page means max 500 bytes per row = ~25KB per page (well under limits).

**Warning signs:** Check-in query has no `.range()` method call. Or, pagination count calculation uses `data.length` instead of `count` from Supabase.

### Pitfall 3: Risk Level Calculation in SQL
**What goes wrong:** Developer moves `getDaysAgo()` logic into a Postgres function. Code is split between TypeScript and SQL. Phase 3 reference says "nullsFirst: true" — DB approach can break that pattern.

**Why it happens:** Developer sees SQL query already sorting by `last_checked_in` and thinks "calculation belongs in DB." D-04 explicitly locks this: reuse JS utility.

**How to avoid:** Keep date calculation in `getDaysAgo()`. Fetch members, then call `getDaysAgo()` on each row in the component. It's O(n) but n ≤ 100-200 members — fast enough. Consistency with Phase 3 outweighs tiny SQL optimization.

**Warning signs:** If you add a Supabase SQL function or move `getDaysAgo()` to a stored procedure, you're wrong. The utility lives in `src/lib/utils/members.ts` and is already tested (Phase 3, Phase 4).

### Pitfall 4: Pagination State in Component
**What goes wrong:** Developer stores `currentPage` state in a Client Component wrapper around the Server Component. Pagination updates state, then renders Server Component with new page. Adds complexity, loses bookmarkability (`?page=2` not visible in URL), fails if JavaScript is disabled.

**Why it happens:** Familiar React pattern from SPA days. Seems natural to lift state up.

**How to avoid:** Use URL search params (`?page=2`). Server Component reads it directly from `searchParams` prop. Navigation is plain `<Link>` anchors. No Client Component wrapper, no state, no JS dependency.

**Warning signs:** If you have a wrapper Client Component around page.tsx, or if you're importing `useState` in a file that handles pagination, refactor it out. Server Component + URL params is simpler.

### Pitfall 5: Counter Calculation from Separate Query
**What goes wrong:** Developer makes two queries: one for members, one specifically to count each risk category (e.g., SELECT COUNT(*) WHERE days > 7). Race condition between two queries — a member's `last_checked_in` updates between query 1 and 2. Counters don't add up. Or, two database calls cost extra bandwidth.

**Why it happens:** Developer over-engineers. "Counters need a dedicated query for accuracy."

**How to avoid:** D-08 locks this: fetch members once, calculate counters in the component. `membersWithRisk.filter(m => m.riskLevel === 'active').length` is instant. Single source of truth.

**Warning signs:** Your page.tsx has multiple `await supabase.from('members')...` calls, or separate calls to `checkins` to count at-risk members. Consolidate into one fetch.

## Code Examples

### Dashboard Member List Page with Counters

```typescript
// src/app/(dashboard)/members/page.tsx
// Server Component — no 'use client'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { getDaysAgo, formatLastCheckin } from '@/lib/utils/members'

export default async function MembersPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const org_id = user?.app_metadata?.org_id as string | undefined

  // Single query — fetch all active members sorted by last_checked_in
  const { data: members } = org_id
    ? await supabase
        .from('members')
        .select('id, name, email, last_checked_in, status')
        .eq('org_id', org_id)
        .eq('status', 'active')
        .order('last_checked_in', { ascending: true, nullsFirst: true })
    : { data: [] }

  const memberList = members ?? []

  // Enrich members with days-ago and risk level (in component, not DB query)
  type MemberWithRisk = typeof memberList[0] & {
    days: number | null
    riskLevel: 'active' | 'at-risk' | 'inactive'
  }

  const membersWithRisk: MemberWithRisk[] = memberList.map(member => {
    const days = getDaysAgo(member.last_checked_in)
    let riskLevel: 'active' | 'at-risk' | 'inactive' = 'inactive'
    if (days !== null && days <= 4) {
      riskLevel = 'active'
    } else if (days !== null && days <= 7) {
      riskLevel = 'at-risk'
    }
    return { ...member, days, riskLevel }
  })

  // Calculate counters from enriched data (no extra query)
  const counters = {
    active: membersWithRisk.filter(m => m.riskLevel === 'active').length,
    atRisk: membersWithRisk.filter(m => m.riskLevel === 'at-risk').length,
    inactive: membersWithRisk.filter(m => m.riskLevel === 'inactive').length,
  }

  // Helper to render risk badge
  const riskBadgeColor = (riskLevel: 'active' | 'at-risk' | 'inactive') => {
    if (riskLevel === 'active') return 'bg-emerald-100 text-emerald-700'
    if (riskLevel === 'at-risk') return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="bg-gray-50 min-h-full p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Membros</h1>
        <Link
          href="/dashboard/members/new"
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + Novo Membro
        </Link>
      </div>

      {/* Counter badges */}
      {memberList.length > 0 && (
        <div className="flex gap-4 mb-8">
          {/* Ativos */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-2xl font-semibold text-gray-900">{counters.active}</div>
            <div className="text-sm font-medium text-gray-600">Ativos</div>
            <div className="text-xs text-gray-500">até 4 dias</div>
          </div>

          {/* Em risco */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-2xl font-semibold text-gray-900">{counters.atRisk}</div>
            <div className="text-sm font-medium text-gray-600">Em risco</div>
            <div className="text-xs text-gray-500">4-7 dias</div>
          </div>

          {/* Inativos */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-2xl font-semibold text-gray-900">{counters.inactive}</div>
            <div className="text-sm font-medium text-gray-600">Inativos</div>
            <div className="text-xs text-gray-500">7+ dias</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {memberList.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-900 font-semibold text-lg mb-2">Nenhum membro cadastrado</p>
          <p className="text-gray-600 text-sm">
            Comece criando o primeiro membro da academia. Clique em &ldquo;+ Novo Membro&rdquo; para começar.
          </p>
        </div>
      ) : (
        /* Member table with new columns */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Dias sem aparecer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Nível de risco</th>
              </tr>
            </thead>
            <tbody>
              {membersWithRisk.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <Link
                      href={`/dashboard/members/${member.id}`}
                      className="font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      {member.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatLastCheckin(member.last_checked_in)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      riskBadgeColor(member.riskLevel)
                    }`}>
                      {member.riskLevel === 'active' ? 'Ativo' : member.riskLevel === 'at-risk' ? 'Em risco' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**Source:** Adapted from existing `members/page.tsx` (lines 5-89) + Phase 3 `members.ts` utilities + UI-SPEC layout

### Member Detail Page with Paginated Check-In History

```typescript
// src/app/(dashboard)/members/[id]/page.tsx
// Add searchParams prop to handle pagination
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { maskCpf } from '@/lib/utils/cpf'
import { DeactivateButton } from './DeactivateButton'
import { ReactivateButton } from './ReactivateButton'

interface Props {
  params: { id: string }
  searchParams: { page?: string }  // <-- Add this
}

export default async function MemberProfilePage({ params, searchParams }: Props) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const org_id = user?.app_metadata?.org_id as string | undefined

  if (!org_id) notFound()

  // Fetch member (unchanged)
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', params.id)
    .eq('org_id', org_id)
    .single()

  if (!member) notFound()

  // Pagination
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const pageSize = 50
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  // Fetch check-in history with pagination
  const { data: checkins, count } = await supabase
    .from('checkins')
    .select('id, checked_in_at, ip_address', { count: 'exact' })
    .eq('member_id', member.id)
    .order('checked_in_at', { ascending: false })
    .range(start, end)

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  // Format dates for display
  const joinDate = new Date(member.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const lastCheckin = member.last_checked_in
    ? new Date(member.last_checked_in).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="bg-gray-50 min-h-full p-8">
      {/* Page header (unchanged) */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/members" className="text-sm text-gray-500 hover:text-gray-900">
          Membros
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900">{member.name}</span>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">{member.name}</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl">

        {/* Basic Info (unchanged) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Nome</p>
            <p className="text-sm text-gray-900 mt-1">{member.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
            <p className="text-sm text-gray-900 mt-1">{member.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">CPF</p>
            <p className="text-sm text-gray-900 mt-1">{maskCpf(member.cpf)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Telefone</p>
            <p className="text-sm text-gray-900 mt-1">{member.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Data de cadastro</p>
            <p className="text-sm text-gray-900 mt-1">{joinDate}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Último check-in</p>
            <p className="text-sm text-gray-900 mt-1">{lastCheckin ?? 'Nunca'}</p>
          </div>
        </div>

        {/* Status & Actions (unchanged) */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
              member.status === 'active'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {member.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>

            <Link
              href={`/dashboard/members/${member.id}/edit`}
              className="bg-emerald-600 text-white px-4 h-10 rounded-lg text-sm font-medium hover:bg-emerald-700 inline-flex items-center"
            >
              Editar
            </Link>

            {member.status === 'active' ? (
              <DeactivateButton memberId={member.id} />
            ) : (
              <ReactivateButton memberId={member.id} />
            )}
          </div>
        </div>

        {/* Check-In History (replaced) */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Histórico de check-ins</h2>

          {checkins && checkins.length > 0 ? (
            <>
              {/* History table */}
              <div className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Data</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">Horário</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-900">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkins.map((checkin) => {
                      const date = new Date(checkin.checked_in_at)
                      const dateStr = date.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                      const timeStr = date.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      return (
                        <tr key={checkin.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{dateStr}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{timeStr}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">
                            {checkin.ip_address ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Página {page} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`?page=${page - 1}`}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
                      >
                        Página anterior
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`?page=${page + 1}`}
                        className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                      >
                        Próxima página
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Nenhum check-in registrado</p>
          )}
        </div>

      </div>
    </div>
  )
}
```

**Source:** Adapted from existing `members/[id]/page.tsx` (lines 12-124) + new pagination logic matching D-09/D-10

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Days since last checkin shown as "Último check-in: dd/MM/yyyy" | Days shown as numeric ("2d") + risk badge (Ativo/Em risco/Inativo) | Phase 5 (D-03) | Member risk is now obvious at a glance; sorting by days makes the at-risk members jump to top |
| Check-in history placeholder (Phase 3) | Real paginated history table (Phase 5) | Phase 5 (D-12) | Admin can audit member activity; IP address provides fraud detection data for Phase 9 |
| Member list columns: Nome, Email, Último check-in, Status | New columns: Nome, Email, Dias sem aparecer, Nível de risco | Phase 5 (D-03) | Aligns table with inactivity risk workflow (core value: "know which members are leaving") |
| Single risk metric (active/inactive only) | Three-tier risk model (active ≤4d / at-risk 4-7d / inactive >7d) | Phase 5 (D-06) | Supports escalation: active members ignored, at-risk members need attention before Phase 6 "contacted" action, inactive members prioritized for Phase 7 churn alerts |

**Deprecated/outdated:**
- Check-in history placeholder: Replaced with real table per D-12

## Open Questions

1. **Risk badge colors for "at-risk"?**
   - What we know: UI-SPEC line 99 says "At-risk (new): TBD by executor (recommend `bg-amber-100 text-amber-700`)"
   - What's unclear: Whether to use amber (yellow-orange) or a different Tailwind color
   - Recommendation: Use `bg-amber-100 text-amber-700` (Tailwind standard amber). Consistent with "warning" pattern in design systems. Alternative: orange or yellow if amber feels too warm.

2. **IP address display format?**
   - What we know: D-13 includes IP in history table; raw `ip_address` field from checkins table
   - What's unclear: IPv6 addresses can be long (39 chars); does layout truncate or wrap?
   - Recommendation: Use `font-mono text-xs` (line 300+ in code example). Let CSS `overflow-hidden` and `text-ellipsis` handle long IPs on narrow screens. No phase 5 mobile optimization needed (primary target: desktop admin).

3. **Counter badges: cards or inline?**
   - What we know: UI-SPEC line 145-154 says "horizontal flex of three cards"
   - What's unclear: Card padding, border style, shadow
   - Recommendation: Follow existing card pattern from member info section: `bg-white border border-gray-200 rounded-lg p-6`. No shadow (matches existing design system).

## Environment Availability

**Step 2.6: SKIPPED** (no external dependencies identified)

This phase has no external tool, service, runtime, or CLI dependencies beyond the project's own code. All data is fetched from Supabase (already live in Phase 4), calculations use `date-fns` (already installed), and rendering is pure Next.js Server Components. No Docker, no database tools, no asset generators required for Phase 5.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 + node environment |
| Config file | `.planning/phases/05-dashboard-member-overview/05-VALIDATION.md` (TBD by planner) |
| Quick run command | `npm run test:run -- tests/phase5/` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Members sorted by days-since-checkin (longest absent first, never-checked-in first) | unit + integration | `npm run test:run -- tests/phase5/member-list-sorting.test.ts` | ❌ Wave 0 |
| DASH-02 | Risk counters calculated correctly (active ≤4d, at-risk 4-7d, inactive >7d, never→inactive) | unit | `npm run test:run -- tests/phase5/risk-counters.test.ts` | ❌ Wave 0 |
| DASH-03 | Check-in history paginated at 50/page; page param parsed correctly; total pages calculated with `count: 'exact'` | unit + integration | `npm run test:run -- tests/phase5/pagination.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:run -- tests/phase5/` (test one task's requirements)
- **Per wave merge:** `npm run test:run` (full suite including phases 1-4)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase5/member-list-sorting.test.ts` — covers DASH-01 (sort order, nullsFirst behavior, getDaysAgo output)
- [ ] `tests/phase5/risk-counters.test.ts` — covers DASH-02 (threshold logic: ≤4, 4-7, >7, null→inactive)
- [ ] `tests/phase5/pagination.test.ts` — covers DASH-03 (range calculation, count: exact, totalPages math)
- [ ] `tests/phase5/fixtures/mock-members.ts` — Shared mock data: members with varied last_checked_in dates
- [ ] `tests/phase5/fixtures/mock-checkins.ts` — Shared mock data: 150+ check-in records for pagination test
- [ ] Framework install: Already present (`npm run test` works as of Phase 4)

## Sources

### Primary (HIGH confidence)
- **Next.js 14 App Router** ([searchParams prop](https://nextjs.org/docs/app/api-reference/file-conventions/page)) — server-side pagination pattern
- **Supabase JS Client v2.100.0** (installed, used in phases 1-4) — `.range()` method and `count: 'exact'` option
- **date-fns 4.1.0** (installed, `src/lib/utils/members.ts`) — `getDaysAgo()` and `formatLastCheckin()` utilities
- **Phase 3 member list** (`src/app/(dashboard)/members/page.tsx` lines 5-89) — existing table structure, status badge pattern
- **Phase 4 check-in schema** (`src/lib/types/database.ts` line 33-41) — Checkin type with checked_in_at, ip_address fields
- **05-CONTEXT.md** (D-01 through D-13) — Locked decisions on sorting, columns, counters, pagination
- **05-UI-SPEC.md** — Layout contract, copy, colors, badge styling

### Secondary (MEDIUM confidence)
- **05-UI-SPEC.md line 99** (at-risk badge color recommendation: `bg-amber-100 text-amber-700`) — verified against standard Tailwind palette

## Metadata

**Confidence breakdown:**
- **Standard stack: HIGH** — All dependencies already installed and used in phases 1-4. Versions verified in package.json.
- **Architecture: HIGH** — Locked decisions in CONTEXT.md; patterns from Phase 3 and 4 exist in codebase.
- **Pitfalls: HIGH** — Common pagination and date calculation pitfalls documented from React/Next.js ecosystem; specific mitigations provided in CONTEXT.md and code examples.

**Research date:** 2026-04-06
**Valid until:** 2026-04-20 (14 days; stack is stable, no new dependencies or patterns anticipated)

---

*Research completed: 2026-04-06*
*Phase 5: Dashboard — Member Overview*
*Researched by: Claude Sonnet 4.6*
