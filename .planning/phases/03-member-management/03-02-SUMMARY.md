---
phase: 03-member-management
plan: 02
subsystem: dashboard-ui
tags: [sidebar, members, server-component, table, tailwind]
dependency_graph:
  requires: []
  provides: [member-list-page, sidebar-qr-link]
  affects: [src/components/dashboard/SidebarNav.tsx, src/app/(dashboard)/members/page.tsx]
tech_stack:
  added: []
  patterns: [Next.js Server Component async page, Supabase server client with JWT app_metadata org_id]
key_files:
  created:
    - src/app/(dashboard)/members/page.tsx
  modified:
    - src/components/dashboard/SidebarNav.tsx
decisions:
  - SidebarNav QR Code link added between Membros and Alertas per UI spec
  - Server Component reads org_id from JWT app_metadata (consistent with Phase 1 RLS design)
  - nullsFirst: true ensures never-checked-in members appear at top of list (churn-risk visibility)
  - Only Name cell carries the Link to /dashboard/members/{id} (D-07)
metrics:
  duration_seconds: 75
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 2
---

# Phase 03 Plan 02: Member List Page and SidebarNav QR Link Summary

**One-liner:** Server Component member list at /dashboard/members with active filter, status badges, and QR Code nav link added to SidebarNav.

## What Was Built

### Task 1: SidebarNav QR Code link
Updated `src/components/dashboard/SidebarNav.tsx` to insert `{ href: '/dashboard/qr-code', label: 'QR Code' }` between Membros and Alertas. No other changes to the file.

**Final link order:** Membros → QR Code → Alertas → Configurações

### Task 2: Member list page
Created `src/app/(dashboard)/members/page.tsx` as a Next.js 14 Server Component:
- Reads `org_id` from `user?.app_metadata?.org_id` (JWT-based, consistent with RLS)
- Queries `members` table filtered by `org_id` and `status = 'active'`, ordered by `last_checked_in ASC NULLS FIRST`
- Renders page header with title "Membros" and "+ Novo Membro" button (links to `/dashboard/members/new`)
- Renders member table (Nome, Email, Último check-in, Status) when data exists
- Renders empty state "Nenhum membro cadastrado" when no active members
- Status badges: Ativo (emerald-100/emerald-700), Inativo (gray-100/gray-500)
- `formatLastCheckin` imported from `@/lib/utils/members` (created by Plan 01)

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | af2899a | feat(03-02): add QR Code link to SidebarNav between Membros and Alertas |
| 2 | 32001c9 | feat(03-02): create member list page at /dashboard/members |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

`formatLastCheckin` is imported from `@/lib/utils/members` which is created by Plan 03-01 (parallel plan). If this plan merges before Plan 01, the import will resolve once both plans merge. Not a functional stub — the import path is correct.

## Self-Check: PASSED

- `src/components/dashboard/SidebarNav.tsx` - FOUND with qr-code link at correct position
- `src/app/(dashboard)/members/page.tsx` - FOUND with all acceptance criteria met
- Commit af2899a - FOUND
- Commit 32001c9 - FOUND
