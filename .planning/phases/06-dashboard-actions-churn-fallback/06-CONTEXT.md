# Phase 6: Dashboard — Actions & Churn Fallback - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two interactive capabilities to `/dashboard/members`:
1. **"Marcar como Contatado"** — inline button per at-risk/inactive member; marks them as handled for 7 days
2. **"Verificar Churn Agora"** — manual trigger in page header that runs churn detection and refreshes the member list

Also: modify `/api/checkin/route.ts` to auto-clear alerts when a member checks in (success criteria #3).

Not in this phase: email sending (Phase 8), cron scheduling configuration (Phase 7). Phase 7 wraps the `detectChurn()` function built here in a cron — same code, different invocation.

</domain>

<decisions>
## Implementation Decisions

### "Marcar como Contatado" — Button Placement
- **D-01:** Button appears **inline in the member list table** as a 5th column ("Ação"). Only shown for `at_risk` and `inactive` members — `active` members show nothing in the Ação column.
- **D-02:** The new table column layout: Nome | Email | Dias sem aparecer | Nível de risco | Ação
- **D-03:** Consistent with DeactivateButton/ReactivateButton pattern — small Client Component wrapping a Server Action or `useFormState`. On success: `revalidatePath('/dashboard/members')` (soft refresh, no full page reload).

### "Marcar como Contatado" — Visual Feedback
- **D-04:** After marking, the **row stays in place**. The "Marcar Contatado" button becomes a **"Contatado" badge** in the Ação column. Risk counter values (Ativos / Em risco / Inativos) do NOT change — the member's days-absent doesn't change, only their handling state does.
- **D-05:** The badge shows when: `contact_marked_at IS NOT NULL AND contact_marked_at > (NOW() - 7 days) AND resolved_at IS NULL`. After 7 days with no check-in, the next cron run creates a new alert → the badge disappears.
- **D-06:** The "Contatado" badge uses a distinct neutral style: `bg-blue-100 text-blue-700` — different from the risk badges (emerald/amber/gray) so it's visually distinct.

### "Verificar Churn Agora" — Placement and Feedback
- **D-07:** Button lives in the **member list page header**, next to "Novo Membro". Secondary style (outlined, not emerald-filled) to differentiate from primary action.
- **D-08:** After clicking: Server Action runs `detectChurn()` + `revalidatePath('/dashboard/members')`. No inline result message — the **updated counters and list reflect the changes**. The browser shows its native loading indicator during the refresh.
- **D-09:** Button is a Client Component (`VerificarAgoraButton`) to support a pending/loading state while the Server Action runs (preventing double-clicks).

### Core `detectChurn()` Function
- **D-10:** Extracted as a reusable utility (e.g., `src/lib/utils/churn.ts`) callable from both Phase 6's manual trigger AND Phase 7's cron endpoint. Phase 7 must NOT duplicate this logic.
- **D-11:** Logic: query `members` where `status = 'active' AND (last_checked_in IS NULL OR last_checked_in < NOW() - INTERVAL '7 days')` — using `createServiceRoleClient()` to bypass RLS.
- **D-12:** Skip members that already have an active unresolved alert with `contact_marked_at > NOW() - INTERVAL '7 days'` — respects ALRT-04 (no duplicate alert within 7-day window).
- **D-13:** For each qualifying member: upsert alert record — if no unresolved alert exists, insert one. Idempotent — calling `detectChurn()` twice doesn't create duplicate alerts.

### Data Model for "Contacted"
- **D-14:** Stored in the **`alerts` table** via `contact_marked_at` field. "Marcar como Contatado" either: (a) finds the member's active unresolved alert and sets `contact_marked_at = NOW()`, OR (b) creates a new alert record with `contact_marked_at = NOW()` if none exists.
- **D-15:** "Active/contacted" alert = `resolved_at IS NULL AND contact_marked_at IS NOT NULL AND contact_marked_at > NOW() - 7 days`

### Member List Data Fetch
- **D-16:** After fetching `memberList`, run a **second query** to get contacted member IDs: `SELECT member_id FROM alerts WHERE org_id = ? AND contact_marked_at > (NOW() - 7 days) AND resolved_at IS NULL`. Build a `Set<string>` for O(1) per-row lookup.
- **D-17:** No schema changes needed — `alerts` table already has all required fields.

### Auto-Clear on Check-In
- **D-18:** In `src/app/api/checkin/route.ts` (Phase 4 file), after successfully inserting the checkin row and updating `last_checked_in`, run: `UPDATE alerts SET resolved_at = NOW() WHERE member_id = ? AND resolved_at IS NULL`. This clears any active alert (including contacted ones) when the member checks in.
- **D-19:** Use `createServiceRoleClient()` for this update — the existing Phase 4 route already uses it.

### "Verificar Agora" Trigger Mechanism
- **D-20:** Triggered via a **Server Action** (not a Route Handler) — consistent with existing mutation pattern. The action uses `createServiceRoleClient()` to run `detectChurn()`.
- **D-21:** Auth check: verify `org_id` from `supabase.auth.getUser()` before running — not publicly accessible (unlike the cron which uses `CRON_SECRET`).

### Claude's Discretion
- Whether `detectChurn()` accepts `orgId` as parameter or reads it internally
- Exact Tailwind classes for "Verificar Agora" outlined button style
- Whether "Marcar Contatado" action is a separate file or extends `src/lib/actions/members.ts`
- Animation/transition on the button → badge swap

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Foundation
- `.planning/PROJECT.md` — Vision, stack, constraints (free tier, pt-BR, single-tenant)
- `.planning/REQUIREMENTS.md` — DASH-04, DASH-05 (requirements this phase delivers)
- `.planning/ROADMAP.md §Phase 6` — Success criteria, UAT criteria, pitfall guards

### Prior Phase Context
- `.planning/phases/05-dashboard-member-overview/05-CONTEXT.md` — D-01 through D-13: member list layout, counter design, color system, sorting
- `.planning/phases/04-qr-check-in-flow/04-CONTEXT.md` — D-09/D-16/D-17/D-19: /api/checkin route architecture (will be modified in D-18)

### Existing Code (read before implementing)
- `src/app/(dashboard)/members/page.tsx` — Current member list page (5th column + Verificar button added here)
- `src/app/(dashboard)/members/[id]/DeactivateButton.tsx` — Client Component + Server Action pattern to follow
- `src/app/(dashboard)/members/[id]/ReactivateButton.tsx` — Same pattern
- `src/lib/actions/members.ts` — Existing member Server Actions (pattern reference)
- `src/app/api/checkin/route.ts` — Phase 4 check-in route (D-18: add alert resolution here)
- `src/lib/supabase/service.ts` — `createServiceRoleClient()` for detectChurn()
- `src/lib/types/database.ts` — `Alert` type (alerts table schema)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createServiceRoleClient()` from `src/lib/supabase/service.ts` — already used in `/api/checkin`; reuse for `detectChurn()` and the manual trigger action
- DeactivateButton/ReactivateButton — exact pattern for "Marcar Contatado" Client Component + Server Action
- `computeCounters()` in `src/lib/utils/members.ts` — counters already computed from memberList; no change needed unless contacted members should be excluded

### Established Patterns
- Server Component page → Client Component button → Server Action mutation → `revalidatePath` soft refresh
- `org_id` from `supabase.auth.getUser()` `app_metadata` — all admin queries scoped to org
- Plain Tailwind, pt-BR labels, emerald-600 primary
- `useFormState` for 2-arg Server Action signatures (established in Phase 3)

### Integration Points
- `src/app/(dashboard)/members/page.tsx` — Add 5th column, second query for contacted IDs, "Verificar Agora" button in header
- `src/app/api/checkin/route.ts` — Add alert resolution after successful check-in (D-18)
- New file: `src/lib/utils/churn.ts` — `detectChurn(orgId)` function (reused by Phase 7)
- New action: `markContactedAction(memberId)` — in members.ts or new file

</code_context>

<specifics>
## Specific Ideas from Discussion

- "Verificar Agora" is a secondary (outlined) button in the page header: same row as "Novo Membro" (emerald filled), differentiated by style
- "Contatado" badge uses blue-100/blue-700 — distinct from the risk badge palette (emerald/amber/gray) so admin can distinguish "I handled this" vs "risk level"
- The 5-column table: active members show nothing in the Ação column; at-risk/inactive show either the button OR the badge (never both)
- `detectChurn()` function signature: `detectChurn(supabaseServiceClient, orgId?)` — Phase 6 passes org-specific ID; Phase 7 processes all orgs or a specific org via cron

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-dashboard-actions-churn-fallback*
*Context gathered: 2026-04-07*
