// src/lib/email/send-churn-alerts.ts
// Email delivery for churn alerts (Phase 8 — ALRT-02, ALRT-03, ALRT-06, ALRT-07).
//
// Called from the cron route after detectChurn(). Selects alerts that still
// need an email, renders the template with real member data, and sends via
// Resend. Per-email try/catch: one failure never blocks the rest (ALRT-06).
// Batch guard at 100 emails/run respects the Resend free tier; remaining
// alerts keep email_sent_at = NULL and are picked up next run (ALRT-07).

import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { getDaysAgo } from '@/lib/utils/members'
import { renderChurnAlertEmail, type WeeklyHistory } from './churn-alert'

/** Resend free tier: 100 emails/day. Never exceed in a single run (ALRT-07). */
export const EMAIL_BATCH_LIMIT = 100

/** Weeks of check-in history shown in the alert email (ALRT-02). */
export const HISTORY_WEEKS = 4

export interface SendResult {
  /** Alerts picked up this run (≤ EMAIL_BATCH_LIMIT). */
  attempted: number
  sent: number
  failed: number
  /** Alerts skipped because member/org data was missing or member inactive. */
  skipped: number
}

/** Base URL for dashboard links inside emails. */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/**
 * Buckets check-in timestamps into the last N weeks (oldest week first).
 * Week windows are rolling 7-day blocks ending at `now`.
 */
export function buildWeeklyHistory(
  checkinDates: string[],
  weeks: number = HISTORY_WEEKS,
  now: Date = new Date()
): WeeklyHistory[] {
  const DAY = 24 * 60 * 60 * 1000
  const result: WeeklyHistory[] = []

  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now.getTime() - i * 7 * DAY)
    const start = new Date(end.getTime() - 7 * DAY)
    const count = checkinDates.filter((d) => {
      const t = new Date(d).getTime()
      return t > start.getTime() && t <= end.getTime()
    }).length

    const fmt = (d: Date) =>
      `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    result.push({ weekLabel: `${fmt(start)} – ${fmt(end)}`, checkinCount: count })
  }

  return result
}

/**
 * Sends pending churn alert emails.
 *
 * Pending = email_sent_at IS NULL AND resolved_at IS NULL AND
 * contact_marked_at IS NULL (a contacted alert needs no nudge email).
 * email_sent_at is set immediately after each successful send so a retried
 * run never emails the same alert twice.
 */
export async function sendChurnAlerts(
  supabase: SupabaseClient<Database>
): Promise<SendResult> {
  // 1 — Pending alerts, oldest first, capped at the batch limit
  const { data: alerts, error: alertsError } = await supabase
    .from('alerts')
    .select('id, member_id, org_id')
    .is('email_sent_at', null)
    .is('resolved_at', null)
    .is('contact_marked_at', null)
    .order('triggered_at', { ascending: true })
    .limit(EMAIL_BATCH_LIMIT)

  if (alertsError) {
    throw new Error(`[email] failed to query pending alerts: ${alertsError.message}`)
  }
  if (!alerts || alerts.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, skipped: 0 }
  }

  // 2 — Batch-fetch members, orgs, and 4 weeks of check-ins (4 queries total)
  const memberIds = Array.from(new Set(alerts.map((a) => a.member_id)))
  const orgIds = Array.from(new Set(alerts.map((a) => a.org_id)))
  const historyCutoff = new Date(
    Date.now() - HISTORY_WEEKS * 7 * 24 * 60 * 60 * 1000
  ).toISOString()

  const [membersRes, orgsRes, checkinsRes] = await Promise.all([
    supabase.from('members').select('id, name, last_checked_in, status').in('id', memberIds),
    supabase.from('organizations').select('id, name, admin_email').in('id', orgIds),
    supabase
      .from('checkins')
      .select('member_id, checked_in_at')
      .in('member_id', memberIds)
      .gte('checked_in_at', historyCutoff),
  ])

  const membersById = new Map((membersRes.data ?? []).map((m) => [m.id, m]))
  const orgsById = new Map((orgsRes.data ?? []).map((o) => [o.id, o]))
  const checkinsByMember = new Map<string, string[]>()
  for (const c of checkinsRes.data ?? []) {
    const list = checkinsByMember.get(c.member_id) ?? []
    list.push(c.checked_in_at)
    checkinsByMember.set(c.member_id, list)
  }

  // 3 — Send one email per alert; failures are logged, never re-thrown (ALRT-06)
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL ?? 'GymRetain <onboarding@resend.dev>'
  const baseUrl = getAppBaseUrl()

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const alert of alerts) {
    const member = membersById.get(alert.member_id)
    const org = orgsById.get(alert.org_id)

    // Deactivated member or dangling data: nothing to email
    if (!member || !org || member.status !== 'active') {
      skipped++
      continue
    }

    const { subject, html } = renderChurnAlertEmail({
      gymName: org.name,
      memberName: member.name,
      daysSinceLastCheckin: getDaysAgo(member.last_checked_in),
      weeklyHistory: buildWeeklyHistory(checkinsByMember.get(member.id) ?? []),
      memberProfileUrl: `${baseUrl}/dashboard/members/${member.id}`,
    })

    try {
      const { error: sendError } = await resend.emails.send({
        from,
        to: org.admin_email,
        subject,
        html,
      })

      if (sendError) {
        throw new Error(sendError.message)
      }

      // Idempotency: mark sent IMMEDIATELY so a retry never re-emails (Pitfall 3)
      const { error: updateError } = await supabase
        .from('alerts')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', alert.id)

      if (updateError) {
        // Email went out but the flag failed — log loudly: next run may resend
        console.error(
          `[email] alert ${alert.id}: sent but failed to set email_sent_at:`,
          updateError.message
        )
      }

      sent++
    } catch (err) {
      failed++
      console.error(`[email] alert ${alert.id}: send failed:`, err)
    }
  }

  return { attempted: alerts.length, sent, failed, skipped }
}
