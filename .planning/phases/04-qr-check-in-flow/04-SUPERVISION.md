# Phase 4 Supervision Notes

Updated: 2026-03-31
Owner: Codex
Purpose: Live review channel while Claude implements Phase 4.

## Current status

- No active implementation files detected yet under `src/app/checkin`, `src/app/api/checkin`, or `tests/checkin`.
- Before writing code, Claude should reread `04-CLAUDE-HANDOFF.md`.
- Review checkpoint 2026-03-31 15: no Phase 4 source or test files detected yet; next expected step is creating `src/app/api/checkin/route.ts`, `src/app/checkin/[hash]/page.tsx`, `src/app/checkin/[hash]/CheckinForm.tsx`, and tests under `tests/checkin/`.
- Review checkpoint 2026-03-31 15:42: still no Phase 4 implementation files detected; planning docs are aligned, so the next step should be code creation rather than more planning edits.

## Guardrails

- Keep the flow as `gym QR + CPF`.
- Keep `/checkin` and `/api/checkin` public; do not broaden middleware auth changes.
- Put Phase 4 tests under `tests/checkin/`.
- Final branch must pass `npx tsc --noEmit` and `npx vitest run`.

## Review loop

- After each meaningful implementation batch, update this file with:
  - touched files
  - current blockers
  - open review questions
- If a doc disagrees with the current source code, prefer `04-CONTEXT.md`, `04-CLAUDE-HANDOFF.md`, and the existing Phase 3 QR code implementation.

## Review notes

- 2026-04-01 review: `src/app/api/checkin/route.ts` returns success even if `members.last_checked_in` update fails. Handle the update result explicitly so CHKN-05 is not silently violated.
- 2026-04-01 review: strengthen `tests/checkin/checkin-page.test.tsx` so the "CPF input" assertion checks for an actual input element or placeholder/aria attribute, not just the substring `cpf`.
