# Technology Stack

**Project:** GymRetain (Gym Retention SaaS)
**Researched:** 2026-03-25
**Scope:** Validate chosen stack and fill critical gaps (QR generation, email templates, cron jobs on free tier)

## Recommended Stack

### Core Framework & Frontend

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 14.x (App Router) | Full-stack web framework | Industry standard 2025; server actions eliminate backend separation; perfect for SaaS admin panels | HIGH |
| TypeScript | 5.x | Type safety | Prevents runtime errors in admin logic; critical for data integrity (QR codes, email lists, check-in records) | HIGH |
| Tailwind CSS | 3.4+ | Utility-first CSS | Fast iteration on admin UI; no build complexity; excellent for responsive admin dashboards | HIGH |
| React | 18.x+ | UI library | Bundled with Next.js 14; hooks for admin state management | HIGH |

### Authentication & Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase | Latest (2025) | PostgreSQL + Auth + Realtime | Free tier covers MVP needs; RLS protects single-tenant data; no backend code required; simple email-password auth | HIGH |
| Supabase Auth | Built-in | Admin login (email/password) | Native integration; no extra libraries; free tier includes unlimited users | HIGH |
| PostgreSQL | 14+ (Supabase managed) | Relational database | Mature; excellent for structured data (students, check-ins, email alerts); free tier: 500MB | HIGH |

### QR Code Generation & Display

| Technology | Version | Purpose | When | Confidence |
|------------|---------|---------|------|------------|
| `qrcode.react` | 1.0+ | Client-side QR code rendering | Display QR codes in admin panel for printing/saving | HIGH |
| `qrcode` (Node.js) | 1.5+ | Server-side QR generation | Generate and store QR codes during student creation; validation | HIGH |
| UUID v4 | Built-in (Node.js) | Generate unique QR code identifiers | Ensure uniqueness per student; cryptographically secure | HIGH |

**Installation:**
```bash
npm install qrcode.react qrcode uuid
```

**QR Code Strategy:**
- Generate QR code at student creation time (server-side with `qrcode` library)
- Store encoded QR string in database (`qr_code_data` field)
- Display in admin panel with `qrcode.react` for printing
- Check-in endpoint validates QR code without requiring login
- Rationale: Fixed QR code eliminates login friction for students; server-side generation ensures consistency

### Email & Notifications

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Resend | Latest (2025) | Transactional email service | Free tier: 100 emails/day (sufficient for MVP); native Next.js integration; simple API; no SMTP setup | HIGH |
| React Email | 0.x | Email template components | Write email templates as React components; ships with Resend; reduces template complexity | MEDIUM |
| `date-fns` | 3.x | Date formatting in email alerts | Format check-in history dates in alert emails; small footprint | HIGH |

**Installation:**
```bash
npm install resend react-email date-fns
```

**Email Strategy:**
- Resend API called from Next.js API Route or Server Action
- Email templates written as React components (React Email)
- Scheduled alert emails triggered by cron job (see "Cron & Scheduling" below)
- Free tier limit (100/day) is sufficient for MVP with <50 students (max 1 email per student per day)
- Rationale: Minimal setup; no authentication complexity; React-based templates reduce context switching

### Deployment & Hosting

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | Hobby tier (free) | Next.js deployment | First-class Next.js support; free tier handles MVP traffic; instant git deploys | HIGH |
| Vercel Postgres | Not needed (use Supabase) | Database hosting | Skip — Supabase is free and better for this use case | HIGH |

### Cron Jobs & Scheduled Tasks

| Solution | Status | Why/Why Not | Free Tier Cost |
|----------|--------|------------|-----------------|
| **Vercel Cron** (RECOMMENDED) | ✅ Use this | Native Next.js integration; runs on `vercel.json`; no external service | Free (3 invocations/day on Hobby) |
| Supabase Edge Functions + Cron | ⚠️ Fallback | Possible but less ergonomic with Next.js; requires webhook management | Free (500k requests/month) |
| External service (e.g., EasyCron, Uptime Robot) | ❌ Avoid | Introduces external dependency; harder to debug; overkill for MVP | Varies |

**Why Vercel Cron for MVP:**
- Runs as Route Handler at scheduled times
- Integrated with Next.js deployment pipeline
- Free tier allows 3 invocations per day (easily covers daily 6am alert check)
- No additional setup or external accounts needed
- Scales naturally with Supabase Edge Functions later

**Cron Implementation Pattern:**
```typescript
// app/api/cron/check-churn/route.ts
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify request is from Vercel
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Query Supabase for students inactive 7+ days
  // Send email alerts via Resend
  return new Response('OK', { status: 200 });
}
```

**Vercel cron configuration (`vercel.json`):**
```json
{
  "crons": [
    {
      "path": "/api/cron/check-churn",
      "schedule": "0 6 * * *"
    }
  ]
}
```

⚠️ **Free Tier Limitation:** Vercel Hobby tier only allows 3 cron invocations per day. For MVP (one daily check at 6am), this is sufficient. If multiple daily checks needed later, upgrade to Vercel Pro ($20/month) or migrate to Supabase Edge Functions.

### Testing & Development

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Jest | 29.x+ | Unit testing | Standard for JavaScript/TypeScript projects; good Supabase support | MEDIUM |
| React Testing Library | 14.x+ | Component testing | Test admin UI interactions (student creation, check-in list, email preview) | MEDIUM |
| Supabase Test Fixtures | Built-in | Database testing | Use Supabase local setup for integration tests | MEDIUM |
| TypeScript ESLint | Latest | Linting | Catch type and style issues before commit | HIGH |

**Installation (optional for MVP):**
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom eslint @typescript-eslint/eslint-plugin
```

## Alternatives Considered & Why Not

| Category | Recommended | Alternative | Why Not Used |
|----------|-------------|-------------|-------------|
| **Backend** | Supabase (backend-as-a-service) | Express + AWS RDS | Too much infrastructure for solo developer; Supabase RLS handles permissions natively |
| **QR Generation** | `qrcode` + `qrcode.react` | `qrcode.js` or `QRious` | Smaller bundle size; more maintained; better Next.js integration |
| **Email Service** | Resend | SendGrid / AWS SES | Resend has better Next.js DX; SendGrid costs more; SES requires more setup |
| **Email Templates** | React Email (JSX) | Handlebars / EJS | React components are more maintainable; no template language learning curve; already know React |
| **Scheduling** | Vercel Cron | node-cron | Vercel Cron is native to deployment; node-cron requires separate scheduler running (not suitable for serverless) |
| **CSS** | Tailwind CSS | Styled Components / Chakra | Tailwind is faster to iterate; no runtime overhead; better for admin UI velocity |
| **Database** | Supabase PostgreSQL | Firebase Firestore | PostgreSQL scales better; RLS more flexible; better for relational data (students ↔ check-ins) |
| **Hosting** | Vercel | Netlify / Railway | Vercel best supports Next.js App Router; closer integration with Supabase |

## Package Installation Guide

### Initial Setup (Phase 1 - Minimum Viable)

```bash
# Next.js 14 with TypeScript
npx create-next-app@latest gymretain --typescript --tailwind --eslint

cd gymretain

# Core dependencies
npm install \
  @supabase/supabase-js \
  @supabase/auth-helpers-nextjs \
  qrcode \
  qrcode.react \
  uuid \
  resend \
  react-email

# Dev dependencies
npm install -D \
  typescript \
  @types/node \
  @types/react
```

### Environment Variables Required

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
RESEND_API_KEY=<your-resend-key>
CRON_SECRET=<generate-random-string>
```

### Phase 2+ Optional Enhancements

```bash
# Analytics (later)
npm install @vercel/analytics

# Form validation (later)
npm install zod react-hook-form

# Testing (later)
npm install -D jest @testing-library/react @testing-library/jest-dom
```

## Critical Validation Points

### ✅ Stack Validation Summary

| Component | Chosen | Validated | Rationale |
|-----------|--------|-----------|-----------|
| Framework | Next.js 14 | ✅ YES | Standard 2025 SaaS stack; App Router is mature |
| Language | TypeScript | ✅ YES | Prevents QR/email data errors; critical for reliability |
| CSS | Tailwind CSS | ✅ YES | Fast admin UI iteration; industry standard |
| Backend | Supabase | ✅ YES | Free tier sufficient; no backend code needed |
| Auth | Supabase Auth | ✅ YES | Simple email-password; integrated with DB |
| Email | Resend | ✅ YES | Free tier (100/day) covers MVP; excellent DX |
| Hosting | Vercel | ✅ YES | Native Next.js support; free tier adequate |
| QR Code | `qrcode` + `qrcode.react` | ✅ YES | Lightweight; well-maintained; industry standard |
| Cron | Vercel Cron | ✅ YES | Free tier sufficient (3/day) for MVP |

### ⚠️ Known Constraints

1. **Vercel Cron Free Tier (3 invocations/day):** Sufficient for daily 6am alert check. If multiple alerts needed per day, upgrade to Pro or migrate to Supabase Edge Functions.

2. **Resend Free Tier (100 emails/day):** Sufficient for <50 students sending 1 alert each daily. If alerts increase, add check (daily max per student).

3. **Supabase Free Tier (500MB):** Sufficient for MVP. Student list + 1 year check-in history for 100 students ≈ 50MB.

4. **Single-tenant architecture:** Supports one gym per deployment. Multi-tenant requires schema redesign (future phase).

## Sources & References

### Official Documentation (HIGH Confidence)
- Next.js 14 App Router: https://nextjs.org/docs/app
- Supabase Docs: https://supabase.com/docs
- Resend Docs: https://resend.com/docs
- Vercel Cron: https://vercel.com/docs/crons
- TypeScript Handbook: https://www.typescriptlang.org/docs/

### Library Documentation (HIGH Confidence)
- qrcode npm: https://www.npmjs.com/package/qrcode
- qrcode.react npm: https://www.npmjs.com/package/qrcode.react
- react-email: https://react.email/docs/introduction
- uuid npm: https://www.npmjs.com/package/uuid

### Standards & Best Practices (MEDIUM Confidence)
- Next.js 2025 best practices (training data cutoff Feb 2025)
- SaaS deployment patterns on Vercel/Supabase (industry standard)
- Email deliverability with Resend (production-tested)

## Notes for Roadmap

### Phase 1: Foundation
- Set up Next.js 14 + Supabase + Vercel deployment
- Implement admin auth (Supabase email-password)
- Build QR code generation & student creation
- Verify Resend email sending works
- **Critical:** Configure `CRON_SECRET` environment variable for later cron implementation

### Phase 2: Check-in System
- Build QR code check-in endpoint (no auth required)
- Implement check-in history visualization
- Test with real students

### Phase 3: Churn Detection & Alerts
- Implement daily cron job with Vercel Cron
- Query students inactive 7+ days
- Send alert emails via Resend
- **Test free tier limits** (3 cron invocations/day, 100 emails/day)

### Phase 4+: Enhancements
- Multi-gym support (requires schema redesign)
- Configurable churn thresholds
- Student contact history UI
- Analytics & insights

---

**Last Updated:** 2026-03-25
**Confidence Assessment:**
- Stack validation: HIGH (all choices align with 2025 industry standards)
- QR code libraries: HIGH (well-established, stable versions)
- Email setup: HIGH (Resend + React Email proven combination)
- Cron strategy: MEDIUM (Vercel Cron free tier constraint requires workaround planning for scale)
- Overall: HIGH for MVP implementation
