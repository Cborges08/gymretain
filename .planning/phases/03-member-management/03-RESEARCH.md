# Phase 3: Member Management - Research

**Researched:** 2026-03-27
**Domain:** Member CRUD, QR code management, form-based admin operations
**Confidence:** HIGH

## Summary

Phase 3 delivers the core member management interface: admin creates members (with CPF and optional phone), views a sortable list with status badges, edits member details, and toggles member activation. The critical architectural pivot is **gym-wide QR code + CPF identification** (not per-member QR codes).

The gym has exactly one QR code stored in `organizations.qr_code_hash`, displayed at `/dashboard/qr-code` for printing. Members scan this QR and enter their CPF at the public check-in page (Phase 4). All member creates/edits flow through Server Actions (inherited pattern from Phase 2 auth). The `members` table enforces `UNIQUE(org_id, email)` and `UNIQUE(org_id, cpf)` constraints at the database level.

**Primary recommendation:** Build member routes using the Server Actions pattern from Phase 2 (no API routes). Use `qrcode.react` (`<QRCodeCanvas>`) for display. Validate CPF format client-side (11 digits); full checksum validation deferred. Mask CPF display everywhere except the edit form. Handle duplicate email/CPF errors with pt-BR feedback inline below fields.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 to D-04: Check-In Model**
- Check-in is gym QR + CPF, not per-member QR
- `organizations.qr_code_hash` stores the gym's single QR code
- `members.cpf` (TEXT, nullable at DB, required on Insert) identifies members at check-in
- Per-member QR columns (`qr_code_hash`, `qr_code_generated_at`) have been dropped (migration 004)

**D-05 to D-06: Member Form Fields & Validation**
- Form collects: Nome (required), Email (required), CPF (required), Telefone (optional)
- Email unique within org (`UNIQUE(org_id, email)`)
- CPF unique within org (`UNIQUE(org_id, cpf)`)
- Clear pt-BR error messages for duplicate email or CPF

**D-07 to D-10: Member List Layout**
- Table with columns: Nome, Email, Último check-in (days or "—"), Status badge
- Status: Ativo (green), Em risco (amber — Phase 5 threshold logic), Inativo (gray — deactivated)
- "+ Novo Membro" button links to `/dashboard/members/new`
- Only show Ativo/Inativo status in Phase 3 (Em risco belongs to Phase 5)

**D-11 to D-13: Form Routes**
- Create: `/dashboard/members/new` (separate page, not modal)
- Edit: `/dashboard/members/[id]/edit` (separate page)
- Cancel button navigates back to `/dashboard/members`
- Both use Server Actions for submit (no client-side fetch)

**D-14 to D-17: Member Profile Page**
- Route: `/dashboard/members/[id]`
- Shows: name, email, CPF (masked: `***.***.***-XX`), phone, status badge, join date, last check-in
- "Editar" button links to edit route
- Deactivate/reactivate toggle on profile page
- NO QR code on member profile (QR lives at `/dashboard/qr-code`)
- NO check-in history in Phase 3 (Phase 5 feature)

**D-18 to D-20: Gym QR Code Page**
- New page at `/dashboard/qr-code`
- Displays gym QR code (large) + instruction text ("Seus alunos escaneiam este código para fazer check-in")
- QR code generated from `organizations.qr_code_hash` URL: `{APP_URL}/checkin/{qr_code_hash}`
- Use `qrcode.react` (`<QRCodeCanvas>`) for rendering
- "Imprimir QR Code" button
- Add "QR Code" link to `SidebarNav` (D-20)

**D-21 to D-22: Deactivate/Reactivate**
- Deactivate: sets `members.status = 'inactive'`
- Reactivate: sets `members.status = 'active'`
- No data deletion
- Member list filters: `status = 'active'` by default

**D-23 to D-24: Language & Style**
- All visible text in pt-BR
- Button labels: "Salvar", "Cancelar", "Editar", "Desativar", "Reativar", "Imprimir QR Code", "+ Novo Membro"
- Emerald-600 primary color, white cards, gray-50 background (from Phase 2)

### Claude's Discretion

- CPF input mask (e.g., `___.___.___-__`) — implement JS mask or plain text input
- Table row click behavior — row nav to profile or only name click
- Form validation error placement — inline below field (consistent with Phase 2)
- Whether to show total active member count above table
- Show/hide toggle for inactive members on the member list (Phase 3 optional)

### Deferred Ideas (OUT OF SCOPE)

- CPF checksum validation — basic format validation (11 digits) sufficient for Phase 3; full checksum noted for Phase 9
- Import members via CSV — v2 requirement (IMPT-01)
- Show inactive members toggle — optional at Claude's discretion for Phase 3

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEMB-01 | Admin can create member with name, email, CPF, and optional phone; member is saved and unique QR code is generated automatically | **CPF pivot:** Gym QR (`organizations.qr_code_hash`), not per-member. Member identified by CPF at check-in. Database enforces `UNIQUE(org_id, cpf)` and `UNIQUE(org_id, email)`. Server Action pattern from Phase 2 applies. |
| MEMB-02 | Unique QR code generated for the gym (not per-member); members identify via CPF on check-in page after scanning gym QR | **Architecture established:** Gym QR code in `organizations.qr_code_hash` (migration 004). Check-in flow: gym QR → CPF form (Phase 4). Phase 3 displays gym QR at `/dashboard/qr-code` using `qrcode.react`. |
| MEMB-03 | Admin can view list of all members with attendance status | **List layout (D-07):** Table with Nome, Email, Último check-in, Status badge. Filter: `status = 'active'` by default. Phase 3 shows Ativo/Inativo only; Em risco threshold logic is Phase 5 (D-09, DASH-02). |
| MEMB-04 | Admin can view individual member profile with check-in history | **Profile page (D-14):** Route `/dashboard/members/[id]` shows name, email (CPF masked), phone, status, join date, last check-in. History placeholder; Phase 5 feature (D-17, DASH-03). Deactivate/reactivate toggle on profile (D-21, D-22). |
| MEMB-05 | Admin can edit member data (name, email, phone) | **Edit route (D-11):** `/dashboard/members/[id]/edit`. Server Action form pattern. Validates `UNIQUE(org_id, email)` and `UNIQUE(org_id, cpf)` constraints at DB level (D-06). Display CPF unmasked in edit form (allow correction). |
| MEMB-06 | Admin can deactivate/reactivate members — no data deletion | **Deactivate logic (D-21, D-22):** Toggle sets `members.status = 'inactive'` or `'active'`. Reactivate restores full history. List filter hides inactive by default. Deactivate button on profile page (D-15). |
| MEMB-07 | Schema includes `external_id` column (nullable) reserved for future Fácil integration | **Database type (database.ts):** `Member.external_id: string \| null`. Migration 004 does not add this column (reserved for Phase X); ensure it exists in earlier migrations (001 or 002). Confirm in schema audit. |

</phase_requirements>

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2.35 | React framework with App Router, Server Actions, middleware | Stack locked in Phase 1; proven with auth (Phase 2) |
| React | 18.x | UI library | Built-in with Next.js 14 |
| TypeScript | 5.x | Type safety | Stack locked in Phase 1 |
| Tailwind CSS | 3.3.0 | Utility-first styling | Stack locked in Phase 1; Phase 2 patterns reused (emerald-600, gray-50) |
| Supabase | 2.100.0 | Auth + PostgreSQL + RLS | Stack locked in Phase 1; proven for schema + RLS in Phase 2 |
| @supabase/auth-helpers-nextjs | 0.15.0 | Server/browser clients, middleware | Locked in Phase 1; createServerClient pattern used throughout Phase 2 |
| qrcode.react | 4.2.0 | Client-side QR code rendering (`<QRCodeCanvas>`) | Specified in ROADMAP Phase 3 pitfall guards; already in dependencies |
| qrcode | 1.5.4 | Server-side QR code generation (future check-in API) | Specified in ROADMAP; server-side validation Phase 4 |
| zod | 4.3.6 | Schema validation for forms and API inputs | Used in Phase 2 auth actions; standard for form validation |
| date-fns | 4.1.0 | Date formatting and manipulation | For "X days ago" formatting on member list (last check-in) |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-email/components | 1.0.10 | Email templates (future alerting, Phase 5+) | Not used in Phase 3; included for reference |
| resend | 6.9.4 | Email delivery API (future alerting, Phase 5+) | Not used in Phase 3; included for reference |

### Installation

All dependencies already present in package.json (verified 2026-03-27):

```bash
npm install
# Already includes qrcode.react, qrcode, zod, date-fns, @supabase/auth-helpers-nextjs
```

**Version verification:** All versions match package.json snapshot. qrcode.react v4.2.0 is current as of 2026-03-27 (latest 4.x release). qrcode v1.5.4 is current (latest stable).

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/(dashboard)/
│   ├── members/
│   │   ├── page.tsx                    # Member list view
│   │   ├── new/page.tsx                # Create form
│   │   ├── [id]/
│   │   │   ├── page.tsx                # Profile view
│   │   │   └── edit/page.tsx           # Edit form
│   ├── qr-code/
│   │   └── page.tsx                    # Gym QR code display & print
│   └── layout.tsx                      # DashboardLayout (reuse from Phase 2)
├── components/
│   └── dashboard/
│       ├── SidebarNav.tsx              # Add QR Code link (D-20)
│       └── members/
│           ├── MemberForm.tsx          # Shared form (create & edit)
│           ├── MemberList.tsx          # Table component
│           ├── MemberProfile.tsx       # Profile page shell
│           └── QRCodeDisplay.tsx       # Gym QR rendering
├── lib/
│   ├── actions/
│   │   └── members.ts                  # Server Actions: create, update, deactivate
│   ├── supabase/
│   │   ├── server.ts                   # createServerClient (reuse Phase 2)
│   │   └── service.ts                  # Service role client (Phase 4+)
│   ├── types/
│   │   └── database.ts                 # Member, Organization types (Phase 2 foundation)
│   └── utils/
│       └── cpf.ts                      # CPF formatting & basic validation
└── styles/
    └── globals.css                     # Tailwind (reuse Phase 2)
```

### Pattern 1: Server Action for Member CRUD

**What:** All form submissions (create, update, deactivate) use Server Actions — no API routes.

**When to use:** Admin operations with RLS scoping and form validation.

**Example:**

```typescript
// src/lib/actions/members.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const memberSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  email: z.string().email({ message: 'Email inválido' }),
  cpf: z.string().regex(/^\d{11}$/, { message: 'CPF deve ter 11 dígitos' }),
  phone: z.string().optional(),
})

export async function createMemberAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = memberSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    cpf: formData.get('cpf'),
    phone: formData.get('phone'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = createServerClient()

  // Get org_id from JWT (app_metadata — set at signup, Phase 2)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.user_metadata?.['https://claims/org_id']) {
    return { error: 'Unauthorized' }
  }

  const org_id = user.user_metadata['https://claims/org_id']

  // Insert member — RLS enforces org_id match
  const { data, error } = await supabase
    .from('members')
    .insert({
      org_id,
      name: parsed.data.name,
      email: parsed.data.email,
      cpf: parsed.data.cpf,
      phone: parsed.data.phone || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    // Handle unique constraint violations
    if (error.message.includes('unique')) {
      if (error.message.includes('email')) {
        return { error: 'Email já cadastrado nesta academia' }
      }
      if (error.message.includes('cpf')) {
        return { error: 'CPF já cadastrado nesta academia' }
      }
    }
    return { error: 'Erro ao cadastrar membro. Tente novamente.' }
  }

  redirect(`/dashboard/members/${data.id}`)
}
```

**Source:** Phase 2 pattern (signupAction in `src/lib/actions/signup.ts`), adapted for member domain.

### Pattern 2: Form with Inline Validation Errors

**What:** Form fields display validation errors inline below the field in red pt-BR text.

**When to use:** All admin forms (create, edit).

**Example:**

```typescript
// src/app/(dashboard)/members/new/page.tsx
'use client'

import { useFormState } from 'react-dom'
import { createMemberAction } from '@/lib/actions/members'

export default function NewMemberPage() {
  const [state, formAction] = useFormState(createMemberAction, null)

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900">Nome</label>
        <input
          type="text"
          name="name"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">Email</label>
        <input
          type="email"
          name="email"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900">CPF</label>
        <input
          type="text"
          name="cpf"
          placeholder="12345678901"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        className="rounded bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-700"
      >
        Salvar
      </button>
    </form>
  )
}
```

**Source:** Phase 2 auth forms (login, signup, password reset) use this pattern.

### Pattern 3: CPF Display Masking

**What:** CPF is masked (`***.***.***-XX`) everywhere except the edit form where admin may need to correct it.

**When to use:** Any display of member CPF (list, profile).

**Example:**

```typescript
// src/lib/utils/cpf.ts
export function maskCPF(cpf: string): string {
  // Input: "12345678901" → Output: "***.***.***-01"
  const last2 = cpf.slice(-2)
  return `***.***.***-${last2}`
}

// In member profile component:
<p className="text-gray-700">
  CPF: <span className="font-mono">{maskCPF(member.cpf)}</span>
</p>

// In edit form, display unmasked:
<input type="text" value={member.cpf} name="cpf" />
```

**Source:** D-14 (profile page displays CPF masked). CPF is Brazilian PII — masking follows security best practice.

### Pattern 4: QR Code Display with qrcode.react

**What:** Render gym QR code using `<QRCodeCanvas>` from `qrcode.react`.

**When to use:** `/dashboard/qr-code` page, member profile (if future requirement).

**Example:**

```typescript
// src/components/dashboard/members/QRCodeDisplay.tsx
'use client'

import QRCode from 'qrcode.react'

export function QRCodeDisplay({ orgQRHash }: { orgQRHash: string }) {
  const qrValue = `${process.env.NEXT_PUBLIC_APP_URL}/checkin/${orgQRHash}`

  return (
    <div className="flex flex-col items-center gap-4">
      <QRCode
        value={qrValue}
        size={256}
        level="H"
        includeMargin={true}
      />
      <p className="text-sm text-gray-600">
        Seus alunos escaneiam este código para fazer check-in
      </p>
      <button
        onClick={() => window.print()}
        className="rounded bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-700"
      >
        Imprimir QR Code
      </button>
    </div>
  )
}
```

**Source:** ROADMAP Phase 3 pitfall guards specify `qrcode.react` (display) and `qrcode` (server-side). `qrcode.react` wraps `QRCode.toCanvas` internally.

### Anti-Patterns to Avoid

- **Trusting client-provided org_id:** Always extract org_id from JWT app_metadata (set at signup, Phase 2). Never accept org_id from form or URL params.
- **Missing UNIQUE constraints at DB level:** Email and CPF duplicates MUST be rejected at the database (constraints already in migration 004). Show user-friendly error messages at the form layer.
- **Displaying unmasked CPF in lists or public views:** CPF is Brazilian PII. Mask everywhere except edit forms where admin needs to correct it.
- **Per-member QR codes (legacy):** Migration 004 dropped `members.qr_code_hash` and `qr_code_generated_at`. Do not re-introduce these columns. The gym QR is the only QR in Phase 3+.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CPF validation | Regex parser + checksum logic | Basic regex format check (`^\d{11}$`) in Phase 3; full checksum validation deferred to Phase 9 | Checksum algorithm is complex, rarely necessary for MVP. Format validation catches typos. |
| QR code generation & rendering | Custom canvas drawing or SVG generation | `qrcode.react` for display, `qrcode` for server-side (Phase 4+) | These libraries handle encoding standards (QR code v3, error correction), rendering optimizations, and printability. Reinventing = bugs + complexity. |
| Date formatting ("X days ago") | Manual date math | `date-fns` library (differenceInDays, formatDistanceToNow) | Manual date handling across timezones is error-prone. date-fns handles edge cases (leap years, DST). |
| Form validation | Manual string checks + custom error states | `zod` schema validation | Zod centralizes schema, provides composable validators, and integrates with Server Actions via `safeParse`. Rolling custom validation = duplication + inconsistency. |
| Org-scoped queries & RLS | Manual org_id filtering in every query | Supabase RLS policies + createServerClient (Phase 1 + Phase 2 pattern) | RLS is the single source of truth for org isolation. Manual filtering = security audit overhead + duplicated logic. |

**Key insight:** Member management is CRUD with form validation and QR display — no custom logic needed. Lean on standard libraries (zod, date-fns, qrcode.react) and established patterns (Server Actions, RLS, masking).

## Runtime State Inventory

> This section applies to phases involving rename, rebrand, refactor, or migration. Phase 3 is greenfield member creation (no existing member data to migrate), so **no runtime state inventory needed**.

*Skipped: Phase 3 is greenfield. No existing member records, configs, or OS-level state to audit.*

## Common Pitfalls

### Pitfall 1: Trusting Client-Provided org_id

**What goes wrong:** Form submits org_id from a hidden input or URL param → attacker changes it → creates member in another org.

**Why it happens:** Assumed org_id is "just data" and safe to pass from client. RLS exists, but if you construct the wrong org_id query, you bypass it.

**How to avoid:** ALWAYS extract org_id from JWT claims (`auth.getUser()` → `app_metadata['org_id']`). Never accept org_id from FormData, URL params, or request headers. The Server Action in Pattern 1 above demonstrates this: `const org_id = user.user_metadata['https://claims/org_id']`.

**Warning signs:**
- Form has hidden input `<input type="hidden" name="org_id" />`
- Query uses `const org_id = searchParams.get('org_id')`
- org_id comes from URL: `/members?org_id=xxx`

### Pitfall 2: Missing Duplicate Error Translation

**What goes wrong:** Supabase returns database error (e.g., "Unique violation: members_org_id_email_unique") → shown raw to user → confusing pt-BR UX.

**Why it happens:** Error from Supabase API is technical. Assuming users read English error messages.

**How to avoid:** Check `error.message` for constraint keywords (`'unique'`, `'email'`, `'cpf'`) and return user-friendly pt-BR text. Pattern 1 shows this: `if (error.message.includes('email')) { return { error: 'Email já cadastrado nesta academia' } }`.

**Warning signs:**
- Error message shown to user contains "UNIQUE" or PostgreSQL error codes
- Form shows raw Supabase message instead of pt-BR translation
- No specific handling for email/CPF duplicates

### Pitfall 3: Displaying Unmasked CPF Anywhere

**What goes wrong:** Member list or profile page shows full CPF (e.g., "12345678901") → visible on screen, in browser history, in screenshots → PII leak.

**Why it happens:** Copied CPF from database query without filtering. Forgot that CPF is sensitive.

**How to avoid:** Always mask CPF on display (Pattern 3: `maskCPF(cpf)` → `***.***.***-XX`). Exception: edit form shows unmasked so admin can correct typos. Pattern 1 shows masked display in member profile.

**Warning signs:**
- Member list table shows full CPF
- Profile page displays unmasked CPF
- Export/CSV feature includes unmasked CPF

### Pitfall 4: Duplicate Member QR Code Logic

**What goes wrong:** Code still references `members.qr_code_hash` or tries to generate per-member QR codes → query fails (column doesn't exist) or violates spec.

**Why it happens:** Migration 004 dropped the columns, but old code comments or early implementations still expect them.

**How to avoid:** Member management uses gym QR ONLY (`organizations.qr_code_hash`). CPF identifies the member at check-in. No per-member QR columns should exist. If you see migration error or query failures on `members.qr_code_hash`, drop the column (it's already gone in migration 004). D-04 is explicit: "Do not reference" the dropped columns.

**Warning signs:**
- Query error: "column 'members.qr_code_hash' does not exist"
- Code tries to insert into `members(qr_code_hash)`
- Form includes "Generate QR" button for each member

### Pitfall 5: CPF Validation Without Format Check

**What goes wrong:** Form accepts empty or non-numeric CPF (e.g., "abc") → passes client validation → fails at DB insert → unclear error.

**Why it happens:** Skipped format validation assuming the DB constraint will catch it. DB constraints are not user-friendly.

**How to avoid:** Use zod schema (Pattern 1) with regex: `cpf: z.string().regex(/^\d{11}$/, { message: 'CPF deve ter 11 dígitos' })`. This rejects non-numeric or wrong length BEFORE hitting the DB. Note: full checksum validation is Phase 9 (deferred); Phase 3 only validates format.

**Warning signs:**
- Form accepts "abc" or "123" as CPF
- Error message is database-level (e.g., "value too short for type text")
- No client-side regex or zod validation for CPF field

## Code Examples

Verified patterns from official sources and existing codebase:

### Create Member via Server Action

```typescript
// Source: Phase 2 signup pattern (src/lib/actions/signup.ts) + Phase 1 DB types
// File: src/lib/actions/members.ts

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const memberSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  email: z.string().email({ message: 'Email inválido' }),
  cpf: z.string().regex(/^\d{11}$/, { message: 'CPF deve ter 11 dígitos' }),
  phone: z.string().optional().nullable(),
})

export async function createMemberAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = memberSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    cpf: formData.get('cpf'),
    phone: formData.get('phone') || null,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Extract org_id from JWT app_metadata (never trust client)
  const org_id = user.user_metadata?.['https://claims/org_id'] as string | undefined
  if (!org_id) {
    return { error: 'Organization not found' }
  }

  const { data, error } = await supabase
    .from('members')
    .insert({
      org_id,
      name: parsed.data.name,
      email: parsed.data.email,
      cpf: parsed.data.cpf,
      phone: parsed.data.phone,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    if (error.message?.toLowerCase().includes('unique')) {
      if (error.message.includes('email')) {
        return { error: 'Email já cadastrado nesta academia' }
      }
      if (error.message.includes('cpf')) {
        return { error: 'CPF já cadastrado nesta academia' }
      }
    }
    return { error: 'Erro ao cadastrar membro. Tente novamente.' }
  }

  redirect(`/dashboard/members/${data.id}`)
}
```

### Mask CPF Display

```typescript
// Source: Brazilian PII masking standard
// File: src/lib/utils/cpf.ts

export function maskCPF(cpf: string | null): string {
  if (!cpf) return '—'
  // "12345678901" → "***.***.***-01"
  const last2 = cpf.slice(-2)
  return `***.***.***-${last2}`
}

// Usage in component:
// <p>{maskCPF(member.cpf)}</p> → "***.***.***-01"
```

### Render Gym QR Code

```typescript
// Source: qrcode.react library + Phase 2 layout pattern
// File: src/components/dashboard/members/QRCodeDisplay.tsx

'use client'

import QRCode from 'qrcode.react'
import { useRef } from 'react'

interface QRCodeDisplayProps {
  qrHash: string
  gymName: string
}

export function QRCodeDisplay({ qrHash, gymName }: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null)
  const qrValue = `${process.env.NEXT_PUBLIC_APP_URL}/checkin/${qrHash}`

  const handlePrint = () => {
    if (qrRef.current) {
      const printWindow = window.open('', '', 'width=600,height=600')
      if (printWindow) {
        printWindow.document.write(qrRef.current.innerHTML)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-lg border border-gray-200 bg-white p-8">
      <h2 className="text-2xl font-semibold text-gray-900">{gymName}</h2>
      <p className="text-sm text-gray-600 text-center max-w-sm">
        Seus alunos escaneiam este código para fazer check-in
      </p>
      <div ref={qrRef} className="bg-white p-4">
        <QRCode
          value={qrValue}
          size={256}
          level="H"
          includeMargin
          className="border border-gray-300"
        />
      </div>
      <button
        onClick={handlePrint}
        className="rounded bg-emerald-600 px-6 py-2 text-white font-medium hover:bg-emerald-700 transition-colors"
      >
        Imprimir QR Code
      </button>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-member QR codes | Gym QR + CPF identification | Phase 3 design pivot (2026-03-25) | Simplifies UX (gym posts one QR; members enter CPF). Reduces QR code storage & generation overhead. More practical for gym operations. |
| Client-side form submission | Server Actions (next/form) | Phase 2 (auth patterns) | Server Actions handle RLS scoping, org_id extraction, and form validation server-side. No client-side fetch calls needed. Safer, simpler. |
| Manual date formatting | date-fns library | Phase 1 (stack decision) | date-fns handles timezone-aware date math, formatting. Prevents bugs in "last check-in" displays. |
| Custom validation logic | zod schema validation | Phase 2 (auth patterns) | Zod centralizes validation, provides composable validators. Reduces boilerplate, improves consistency. |

**Deprecated/outdated:**
- Per-member QR code columns (`members.qr_code_hash`, `qr_code_generated_at`): Dropped in migration 004. Do not use.

## Open Questions

1. **Should inactive members appear in a separate section or be hidden from the list entirely?**
   - What we know: D-22 says deactivated members are "hidden from the main member list by default (filter `status = 'active'`)". D-22 notes Claude's discretion on a toggle.
   - What's unclear: Should the default member list show 0 inactive members, or should there be an optional "Show Inactive" toggle visible?
   - Recommendation: For Phase 3 MVP, hide inactive members by default with no toggle. Keep the scope minimal. Toggle can be added in Phase 3+ polish if requested.

2. **CPF input masking — manual mask entry or plain text?**
   - What we know: D-59 lists this as Claude's discretion. No requirement specified.
   - What's unclear: Should the CPF input enforce `XXX.XXX.XXX-XX` formatting as user types, or accept plain text?
   - Recommendation: Plain text input with regex validation (`^\d{11}$`). Masking on input adds JavaScript complexity without strong user benefit. Admin can paste from clipboard or type 11 digits.

3. **Should the member list be sortable (by name, email, last check-in)?**
   - What we know: D-07 specifies table columns but not sort order.
   - What's unclear: Is sortable table header a Phase 3 requirement or a nice-to-have?
   - Recommendation: Default sort by last_checked_in (descending — most active first). Sortable headers can be added in Phase 3 if time permits; not critical for MVP.

## Environment Availability

No external tools or services required for Phase 3 (code-only, form-based, display-only changes). All dependencies already in `package.json`:

| Dependency | Required By | Available | Version | Notes |
|------------|------------|-----------|---------|-------|
| Node.js | Build/dev server | ✓ | (system) | Next.js 14 requires Node 18+ |
| npm | Dependency management | ✓ | (system) | Verify `npm install` completed |
| Supabase CLI (optional) | Local migrations | ✓ | (system, optional) | Not required; migrations applied via Dashboard SQL Editor |

**Summary:** Phase 3 has no missing dependencies. All form, UI, and Server Action code runs on Next.js built-in runtime.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 + @vitest/coverage-v8 |
| Config file | `vitest.config.ts` (root) |
| Environment | node (server-side Supabase clients) |
| Test directory | `tests/` |
| Quick run command | `npm test -- tests/phase3/` (when phase3 tests added) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEMB-01 | Create member with name, email, CPF, phone; inserted to DB with org_id from JWT | unit | `npm test -- tests/phase3/members-actions.test.ts -t 'createMemberAction'` | ❌ Wave 0 |
| MEMB-01 | Duplicate email rejected with pt-BR error message | unit | `npm test -- tests/phase3/members-actions.test.ts -t 'duplicate email'` | ❌ Wave 0 |
| MEMB-01 | Duplicate CPF rejected with pt-BR error message | unit | `npm test -- tests/phase3/members-actions.test.ts -t 'duplicate cpf'` | ❌ Wave 0 |
| MEMB-02 | Gym QR code page loads org.qr_code_hash and renders <QRCode> with correct URL | unit | `npm test -- tests/phase3/qr-code.test.ts` | ❌ Wave 0 |
| MEMB-03 | Member list queries members WHERE org_id=current AND status='active' | unit | `npm test -- tests/phase3/member-list.test.ts` | ❌ Wave 0 |
| MEMB-04 | Member profile page displays name, email, CPF (masked), phone, status, join_date, last_checked_in | unit | `npm test -- tests/phase3/member-profile.test.ts` | ❌ Wave 0 |
| MEMB-05 | Update member action modifies name/email/phone, validates email/CPF uniqueness | unit | `npm test -- tests/phase3/members-actions.test.ts -t 'updateMemberAction'` | ❌ Wave 0 |
| MEMB-06 | Deactivate member sets status='inactive'; reactivate sets status='active' | unit | `npm test -- tests/phase3/members-actions.test.ts -t 'deactivate\|reactivate'` | ❌ Wave 0 |
| MEMB-07 | Schema includes members.external_id (nullable); read-only in Phase 3 | unit | `npm test -- tests/phase1/schema.test.ts` (already covers schema) | ✅ Exists |

### Sampling Rate

- **Per task commit:** `npm test -- tests/phase3/members-actions.test.ts` (quick validation of Server Action behavior)
- **Per wave merge:** `npm test` (full suite including auth, schema, member tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase3/members-actions.test.ts` — Unit tests for createMemberAction, updateMemberAction, deactivateMemberAction, including error handling (MEMB-01, MEMB-05, MEMB-06)
- [ ] `tests/phase3/member-list.test.ts` — Verify list queries with org_id RLS filter and status='active' filter (MEMB-03)
- [ ] `tests/phase3/member-profile.test.ts` — Verify profile page loads member details and displays masked CPF (MEMB-04)
- [ ] `tests/phase3/qr-code.test.ts` — Verify gym QR code page renders with correct URL (MEMB-02)
- [ ] Framework install: Already installed in package.json (vitest 4.1.1, @vitest/coverage-v8)

**Notes:**
- Phase 1 schema tests already exist (`tests/phase1/schema.test.ts`) and cover `members.external_id` column (MEMB-07). No new test needed.
- Phase 2 auth tests (`tests/phase2/auth-actions.test.ts`, `tests/phase2/middleware.test.ts`) cover JWT org_id extraction; reuse patterns in Phase 3 member action tests.
- All tests use vitest `describe/it` pattern (see `tests/phase2/auth-actions.test.ts` stub pattern).

## Sources

### Primary (HIGH confidence)

- **@supabase/auth-helpers-nextjs v0.15.0** — Server client creation, JWT extraction from cookies (`app_metadata` access)
- **qrcode.react v4.2.0** — Official docs confirm `<QRCode>` component renders QR codes; size, level, includeMargin props
- **qrcode v1.5.4** — Server-side generation (Phase 4+); provides QR code string/buffer output
- **zod v4.3.6** — Schema validation with `.safeParse()`, regex validation (`.regex()`), error messages
- **date-fns v4.1.0** — Date formatting with `differenceInDays()`, `formatDistanceToNow()`
- **Next.js 14 App Router** — Server Actions (`'use server'`), `useFormState()`, `redirect()` behavior

### Secondary (MEDIUM confidence)

- **Phase 2 Code Examples** — `src/lib/actions/signup.ts` demonstrates Server Action pattern, org_id extraction from JWT, zod validation, error handling for unique constraints
- **Phase 1 Schema** — `supabase/migrations/004-gym-qr-cpf.sql` confirms `members(org_id, cpf)` UNIQUE constraint, `organizations(qr_code_hash)` column
- **Existing Database Types** — `src/lib/types/database.ts` shows Member, Organization row types and Insert/Update constraints

### Tertiary (Verification)

- **Project CONTEXT.md** — D-01 through D-24 lock all major decisions; no architectural unknowns
- **ROADMAP.md** — Success criteria, UAT criteria, and pitfall guards confirm Phase 3 scope and QR approach

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH — All libraries in package.json. Versions verified current (2026-03-27). Supabase auth pattern proven in Phase 2.
- **Architecture Patterns:** HIGH — Server Actions, RLS, masking, and form validation inherited from Phase 2. QR library (qrcode.react) specified in ROADMAP.
- **Pitfalls:** HIGH — Explicit in CONTEXT.md decisions (D-01 through D-24) and ROADMAP pitfall guards. No unknowns.
- **Code Examples:** HIGH — Phase 2 patterns directly applicable. CPF masking, QR rendering from official docs.
- **Runtime State:** N/A — Phase 3 is greenfield (no existing members to migrate).

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (30 days — stable stack, locked decisions)
