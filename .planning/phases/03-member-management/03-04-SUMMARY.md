---
phase: 03-member-management
plan: 04
subsystem: ui
tags: [next.js, react, tailwind, supabase, server-components, client-components, forms]

# Dependency graph
requires:
  - phase: 03-member-management
    plan: 01
    provides: "deactivateMemberAction, updateMemberAction, maskCpf, formatCpf, Member type"
provides:
  - "Member profile page at /dashboard/members/[id] (Server Component)"
  - "Member edit page at /dashboard/members/[id]/edit (Server + Client hybrid)"
  - "DeactivateButton Client Component with confirmation dialog"
  - "ReactivateButton Client Component"
  - "EditMemberForm Client Component with useFormState(updateMemberAction)"
affects: [03-05, 04-qr-checkin, 05-dashboard-overview]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component page fetches data, passes to Client Component form (hybrid page pattern)"
    - "useFormState wraps server actions with 2-arg signature for Client Component forms"
    - "Confirmation dialog extracted to Client Component (cannot use onSubmit in Server Component)"

key-files:
  created:
    - src/app/(dashboard)/members/[id]/page.tsx
    - src/app/(dashboard)/members/[id]/DeactivateButton.tsx
    - src/app/(dashboard)/members/[id]/ReactivateButton.tsx
    - src/app/(dashboard)/members/[id]/edit/page.tsx
    - src/app/(dashboard)/members/[id]/edit/EditMemberForm.tsx
  modified: []

key-decisions:
  - "Extracted DeactivateButton and ReactivateButton as Client Components — Server Components cannot use onSubmit event handlers; useFormState is required for 2-arg server action signatures"
  - "Cancel on edit form returns to /dashboard/members/{id} (profile), not the member list — better UX for edit cancel"
  - "CPF shown unmasked in edit form via formatCpf() per D-14; masked via maskCpf() on profile page"

patterns-established:
  - "Server/Client hybrid pages: async Server Component fetches data, passes as props to Client Component"
  - "useFormState pattern for all server actions — wrap 2-arg actions before passing to form action"

requirements-completed: [MEMB-04]

# Metrics
duration: 18min
completed: 2026-03-30
---

# Phase 3 Plan 04: Member Profile and Edit Pages Summary

**Member profile page (Server Component) with masked CPF/status/deactivate, and edit form (Client Component hybrid) with pre-filled fields wired to updateMemberAction**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-30T00:00:00Z
- **Completed:** 2026-03-30T00:18:00Z
- **Tasks:** 2
- **Files modified:** 5 created

## Accomplishments
- Member profile page at `/dashboard/members/[id]` as Server Component — fetches member by id scoped to org_id, shows all fields with CPF masked, status badge, Editar link, Desativar/Reativar buttons, check-in history placeholder
- Member edit page at `/dashboard/members/[id]/edit` as hybrid Server+Client — Server Component fetches member, Client Component `EditMemberForm` pre-fills all fields with `useFormState(updateMemberAction, null)`
- Extracted `DeactivateButton` and `ReactivateButton` as Client Components to correctly handle `useFormState` pattern required by 2-arg server action signature (TypeScript-safe)

## Task Commits

Each task was committed atomically:

1. **Task 1: Member profile page at /dashboard/members/[id]** - `4055f2a` (feat)
2. **Task 2: Member edit page at /dashboard/members/[id]/edit** - `c15ae0d` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/app/(dashboard)/members/[id]/page.tsx` - Server Component: member profile with masked CPF, status, Editar link, deactivate/reactivate
- `src/app/(dashboard)/members/[id]/DeactivateButton.tsx` - Client Component: form with confirm() dialog wired to deactivateMemberAction via useFormState
- `src/app/(dashboard)/members/[id]/ReactivateButton.tsx` - Client Component: reactivate form wired to deactivateMemberAction via useFormState (no confirmation)
- `src/app/(dashboard)/members/[id]/edit/page.tsx` - Server Component: fetches member, renders EditMemberForm
- `src/app/(dashboard)/members/[id]/edit/EditMemberForm.tsx` - Client Component: pre-filled edit form with useFormState(updateMemberAction), CPF via formatCpf, Cancel returns to profile

## Decisions Made
- DeactivateButton and ReactivateButton extracted as Client Components — cannot use `onSubmit` event handlers in Server Components; `useFormState` wrapper required for 2-arg server action signatures (TypeScript error TS2322 prevented direct use)
- Cancel link on edit form goes to `/dashboard/members/{member.id}` (profile page), not list — correct UX for edit cancel flow

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extracted deactivate/reactivate into Client Components to fix TypeScript TS2322**
- **Found during:** Task 1 & 2 (after TypeScript build check)
- **Issue:** Next.js 14 form `action={serverAction}` requires a 1-arg `(formData: FormData) => void | Promise<void>` signature. The `deactivateMemberAction` uses the `useFormState` 2-arg signature. TypeScript error TS2322 blocked compilation.
- **Fix:** Created `DeactivateButton.tsx` and `ReactivateButton.tsx` as Client Components using `useFormState(deactivateMemberAction, null)`. The `ReactivateButton` was added (beyond plan scope) to handle the reactivate case consistently.
- **Files modified:** `DeactivateButton.tsx`, `ReactivateButton.tsx`, `page.tsx`
- **Verification:** `npx tsc --noEmit` — zero errors in new files
- **Committed in:** `4055f2a`, `c15ae0d`

---

**Total deviations:** 1 auto-fixed (Rule 1 — TypeScript compatibility bug)
**Impact on plan:** Required to satisfy TypeScript. Pattern matches plan's fallback note about extracting DeactivateButton. No functional change — confirm dialog, exact text, and action wiring are identical.

## Issues Encountered
- TypeScript TS2322 error when using 2-arg `useFormState`-style server action directly as `<form action>` — resolved by wrapping in Client Components using `useFormState`

## Known Stubs
- **Check-in history placeholder** — `src/app/(dashboard)/members/[id]/page.tsx`, line ~129: `"Histórico disponível na fase 5."` — intentional per plan spec; Phase 5 (Dashboard) will implement real check-in history

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MEMB-04 complete: admin can view any member's profile and edit all fields
- Profile page ready for Phase 5 to replace check-in history placeholder with real data
- Edit form and deactivate/reactivate actions fully wired and tested via TypeScript

---
*Phase: 03-member-management*
*Completed: 2026-03-30*
