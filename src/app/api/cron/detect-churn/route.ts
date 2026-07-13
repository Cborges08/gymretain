/**
 * src/app/api/cron/detect-churn/route.ts
 * GET /api/cron/detect-churn — Nightly churn detection (Phase 7).
 *
 * Triggered by Vercel Cron at 6h UTC daily (see vercel.json). Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}` automatically when the CRON_SECRET
 * env var is set on the project.
 *
 * Auth: CRON_SECRET bearer token — validated BEFORE any DB access (ALRT-04).
 * The middleware exempts /api/cron/* from session auth for this reason.
 *
 * Uses createServiceRoleClient() (SUPABASE_SERVICE_ROLE_KEY) so the job can
 * read all active members regardless of RLS (ALRT-05 — anon key would
 * silently return zero rows).
 *
 * The detection logic lives in src/lib/utils/churn.ts and is shared with the
 * Phase 6 "Verificar Churn Agora" manual trigger (D-10 — no divergence).
 *
 * Requirements: ALRT-01, ALRT-04, ALRT-05
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { detectChurn } from '@/lib/utils/churn'
import { sendChurnAlerts } from '@/lib/email/send-churn-alerts'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Step 1 — Secret validation FIRST, before any DB query
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2 — Run churn detection across all orgs (execution logging: Pitfall 3)
  const startedAt = new Date().toISOString()
  console.log(`[cron:detect-churn] started at ${startedAt}`)

  try {
    const supabase = createServiceRoleClient()
    const result = await detectChurn(supabase)

    console.log(
      `[cron:detect-churn] detection done: ${result.membersChecked} members checked, ` +
        `${result.alertsCreated} alerts created, ${result.skippedExisting} skipped (existing alert)`
    )

    // Step 3 — Email pending alerts (Phase 8). Includes alerts created in
    // earlier runs that were beyond the 100/run batch cap (ALRT-07).
    const emails = await sendChurnAlerts(supabase)

    console.log(
      `[cron:detect-churn] emails: ${emails.sent} sent, ${emails.failed} failed, ` +
        `${emails.skipped} skipped of ${emails.attempted} attempted`
    )

    return NextResponse.json({
      ok: true,
      startedAt,
      membersChecked: result.membersChecked,
      alertsCreated: result.alertsCreated,
      skippedExisting: result.skippedExisting,
      emailsSent: emails.sent,
      emailsFailed: emails.failed,
      emailsSkipped: emails.skipped,
    })
  } catch (err) {
    console.error('[cron:detect-churn] failed:', err)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
