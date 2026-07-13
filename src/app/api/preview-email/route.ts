/**
 * src/app/api/preview-email/route.ts
 * GET /api/preview-email — Renders the churn alert email with sample data
 * for local QA (Phase 8 pitfall guard: catch unreplaced template variables).
 *
 * Protected: not listed in the middleware public exemptions, so it requires
 * an authenticated admin session.
 */

import { NextResponse } from 'next/server'
import { renderChurnAlertEmail } from '@/lib/email/churn-alert'
import { buildWeeklyHistory, getAppBaseUrl } from '@/lib/email/send-churn-alerts'

export const dynamic = 'force-dynamic'

export async function GET() {
  const DAY = 24 * 60 * 60 * 1000
  // Sample: checked in 3x three weeks ago, 1x two weeks ago, silent since
  const sampleCheckins = [
    new Date(Date.now() - 24 * DAY).toISOString(),
    new Date(Date.now() - 22 * DAY).toISOString(),
    new Date(Date.now() - 19 * DAY).toISOString(),
    new Date(Date.now() - 12 * DAY).toISOString(),
  ]

  const { html } = renderChurnAlertEmail({
    gymName: 'Academia Exemplo',
    memberName: 'João da Silva',
    daysSinceLastCheckin: 9,
    weeklyHistory: buildWeeklyHistory(sampleCheckins),
    memberProfileUrl: `${getAppBaseUrl()}/dashboard/members/00000000-0000-0000-0000-000000000000`,
  })

  return new NextResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
