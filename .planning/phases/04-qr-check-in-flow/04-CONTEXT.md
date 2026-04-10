# Phase 4: QR Check-In Flow - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Member scans the gym QR code → lands on `/checkin/{qr_code_hash}` → enters CPF → check-in recorded without login or app. Admin views check-in data in later phases (Phase 5+).

This phase delivers: the public check-in page, CPF lookup, duplicate detection (4h window), audit trail recording, and `last_checked_in` update.

Not in this phase: check-in history display (Phase 5), dashboard counters (Phase 5), mark-as-contacted (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Page Architecture
- **D-01:** Check-in page lives at `src/app/checkin/[hash]/page.tsx` — outside the `(dashboard)` and `(auth)` route groups. No auth middleware applies to this route. In the current codebase, `/checkin` is already public because `middleware.ts` only protects `/dashboard` and `/api/admin`; preserve and document that behavior rather than changing auth logic unnecessarily.
- **D-02:** `page.tsx` is a **Server Component** that validates the QR hash upfront against the `organizations` table. If the hash doesn't exist → renders an inline error card (no redirect). If valid → renders the gym name and the `<CheckinForm>` Client Component.
- **D-03:** `CheckinForm` is a **Client Component** — required for the CPF mask (client-side JS) and to call `POST /api/checkin` via `fetch`. It receives `{ orgId, orgName, qrHash }` as props from the Server Component.

### Check-In Page Design
- **D-04:** Full-screen `bg-emerald-600` layout with a centered white card. Distinct from the admin dashboard (no sidebar). Designed for mobile first.
- **D-05:** Card shows: gym name (`organizations.name`) as the heading, "Registre seu check-in" as subtitle, CPF input, and "Confirmar Check-in" button.
- **D-06:** No gym logo — gym name text only (no logo upload feature in MVP).

### CPF Input
- **D-07:** CPF input uses a **formatted mask** (`___.___.___-__`) — same UX as the admin member create form. Client-side mask via JS input handler or lightweight mask lib. Server strips non-digits before processing.
- **D-08:** Client validates CPF length (11 digits after stripping) before submitting. No checksum validation here — deferred to Phase 9.

### Submission Mechanism
- **D-09:** `POST /api/checkin` — **Route Handler**, not a Server Action. Route Handler gives direct access to `request.headers` for IP (`x-forwarded-for`) and `user-agent` (CHKN-04). Uses `createServiceRoleClient()` to bypass RLS (members and checkins tables require anon key to be blocked by RLS for admin queries, but check-in insert has a public policy from Phase 1).
- **D-10:** Request body: `{ qr_hash: string, cpf: string }`. Response: `{ ok: true, memberName: string, checkedInAt: string }` on success, or `{ ok: false, code: 'NOT_FOUND' | 'DUPLICATE' | 'INVALID_HASH', checkedInAt?: string }` on failure.
- **D-11:** Update `service.ts` comment — add `/api/checkin (Phase 4)` to the allowed-usage list alongside the cron route.

### Error Handling
- **D-12:** Invalid or missing QR hash → Server Component renders a friendly error card inline. Text: "QR Code inválido. Este código não foi encontrado. Fale com seu professor." Same full-screen emerald layout, no 500 error, no redirect.
- **D-13:** CPF not found in org (or member inactive) → generic error: "CPF não encontrado ou não cadastrado." No distinction between "not found" vs "inactive" — prevents membership enumeration via the public check-in page.
- **D-14:** Duplicate check-in within 4h → message: "Você já fez check-in hoje às [HH:MM]." No "volte mais tarde" — just show the previous check-in timestamp. No new row created.

### Success Screen
- **D-15:** Static success screen (no auto-redirect). Shows: "✓ Check-in registrado!" heading, member's first name ("Bem-vindo, [Nome]!"), and timestamp formatted as "31/03/2026 às 14h30". Member closes the browser tab.

### Audit Trail
- **D-16:** Every successful check-in records: `member_id`, `org_id`, `checked_in_at` (UTC), `ip_address` (from `x-forwarded-for`), `user_agent` (from request header).
- **D-17:** `members.last_checked_in` is updated atomically in the same DB transaction (or sequential queries — upsert pattern) after inserting the checkin row.

### Claude's Discretion
- Choice of CPF mask implementation (vanilla JS `input` event handler vs a lightweight lib like `react-input-mask` or `maska`) — prefer no new dependency if a 10-line handler suffices
- Loading/pending state on the confirm button during the `fetch` call (e.g., disable button + spinner)
- Exact Portuguese copy for button labels and instructions (within pt-BR requirement)
- Whether to add a `noValidate` attribute on the form (consistent with Phase 3 pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Foundation
- `.planning/PROJECT.md` — Vision, stack, constraints (free tier, pt-BR, single-tenant)
- `.planning/REQUIREMENTS.md` — CHKN-01 through CHKN-06 (requirements this phase delivers)
- `.planning/ROADMAP.md §Phase 4` — Success criteria, UAT criteria, pitfall guards

### Prior Phase Context
- `.planning/phases/01-project-scaffold-database-foundation/01-CONTEXT.md` — DB schema, RLS policies, `checkins_insert_public` policy (D-12 there: no TO role restriction enables anonymous insert)
- `.planning/phases/03-member-management/03-CONTEXT.md` — CPF model, `organizations.qr_code_hash`, check-in URL pattern, color system

### Schema
- `supabase/migrations/004-gym-qr-cpf.sql` — `organizations.qr_code_hash`, `members.cpf`, idx_members_org_id_cpf index (used on every check-in lookup)

### Existing Code (read before implementing)
- `src/lib/supabase/service.ts` — Service role client (use for `/api/checkin`; update comment to include this route)
- `src/lib/types/database.ts` — `Organization`, `Member`, `Checkin` types
- `src/lib/utils/cpf.ts` — Existing CPF utility (check what's already there before writing new helpers)
- `src/middleware.ts` — Preserve `/checkin` and `/api/checkin` as public routes; current `isProtected` logic already leaves them unguarded
- `src/app/(dashboard)/qr-code/QRCodeDisplay.tsx` — Reference for how QR code URL is constructed (`{APP_URL}/checkin/{qr_code_hash}`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase/service.ts` — `createServiceRoleClient()` for the `/api/checkin` route handler
- `src/lib/utils/cpf.ts` — Existing CPF utilities (check before writing new ones)
- Tailwind `emerald-600` and white card pattern — established across dashboard; reuse same tokens

### Established Patterns
- Server Component validates → Client Component handles interaction (pattern from Phase 3 QR code page split: `page.tsx` + `QRCodeDisplay.tsx`)
- API Route Handlers live at `src/app/api/` — new route: `src/app/api/checkin/route.ts`
- `x-forwarded-for` header for IP address (Vercel sets this)
- All form labels, messages, and errors in pt-BR

### Integration Points
- `src/middleware.ts` must continue leaving `/checkin/:path*` and `/api/checkin` public (no auth required); a clarifying comment is sufficient unless auth logic changes
- New route group: `src/app/checkin/[hash]/` — standalone, no shared layout with dashboard or auth
- `createServiceRoleClient()` in `src/app/api/checkin/route.ts` — only place outside cron where service role is used

</code_context>

<specifics>
## Specific Ideas

- The page is the primary member-facing touchpoint in the entire product. It must feel polished and load fast on mobile — members scan the QR on their phone.
- Full-screen emerald background makes the check-in page feel intentionally different from the admin dashboard — no confusion about which interface you're on.
- Static success screen (no auto-redirect) is intentional for MVP: most members scan on personal phones and close the tab. Tablet-at-entrance use case is future scope.
- Generic "CPF não encontrado" error prevents any member from checking whether another member is in the gym's database.

</specifics>

<deferred>
## Deferred Ideas

- **CPF checksum validation** — Full 11-digit checksum algorithm deferred to Phase 9 (polish). Basic length + digit check is sufficient for Phase 4.
- **Auto-redirect after success** — Would help tablet-at-entrance setups (multiple members using one device). Deferred; not in the MVP member use case.
- **"Registrar outro check-in" button on success screen** — Same tablet use case. Deferred.
- **Rate limiting on /api/checkin** — Prevent brute-force CPF guessing via the public endpoint. Deferred to Phase 9 (hardening).

</deferred>

---

*Phase: 04-qr-check-in-flow*
*Context gathered: 2026-03-31*
