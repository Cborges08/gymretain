# Phase 3: Member Management - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can create, view, edit, and deactivate/reactivate members. Each member has a CPF field used for check-in identification. The gym has a single QR code (stored on the `organizations` record) accessible from `/dashboard/qr-code` for printing and posting at the entrance.

Check-in flow itself is Phase 4. Check-in history display is Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Check-In Model (critical — affects Phases 3 and 4)
- **D-01:** Check-in is **gym QR + CPF**, not per-member QR. The gym has one QR code posted at the entrance. Members scan it and enter their CPF to check in.
- **D-02:** `organizations.qr_code_hash` stores the gym's QR code hash (added in migration 004). Generated once, permanent.
- **D-03:** `members.cpf` (TEXT, nullable at DB level, required on Insert) identifies the member at check-in. CPF is the Brazilian taxpayer ID (11 digits with checksum).
- **D-04:** Per-member `qr_code_hash` and `qr_code_generated_at` columns have been dropped from `members` (migration 004 applied). Do not reference them.

### Member Form Fields
- **D-05:** Member create/edit form collects: **Nome** (required), **Email** (required), **CPF** (required), **Telefone** (optional).
- **D-06:** Email must be unique within the org (`UNIQUE(org_id, email)` constraint). CPF must be unique within the org (`UNIQUE(org_id, cpf)` constraint). Show clear error in pt-BR when either is duplicated.

### Member List Layout
- **D-07:** Table layout with one row per member. Columns: Nome, Email, Último check-in (days ago or "—"), Status badge.
- **D-08:** Status badge has three states: **Ativo** (green), **Em risco** (amber — 4–7 days without check-in), **Inativo** (gray — deactivated via toggle, not time-based).
- **D-09:** "Último check-in" shows days elapsed (e.g., "2d", "9d") or "—" if member has never checked in. The exact threshold logic for "Em risco" belongs to Phase 5 (DASH-02); Phase 3 list only needs Ativo/Inativo status.
- **D-10:** "+ Novo Membro" button in the page header links to `/dashboard/members/new`.

### Add/Edit Form Placement
- **D-11:** Separate routes — not modals. Create: `/dashboard/members/new`. Edit: `/dashboard/members/[id]/edit`.
- **D-12:** Cancel button on both pages navigates back to `/dashboard/members`.
- **D-13:** Both forms use Server Actions for submit. No client-side fetch.

### Member Profile Page
- **D-14:** Profile page (`/dashboard/members/[id]`) shows: name, email, CPF (masked: `***.***.***-XX`), phone, status badge, join date, last check-in date.
- **D-15:** Profile page has an "Editar" button linking to the edit route. Deactivate/reactivate toggle also lives here.
- **D-16:** No QR code on the member profile. The gym QR is shared across all members — it lives at `/dashboard/qr-code`.
- **D-17:** No check-in history on the profile in Phase 3. Placeholder text is fine. History is Phase 5 (DASH-03).

### Gym QR Code Page
- **D-18:** `/dashboard/qr-code` is a new page in Phase 3. Shows the gym's QR code large with a brief instruction ("Seus alunos escaneiam este código para fazer check-in") and an "Imprimir QR Code" button.
- **D-19:** The QR code displayed is generated from the `organizations.qr_code_hash` URL: `{APP_URL}/checkin/{qr_code_hash}`. Use `qrcode.react` for rendering (`<QRCodeCanvas>` component).
- **D-20:** Add "QR Code" link to `SidebarNav` alongside Membros, Alertas, Configurações.

### Deactivate/Reactivate
- **D-21:** Deactivate sets `members.status = 'inactive'`. Reactivate sets it back to `'active'`. No data is deleted.
- **D-22:** Deactivated members are hidden from the main member list by default (filter `status = 'active'`). Claude's discretion on whether to add a toggle to show inactive members in Phase 3.

### Language & Style
- **D-23:** All visible text in **pt-BR**. Buttons: "Salvar", "Cancelar", "Editar", "Desativar", "Reativar", "Imprimir QR Code", "+ Novo Membro".
- **D-24:** Follow established emerald-600 primary color and minimal white card / gray-50 background style from Phase 2.

### Claude's Discretion
- CPF input mask (e.g., `___.___.___-__`) — Claude decides whether to implement a JS mask or plain text input
- Table row click behavior — clicking a row navigates to profile, or only clicking the name
- Form validation error placement — inline below field (consistent with Phase 2 auth forms)
- Whether to show a count of total active members above the table

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Foundation
- `.planning/PROJECT.md` — Vision, stack decisions, constraints (free tier, pt-BR, single-tenant)
- `.planning/REQUIREMENTS.md` — MEMB-01 through MEMB-07 (requirements this phase delivers)
- `.planning/ROADMAP.md §Phase 3` — Success criteria, UAT criteria, pitfall guards

### Schema & Architecture
- `.planning/phases/01-project-scaffold-database-foundation/01-CONTEXT.md` — DB schema, RLS, env vars
- `.planning/phases/02-admin-authentication/02-CONTEXT.md` — Auth pattern, color system, Server Actions pattern, DashboardLayout
- `.planning/research/ARCHITECTURE.md §Flow 1` — Updated check-in flow (gym QR + CPF). **Flow 1 has been rewritten — do not use the pre-Phase 3 version.**
- `supabase/migrations/004-gym-qr-cpf.sql` — Schema changes applied in this pivot: cpf on members, qr_code_hash on organizations, per-member QR columns dropped

### Existing Code (read before implementing)
- `src/app/(dashboard)/layout.tsx` — DashboardLayout shell (reuse, do not rebuild)
- `src/components/dashboard/SidebarNav.tsx` — Add "QR Code" link here (D-20)
- `src/lib/supabase/server.ts` — Server Supabase client (use for Server Components and Server Actions)
- `src/lib/supabase/service.ts` — Service role client (do NOT use here — reserved for check-in API in Phase 4 and cron in Phase 7)
- `src/lib/types/database.ts` — Updated types: `Organization` has `qr_code_hash`, `Member` has `cpf`, no `qr_code_hash`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DashboardLayout` (`src/app/(dashboard)/layout.tsx`) — sidebar + main layout, wrap all new pages in this
- `SidebarNav` (`src/components/dashboard/SidebarNav.tsx`) — add QR Code link; already has Membros link pointing to `/dashboard/members`
- Server Action pattern from Phase 2 auth (`src/lib/actions/logout.ts`) — follow same pattern for member create/edit/deactivate actions

### Established Patterns
- Server Actions for form submissions (no API routes for admin mutations)
- `createServerClient()` for Server Components and Server Actions
- Inline form errors in pt-BR (red text below field)
- `emerald-600` primary, `bg-gray-50` page background, white cards with `border border-gray-200`

### Integration Points
- New routes nest under `src/app/(dashboard)/` route group — they automatically get the sidebar layout
- `SidebarNav.tsx` needs one new link: `{ href: '/dashboard/qr-code', label: 'QR Code' }`
- `org_id` for all member inserts comes from `auth.jwt() -> 'app_metadata' ->> 'org_id'` — never trust client

</code_context>

<specifics>
## Specific Ideas

- Gym QR code page uses `qrcode.react` (`<QRCodeCanvas>`) — already noted in ROADMAP Phase 3 pitfall guards
- CPF is Brazilian PII — display masked (`***.***.***-XX`) everywhere except the edit form where admin may need to correct it
- The pivot from per-member QR to gym QR + CPF came from real gym UX experience: per-member QR requires members to carry/remember a code, which is impractical. Gym posts one QR; members enter CPF. Simpler operationally.

</specifics>

<deferred>
## Deferred Ideas

- **CPF checksum validation** — CPF has an 11-digit checksum algorithm. Basic format validation in Phase 3 is fine. Full checksum validation noted for Phase 9 (polish). Phase 4 must also validate CPF at check-in — capture in Phase 4 CONTEXT.md.
- **Show inactive members toggle** — An option to show/hide deactivated members on the list page. Not required for Phase 3 MVP; Claude can include it at discretion.
- **Import members via CSV** — v2 requirement (IMPT-01). Out of scope for MVP.

</deferred>

---

*Phase: 03-member-management*
*Context gathered: 2026-03-27*
