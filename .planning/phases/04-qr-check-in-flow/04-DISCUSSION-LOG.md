# Phase 4: QR Check-In Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 04-qr-check-in-flow
**Areas discussed:** Check-in page design, CPF input & validation, Success & error screens, Submission mechanism

---

## Check-in Page Design

### What does the page show before CPF entry?

| Option | Description | Selected |
|--------|-------------|----------|
| Gym name + logo area | Show org name prominently, then CPF input below | ✓ |
| Minimal / brandless | No gym name — just CPF input and confirm button | |
| Full welcome screen | Gym name + welcome message + instructions | |

**User's choice:** Gym name + logo area
**Notes:** Gym name fetched from `organizations` table. No logo in MVP — text only.

---

### What layout wraps the check-in page?

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen centered card | White card on emerald-600 background, mobile-first | ✓ |
| Plain white page | White background, card centered | |

**User's choice:** Full-screen centered card (bg-emerald-600)

---

## CPF Input & Validation

### Mask or plain input?

| Option | Description | Selected |
|--------|-------------|----------|
| Plain numeric input | 11 raw digits, no mask | |
| Formatted mask ___.___.___-__ | Client-side JS mask | ✓ |

**User's choice:** Formatted mask

---

### Member not found behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Generic 'CPF não encontrado' | No distinction between not found vs inactive | ✓ |
| Specific 'membro inativo' vs 'não cadastrado' | Distinct errors — reveals membership status | |

**User's choice:** Generic "CPF não encontrado ou não cadastrado"
**Notes:** Prevents membership enumeration via public check-in page.

---

## Success & Error Screens

### Success screen content

| Option | Description | Selected |
|--------|-------------|----------|
| Name + timestamp, static | Static screen, member closes browser | ✓ |
| Auto-redirect after 5s | Returns to CPF form after 5 seconds | |

**User's choice:** Static success — "Bem-vindo, [Nome]! Check-in registrado às 14h30."

---

### Invalid QR hash error

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly error page (inline) | Rendered as error card, no redirect, no 500 | ✓ |
| Redirect to /checkin/error | Redirect hop, cleaner URL | |

**User's choice:** Friendly error card inline on the same page.

---

### Duplicate check-in message

| Option | Description | Selected |
|--------|-------------|----------|
| Show time of last check-in | "Você já fez check-in hoje às 14h30." | ✓ |
| Generic 'já registrado' | No timestamp shown | |

**User's choice:** Show timestamp.
**Notes:** User requested removing "volte mais tarde" — message is just "Você já fez check-in hoje às [HH:MM]." No call to action.

---

## Submission Mechanism

### Route Handler vs Server Action

| Option | Description | Selected |
|--------|-------------|----------|
| API Route Handler (POST /api/checkin) | Direct access to request.headers for IP/user-agent | ✓ |
| Server Action | Uses headers() from next/headers; less boilerplate | |

**User's choice:** API Route Handler

---

### Page + form architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Client Component form + fetch | page.tsx = Server Component; CheckinForm = Client Component calling fetch | ✓ |
| Server Component with form action | No Client Component — but incompatible with mask requirement | |

**User's choice:** Client Component form + fetch

---

## Claude's Discretion

- CPF mask implementation (vanilla JS vs lightweight lib)
- Loading/pending button state during fetch
- Exact pt-BR copy for button labels and error messages
- `noValidate` on form

---

*Discussion completed: 2026-03-31*
