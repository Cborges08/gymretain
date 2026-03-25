# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** O dono da academia sabe, sem esforço, quais alunos estão sumindo — e recebe um empurrão para agir antes de perdê-los.
**Current focus:** Phase 1 — Project Scaffold & Database Foundation

## Current Status

**Phase:** 0 (Pre-execution — roadmap ready)
**Milestone:** MVP v1.0
**Next action:** `/gsd:plan-phase 1`

## Milestone Progress

- [ ] Phase 1: Project Scaffold & Database Foundation
- [ ] Phase 2: Admin Authentication
- [ ] Phase 3: Member Management
- [ ] Phase 4: QR Check-In Flow
- [ ] Phase 5: Dashboard — Member Overview
- [ ] Phase 6: Dashboard — Actions & Churn Fallback
- [ ] Phase 7: Churn Detection Engine
- [ ] Phase 8: Email Alerts & Delivery
- [ ] Phase 9: Polish, Edge Cases & Launch Hardening

## Notes

- Developer: solo, 10-20h/semana
- Free tier only: Vercel hobby, Supabase free, Resend free (100 emails/dia)
- Critical: cron job (Phase 7+) DEVE usar SUPABASE_SERVICE_ROLE_KEY
- Futura integração com sistema Fácil planejada (campo external_id reservado em members)

---
*State initialized: 2026-03-25*
