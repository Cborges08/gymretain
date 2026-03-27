# Phase 3: Member Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 03-member-management
**Areas discussed:** QR code workflow, Member list layout, Add/Edit form placement, Member profile depth, Gym QR page placement

---

## QR Code Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Per-member QR (original) | Each member has a unique QR; they carry/print it | |
| Gym QR + CPF | One QR posted at gym entrance; members enter CPF to identify themselves | ✓ |

**User's choice:** Gym QR + CPF
**Notes:** User clarified from real gym experience that per-member QR is impractical — members don't want to carry their own QR. Facial scan is the industry ideal but out of scope for MVP. Gym posts one QR; members enter CPF after scanning. This required a design pivot affecting Phases 3 and 4.

**Fixes applied during discussion (before continuing):**
- `supabase/migrations/004-gym-qr-cpf.sql` — schema migration (must be run in Supabase)
- `src/lib/types/database.ts` — TypeScript types updated
- `.planning/REQUIREMENTS.md` — MEMB-01 (added CPF), MEMB-02 (gym QR model), CHKN-01 (CPF step), traceability phase numbers corrected
- `.planning/research/ARCHITECTURE.md` — Flow 1 rewritten for gym QR + CPF

---

## Member List Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Table with rows | Name, Email, Last check-in (days), Status badge per row | ✓ |
| Cards grid | One card per member with avatar initials | |

**User's choice:** Table with rows
**Notes:** Scannable, familiar for admin tools.

---

## Add/Edit Form Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Separate routes | /dashboard/members/new and /[id]/edit | ✓ |
| Modal overlay | Create/edit opens as overlay on the list | |

**User's choice:** Separate routes
**Notes:** Clean URL, browser back works naturally, simpler to build.

---

## Member Profile Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Data + QR code on profile | Member data + gym QR displayed on each member's profile | |
| Data only | Just member fields (name, email, CPF masked, phone, status, dates) | ✓ |

**User's choice:** Data only
**Notes:** The gym QR is one shared code — it belongs on a dedicated page, not each member's profile. Check-in history deferred to Phase 5.

---

## Gym QR Code Page

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /dashboard/qr-code page | Focused page: large QR + print button + instruction text | ✓ |
| On dashboard homepage | QR alongside future stats on /dashboard | |
| Defer to Phase 9 | Skip for now, share URL manually | |

**User's choice:** Dedicated /dashboard/qr-code page
**Notes:** Gym needs to physically print and post the QR. Separate page keeps it accessible and focused.

---

## Claude's Discretion

- CPF input mask format
- Table row click behavior
- Form validation error placement
- Active member count above table

## Deferred Ideas

- Full CPF checksum validation → Phase 9 (polish)
- Show/hide inactive members toggle → Claude's discretion in Phase 3
- CSV member import → v2 (IMPT-01, out of scope for MVP)
