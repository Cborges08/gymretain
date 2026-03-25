# Feature Landscape: Gym Retention SaaS

**Domain:** Gym/fitness studio retention and engagement SaaS
**Researched:** 2026-03-25
**MVP Focus:** QR code check-in + churn alerts for independent gyms
**Confidence Level:** MEDIUM (based on training data; no live market research available)

---

## Table Stakes

Features users expect. Missing these = product feels incomplete for gym owners managing member retention.

| Feature | Why Expected | Complexity | MVP? | Notes |
|---------|--------------|------------|------|-------|
| **Secure admin login** | Gym owner needs to own their data; fundamental trust | Low | YES | Email/password via Supabase Auth. Single-tenant MVP only. |
| **Member check-in via QR** | Core value prop; members must be able to check in without friction | Low-Med | YES | Unique QR per member, scannable without login or app. |
| **Member roster management** | Admin must add/manage members somewhere | Low | YES | Name, email, auto-generate QR code. Manual entry for MVP. |
| **Check-in history visibility** | Admin must see who checked in when (basic audit trail) | Low | YES | Per-member check-in log, sortable by date. |
| **Churn alerts (7+ days)** | Core value prop; alert when member goes silent | Low | YES | Email notification to admin when threshold crossed. |
| **Frequency/attendance overview** | Admin needs to see "who's active, who's dormant" at a glance | Med | YES | Dashboard showing last check-in, check-in count, attendance trend. |
| **Alert dismissal/silence** | Admin needs to quiet repeated alerts after taking action | Low | YES | Mark member as "contacted" or snooze alerts. |
| **Email to admin** | Default notification channel for small gym owners (no SMS/push) | Low | YES | Resend integration for transactional emails. |
| **Data persistence** | Member data and check-ins must survive restarts | Low | YES | Supabase PostgreSQL backend. |

---

## Differentiators

Features that set product apart from generic gym software. Not expected upfront, but valued in market.

| Feature | Value Proposition | Complexity | MVP Phase | Notes |
|---------|-------------------|------------|-----------|-------|
| **Smart churn reasons/context** | Alert email includes member's check-in history + gym owner tips for re-engagement | Med | Phase 2 | E.g., "John last checked in 10 days ago. He was coming 3x/week. Try: personal text, free trial class." |
| **Configurable churn threshold** | Owner sets their own "alert after X days" instead of hardcoded 7 | Low | Phase 2 | Data model supports it (threshold in gym_settings table). |
| **Batch member import** | Upload CSV instead of adding one by one | Med | Phase 2 | Accelerates onboarding for gyms with 50+ members. |
| **Fácil integration** | Auto-import members from gym's existing Fácil account (if they use it) | High | Phase 3+ | Removes manual entry pain for digitized gyms. Requires Fácil API partnership. |
| **Member re-engagement workflow** | One-click "send personal message to John" template with pre-filled context | Med | Phase 2-3 | Turns alert into action. Reduces friction between alert and actual outreach. |
| **Attendance trends/reports** | "John's attendance dropped 40% last month" with visual chart | Med | Phase 2 | Identifies churn pattern before member disappears entirely. |
| **Anonymous QR (no account needed for member)** | Zero friction for member; gym controls all data | Low | YES | MVP already implements this. Huge differentiator vs systems requiring member login. |
| **Free tier generosity** | 100+ members at no cost (Supabase + Resend free limits) | N/A | YES | Competes on accessibility; MVP uses free tiers exclusively. |
| **Instant, no-install check-in** | Member scans QR, check-in happens in <1 second; no app, no account | Low | YES | Better UX than apps requiring signup. Already MVP scope. |

---

## Anti-Features

Features to explicitly NOT build (at least in MVP/Phase 1-2).

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Mobile app for members** | Out of scope per PROJECT.md. Web QR scan is zero-friction and works on any phone camera. | Use responsive web for QR check-in. App is Phase 4+ roadmap. |
| **Member login/account** | Defeats core value prop (zero-friction check-in). Adds auth complexity, churn. | Keep check-in anonymous via QR. Optional future: member dashboard (Phase 3+) if needed. |
| **Automated outreach (SMS/push)** | Requires carrier integration, costs money, legal complexity (SMS compliance). | Stick with email alerts to gym owner. Owner decides *when/how* to message members. |
| **Payment processing/billing** | Out of scope. No recurring billing, no seat-based pricing, no Stripe integration. | Keep free tier. Monetization is Phase 5+ decision. |
| **Multi-tenant (saas.site/gym1, saas.site/gym2)** | Adds auth/RLS complexity for solo dev. Single-tenant per instance is faster to ship. | Deploy separate instances per gym customer (cheap on Vercel). Multi-tenant Phase 4+. |
| **Inventory/class scheduling** | Out of scope. Gym retention is the problem to solve; avoid scope creep. | Partner with dedicated class/scheduling software later. |
| **Social features (leaderboards, challenges)** | Adds gamification complexity. Different use case (engagement vs retention). | Focus on retention (preventing churn). Engagement is Phase 3+ if validated. |
| **AI/ML recommendations** | Out of scope. "Predict who'll churn" adds data science complexity, training overhead. | Rule-based alerts (7 days) are sufficient for MVP. ML is Phase 3+ if data exists. |
| **Integrations (Stripe, Slack, Zapier)** | Each adds maintenance burden. MVP is focused and simple. | Email + web UI only. Integrations Phase 2-3 after MVP validation. |

---

## Feature Dependencies

```
Core MVP loop (Phase 1):
  Admin login
    ↓
  Member roster (add members)
    ↓
  Generate QR codes (automatic)
    ↓
  Member checks in via QR
    ↓
  Check-in logged to DB
    ↓
  Admin sees check-in history
    ↓
  System detects 7+ days inactivity
    ↓
  Alert email sent to admin
    ↓
  Admin marks member as "contacted"

Phase 2 additions:
  Configurable threshold → Alert system
  Attendance trends → Dashboard
  Re-engagement templates → Alert email

Phase 3+ additions:
  Fácil integration → Member roster
  Member re-engagement workflow → Alert email
  (Optional) Member login → Member dashboard
```

---

## MVP Recommendation

**MVP must include (Phase 1):**
1. Secure admin login
2. Member roster management (manual entry)
3. QR code generation per member
4. QR-based check-in (no member login)
5. Check-in history visibility
6. Churn alert when 7+ days inactive
7. Alert dismissal/snooze
8. Email notification to admin

**Why this set?**
- Solves the core problem: gym owner knows who's churning and gets a reminder to act
- Technically feasible for solo dev in sprints (uses only Next.js + Supabase + Resend, all in scope)
- No external dependencies or integrations needed
- Single-tenant deployment keeps auth/RLS simple
- Free tier constraints (Resend 100 emails/day) are respected

**Defer to Phase 2:**
- Smart re-engagement suggestions in alert email (moderate complexity, high value)
- Configurable churn threshold (low complexity, nice-to-have)
- Attendance trends visualization (medium complexity, validates if churn reduction works)

**Defer to Phase 3+:**
- Fácil integration (requires external API, partnership)
- Member re-engagement workflow (medium complexity, depends on Phase 2 validation)
- Batch import (useful but not critical for <100 members)

---

## Feature Complexity Estimates

| Feature | Dev Hours | Dev Phase | Rationale |
|---------|-----------|-----------|-----------|
| Admin login (Supabase Auth) | 4-6 | 1 | Supabase has native Next.js support; straightforward. |
| Member roster CRUD | 6-8 | 1 | Form validation, Supabase table, basic RLS. |
| QR generation (qrcode.react) | 2-3 | 1 | Library handles heavy lifting; print/save UX. |
| Check-in endpoint + validation | 4-6 | 1 | Route handler, rate limiting, DB upsert. |
| Check-in history view | 4-6 | 1 | Table component, filtering, sorting. |
| 7-day alert detection + email | 6-8 | 1 | Cron/scheduled task or trigger; Resend integration. |
| Dashboard (frequency overview) | 6-8 | 1 | Summary stats, charts (recharts), member status flags. |
| Mark as contacted (snooze) | 2-3 | 1 | DB flag, filter in alert query. |
| Config (threshold, gym name) | 2-3 | 1 | Settings form, Supabase gym_settings table. |
| **Phase 1 Total** | **38-51 hours** | — | ~4-5 weeks solo, 10-20h/week |
| Re-engagement email suggestions | 6-8 | 2 | Template logic, fetch member history, format. |
| Configurable threshold | 2-3 | 2 | Already in data model, just expose in UI. |
| Attendance trends chart | 6-8 | 2 | Data aggregation, recharts visualization. |
| **Phase 2 Total** | **14-19 hours** | — | ~2-3 weeks solo, 10-20h/week |
| Fácil API integration | 12-16 | 3 | OAuth flow, member import pipeline, error handling. |
| Member re-engagement workflow | 8-10 | 3 | Message template system, send flow, tracking. |
| **Phase 3 Total** | **20-26 hours** | — | ~3-4 weeks solo, 10-20h/week |

---

## Sources

**Knowledge Base (MEDIUM confidence — training data, no live verification):**
- Gym management software patterns (Zen Planner, Glofox, Mariana Tek, Kilo)
- Fitness retention strategies (NPS, check-in frequency, churn prediction)
- SaaS feature categorization (table stakes for B2B software)

**Project Context (HIGH confidence):**
- PROJECT.md requirements and constraints (already validated)
- MVP scope: QR check-in + 7-day churn alerts
- Tech stack: Next.js 14, Supabase, Resend (decided, not changing)

**Note on Confidence:** Web search unavailable during research. Findings based on training knowledge of gym/fitness SaaS ecosystem and patterns observed in products like Zen Planner, Glofox, and similar. Phase 2-3 recommendations should be validated with early customers after MVP launch.

---

## Questions for Phase 2 Research

- Do gym owners want SMS alerts or push notifications, or is email sufficient?
- Should re-engagement be a template system or full CRM integration?
- Is member portal dashboard (Phase 3+) important for retention, or just owner action?
- How many members does a typical indie gym have? (Affects free tier viability)
- What's the actual churn rate in gyms? (Affects alert threshold sensitivity)
