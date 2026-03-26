# Phase 2: Admin Authentication - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can create an account (email + password), log in, stay logged in across sessions, log out, and reset a forgotten password. All `/dashboard/*` routes redirect to `/auth/login` without a valid session. On first signup, an `organizations` record is created silently and `org_id` is stored in JWT custom claims. Phase also delivers the app shell: a sidebar layout used by all future dashboard phases.

Authentication mechanism, member management, check-in, and alerts are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Signup Flow
- **D-01:** 1-step signup — email and password only. No gym name collected during signup.
- **D-02:** Org record created silently on first signup with a placeholder name (e.g., "Minha Academia"). Admin renames it in a future settings phase.
- **D-03:** `org_id` stored in JWT custom claims (`app_metadata.org_id`) at signup — RLS policies in future phases depend on this being present in the token, not in React state or cookies.

### Auth Pages Visual Style
- **D-04:** Minimal centered card layout — white card on light gray background (`bg-gray-50`). Logo/app name ("GymRetain") above the form.
- **D-05:** Primary color: green/energy tone (e.g., Tailwind `green-600` or `emerald-600`). This becomes the app-wide primary color for buttons, links, and active states. All future phases follow this palette.
- **D-06:** No split layout, no full-page gradient — clean and fast to build.

### Error Handling UX
- **D-07:** Form errors displayed inline — red message directly below the relevant input field (e.g., `<p class="text-red-500 text-sm">Email ou senha incorretos</p>`).
- **D-08:** All UI text and error messages in **Portuguese (pt-BR)** — consistent with `lang="pt-BR"` in layout and project language. Examples: "Entrar", "Cadastrar", "Esqueci minha senha", "Email ou senha incorretos".

### Post-Login Routing
- **D-09:** After successful login → redirect to `/dashboard`.
- **D-10:** `/dashboard` in Phase 2 is a **minimal placeholder with nav sidebar** — shows a sidebar with navigation links (Membros, Alertas, Configurações) and a "Bem-vindo" heading. Provides the app shell layout (`DashboardLayout`) that all future dashboard phases (3, 4, 5) will reuse without rebuilding the nav.
- **D-11:** After logout → redirect to `/auth/login`.
- **D-12:** Visiting `/` when logged in → redirect to `/dashboard`. Visiting `/` when not logged in → stay on landing page (or redirect to `/auth/login` — Claude's discretion).

### Middleware & Route Protection
- **D-13:** Next.js middleware protects `/dashboard/:path*` AND `/api/admin/:path*`. Unauthenticated requests redirect to `/auth/login`.
- **D-14:** Password reset email link redirects to `/auth/reset-password` (a form in the app) where the admin sets a new password — not Supabase's hosted UI.

### Claude's Discretion
- Exact Tailwind shade for green primary (green-600 vs emerald-600 vs teal-600) — pick whichever looks best
- Loading/spinner state during form submission — Claude decides approach
- Whether to use `react-hook-form` or native form state — Claude decides based on simplicity
- Exact sidebar nav structure (icons vs text-only) — Claude decides

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Foundation
- `.planning/PROJECT.md` — Project vision, stack decisions, constraints (free tier, single-tenant, pt-BR)
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-06 (requirements this phase must deliver)
- `.planning/ROADMAP.md §Phase 2` — Success criteria, UAT criteria, pitfall guards

### Architecture & Prior Decisions
- `.planning/phases/01-project-scaffold-database-foundation/01-CONTEXT.md` — Phase 1 decisions (DB schema, RLS, env vars, single-tenant rationale)
- `.planning/research/PITFALLS.md` — Critical pitfalls: org_id in JWT (Pitfall 2), never store passwords manually (Anti-Pattern 4), middleware matcher must cover both dashboard and api/admin routes

### Existing Code (read before implementing)
- `src/lib/supabase/browser.ts` — Browser Supabase client factory (use for client components)
- `src/lib/supabase/server.ts` — Server Supabase client factory (use for Server Components and Route Handlers)
- `src/lib/supabase/service.ts` — Service role client (do NOT use for auth — for cron only)
- `src/lib/types/database.ts` — TypeScript types for all DB tables
- `src/app/layout.tsx` — Root layout (Inter font, pt-BR lang, globals.css)

</canonical_refs>

<specifics>
## Specific Ideas

- The app is a Brazilian gym management tool — all visible text must be in pt-BR
- Green/energy color tone sets the visual identity for the entire app going forward
- The sidebar layout built in this phase (`DashboardLayout`) is the app shell reused by phases 3–7
- Keep it simple — developer has 10-20h/week; no complex animation or multi-step signup wizards

</specifics>

<deferred>
## Deferred Ideas

- **Multi-gym per account / gym selection screen** — Admin wanted a way to select between multiple gyms. This is multi-tenant functionality, explicitly Out of Scope for MVP (see PROJECT.md). Candidate for v2 (MULT-01, MULT-02).

</deferred>

---

*Phase: 02-admin-authentication*
*Context gathered: 2026-03-26*
