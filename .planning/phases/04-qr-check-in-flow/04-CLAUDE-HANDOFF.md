# Phase 4 Execution Handoff for Claude

Updated: 2026-03-31
Status: Read before implementing Phase 4 plans

## Why this file exists

The Phase 4 plans were approved, then reviewed against the real repository state. This note captures the corrections that matter during execution so implementation does not drift from the codebase.

## Read order

1. `./04-CONTEXT.md`
2. `./04-01-PLAN.md`
3. `./04-02-PLAN.md`
4. `./04-VALIDATION.md`
5. `../../STATE.md`

## Execution-critical corrections

- Use the **gym QR + CPF** model everywhere. Do not reintroduce per-member QR behavior.
- The public flow is: scan gym QR -> `/checkin/{hash}` -> show gym name -> enter CPF -> success/error screen.
- `/checkin` and `/api/checkin` are **already public** in `src/middleware.ts` because only `/dashboard` and `/api/admin` are protected. Document this behavior if helpful, but do not refactor auth logic unless you find a real bug.
- Phase 4 tests must live under `tests/checkin/` because the current `vitest.config.ts` only includes `tests/**/*.test.ts(x)`.
- Do not leave placeholder tests such as `expect(true).toBe(false)` in the final execution branch. Red-first TDD is fine, final state must be green.
- PowerShell-safe verification commands are already reflected in the updated plans. Avoid Unix-only helpers like `head`, `tail`, and `grep` when following plan steps in this workspace.

## Recommended test file targets

- `tests/checkin/route.test.ts`
- `tests/checkin/checkin-page.test.tsx`

## Repository facts to trust

- `src/app/(dashboard)/qr-code/page.tsx` already builds the gym QR URL as `${APP_URL}/checkin/${org.qr_code_hash}`.
- `src/lib/utils/cpf.ts` already provides `stripCpf`, `isValidCpfFormat`, `formatCpf`, and `maskCpf`.
- `src/lib/supabase/service.ts` is the correct place for `createServiceRoleClient()` usage in `/api/checkin`.
- `src/middleware.ts` currently protects only `/dashboard` and `/api/admin`.

## If docs disagree

If any older planning or project doc still implies "QR por aluno", prefer:

1. `04-CONTEXT.md`
2. The updated Phase 4 plan files
3. The existing source code in `src/`

## Definition of done reminder

- `/api/checkin` implemented
- `/checkin/[hash]` page implemented
- Tests under `tests/checkin/` passing
- `npx tsc --noEmit` passing
- `npx vitest run` passing
