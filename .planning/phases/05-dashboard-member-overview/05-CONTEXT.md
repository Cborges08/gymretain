# Phase 5: Dashboard — Member Overview - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance `/dashboard/members` with inactivity-sorted member list, three risk-level counters (Ativos/Em risco/Inativos), and paginated check-in history on the member detail page.

Not in this phase: mark-as-contacted (Phase 6), churn detection cron (Phase 7), email alerts (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Enhancement Target
- **D-01:** Phase 5 enhances the **existing `/dashboard/members` page** — adds counters above the table and changes columns. `/dashboard` (welcome placeholder) stays as-is.
- **D-02:** No new routes created. The member overview is delivered at `/dashboard/members`, consistent with existing nav and breadcrumbs.

### Member List Columns
- **D-03:** Replace current columns (Último check-in, Status) with **Dias sem aparecer** (numeric days) and **Nível de risco** (risk badge). New columns: Nome | Email | Dias sem aparecer | Nível de risco.
- **D-04:** Reuse existing `getDaysAgo()` utility from `src/lib/utils/members.ts` for days calculation — do NOT move calculation to DB query. Consistent with established pattern.
- **D-05:** Sorting: `ORDER BY last_checked_in ASC NULLS FIRST` (already established pattern from Phase 3 — `nullsFirst: true`). Members who never checked in appear first.

### Risk Counters
- **D-06:** Three counters displayed horizontally above the member table, below the page title: **Ativos** (≤4 days), **Em risco** (4–7 days), **Inativos** (>7 days).
- **D-07:** Counter thresholds: Active = `days <= 4`, At-risk = `days > 4 && days <= 7`, Inactive = `days > 7`. Members who never checked in (`days === null`) count as Inactive.
- **D-08:** Counters are calculated in the Server Component from the same query that fetches the member list — no extra DB query.

### Check-In History Pagination
- **D-09:** Pagination is **server-side via URL search params** — `?page=2` triggers Server Component re-fetch. No Client Component wrapper needed for pagination.
- **D-10:** `page.tsx` reads `searchParams.page` (default: 1), fetches `range((page-1)*50, page*50-1)` from Supabase with `{ count: 'exact' }`.
- **D-11:** Pagination controls are plain `<Link href="?page=N">` anchors — no JS required. Previous/Next buttons rendered as `<Link>` or `<a>`.

### Member Detail Page
- **D-12:** Check-in history replaces the Phase 3 placeholder section. The existing member info grid and action buttons are preserved unchanged.
- **D-13:** History table columns: **Data** (dd/MM/yyyy), **Horário** (HH:mm), **IP** (`ip_address` field). `user_agent` not displayed — too verbose for the table UI.

### Claude's Discretion
- Whether to add a loading skeleton/Suspense boundary for check-in history (the section loads with the page — skeleton not strictly needed given Server Component)
- Exact Tailwind classes for counter badge card styling (background, border, padding) — follow the color system in UI-SPEC
- Whether to show "hoje" vs "0d" for same-day check-in in the new Dias column (reuse `formatLastCheckin` which already returns "hoje")

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Foundation
- `.planning/PROJECT.md` — Vision, stack, constraints (free tier, pt-BR, single-tenant)
- `.planning/REQUIREMENTS.md` — DASH-01, DASH-02, DASH-03 (requirements this phase delivers)
- `.planning/ROADMAP.md §Phase 5` — Success criteria, UAT criteria, pitfall guards

### UI Design Contract
- `.planning/phases/05-dashboard-member-overview/05-UI-SPEC.md` — Full visual contract: layout, typography, colors, copy, component inventory, data contracts

### Prior Phase Context
- `.planning/phases/03-member-management/03-CONTEXT.md` — D-07/D-08/D-09: table layout, status badge patterns, `nullsFirst` ordering
- `.planning/phases/01-project-scaffold-database-foundation/01-CONTEXT.md` — DB schema, RLS policies

### Existing Code (read before implementing)
- `src/app/(dashboard)/members/page.tsx` — Current member list page (will be enhanced in-place)
- `src/app/(dashboard)/members/[id]/page.tsx` — Member detail page with check-in history placeholder
- `src/lib/utils/members.ts` — `getDaysAgo()` and `formatLastCheckin()` utilities (reuse, do not duplicate)
- `src/lib/supabase/server.ts` — Server-side Supabase client factory

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getDaysAgo(isoString)` in `src/lib/utils/members.ts` — returns `number | null`, handles null (never checked in)
- `formatLastCheckin(isoString)` — returns "hoje" / "Nd" / "—" display string
- Status badge pattern from Phase 3: `bg-emerald-100 text-emerald-700` (active), `bg-gray-100 text-gray-500` (inactive) — extend with amber for at-risk
- `createServerClient()` from `src/lib/supabase/server.ts` — used in both members pages already

### Established Patterns
- Server Component + `supabase.auth.getUser()` → `org_id` from `app_metadata` — already in `members/page.tsx`
- `ORDER BY last_checked_in ASC NULLS FIRST` — already in `members/page.tsx` query
- `notFound()` for missing/unauthorized records — established in `[id]/page.tsx`
- Plain Tailwind CSS (no shadcn) — no component library

### Integration Points
- `members/page.tsx` — Add counter calculation + render `DashboardCounters` above the table; change column headers and cell rendering
- `members/[id]/page.tsx` — Replace placeholder section with real check-in history; add `searchParams: { page?: string }` prop
- `src/lib/types/database.ts` — `Checkin` type already defined (used in Phase 4)

</code_context>

<specifics>
## Specific Ideas

- Counter badge layout from UI-SPEC: horizontal flex of three cards, each showing large number + label + duration note (e.g., "até 4 dias")
- History table shows Data + Horário + IP — `user_agent` excluded as too verbose
- Pagination links use `<Link href={`?page=${page}`}>` pattern — shareable, bookmarkable, no JS dependency

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-dashboard-member-overview*
*Context gathered: 2026-04-06*
