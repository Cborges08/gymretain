// src/lib/utils/churn.ts
// Core churn detection logic — shared by the manual "Verificar Churn Agora"
// Server Action (Phase 6) and the nightly cron endpoint (Phase 7).
// Phase 7 must NOT duplicate this logic (D-10).
//
// Callers pass a service-role client (createServiceRoleClient) — this function
// bypasses RLS to read members/alerts across the org (D-11).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

/** Days without a check-in before a member is considered churning (ALRT-01). */
export const CHURN_THRESHOLD_DAYS = 7

/** Days a "contacted" mark silences new alerts for the same member (DASH-04). */
export const CONTACT_SILENCE_DAYS = 7

export interface ChurnResult {
  /** Active members past the churn threshold (candidates). */
  membersChecked: number
  /** New alert rows inserted this run. */
  alertsCreated: number
  /** Candidates skipped because an unresolved alert already covers them. */
  skippedExisting: number
}

/**
 * Detects churning members and creates alert records.
 *
 * A member qualifies when: status = 'active' AND
 * (last_checked_in IS NULL OR last_checked_in < NOW() - 7 days).
 *
 * A qualifying member is SKIPPED when they already have an unresolved alert
 * that is still "blocking" (D-12, D-13):
 *   - a pending alert (contact_marked_at IS NULL) — no duplicate alert, OR
 *   - a contacted alert within the 7-day silence window.
 * An unresolved alert whose contact window expired does NOT block — the next
 * run creates a fresh alert so the admin is nudged again (D-05).
 *
 * Idempotent: calling twice in a row creates no duplicate alerts.
 *
 * @param supabase Service-role client (bypasses RLS).
 * @param orgId    Restrict to one org (Phase 6 manual trigger). Omit to
 *                 process all orgs (Phase 7 cron).
 */
export async function detectChurn(
  supabase: SupabaseClient<Database>,
  orgId?: string
): Promise<ChurnResult> {
  const now = Date.now()
  const churnCutoff = new Date(now - CHURN_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const contactCutoff = new Date(now - CONTACT_SILENCE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // 1 — Active members past the churn threshold (never checked in counts too)
  let membersQuery = supabase
    .from('members')
    .select('id, org_id')
    .eq('status', 'active')
    .or(`last_checked_in.is.null,last_checked_in.lt.${churnCutoff}`)

  if (orgId) {
    membersQuery = membersQuery.eq('org_id', orgId)
  }

  const { data: members, error: membersError } = await membersQuery
  if (membersError) {
    throw new Error(`[churn] failed to query members: ${membersError.message}`)
  }

  if (!members || members.length === 0) {
    // Still a completed run — stamp it so the dashboard shows the check ran
    await stampLastChurnCheck(supabase, new Date(now).toISOString(), orgId)
    return { membersChecked: 0, alertsCreated: 0, skippedExisting: 0 }
  }

  // 2 — Unresolved alerts for those members (idempotency + contact silence)
  const memberIds = members.map((m) => m.id)
  const { data: openAlerts, error: alertsError } = await supabase
    .from('alerts')
    .select('member_id, contact_marked_at')
    .is('resolved_at', null)
    .in('member_id', memberIds)

  if (alertsError) {
    throw new Error(`[churn] failed to query alerts: ${alertsError.message}`)
  }

  // An alert blocks a new one while pending OR while the contact window holds
  const blockedMemberIds = new Set(
    (openAlerts ?? [])
      .filter((a) => a.contact_marked_at === null || a.contact_marked_at >= contactCutoff)
      .map((a) => a.member_id)
  )

  // 3 — Insert fresh alerts for unblocked members
  const triggeredAt = new Date(now).toISOString()
  const toInsert = members
    .filter((m) => !blockedMemberIds.has(m.id))
    .map((m) => ({
      org_id: m.org_id,
      member_id: m.id,
      alert_type: 'churn',
      triggered_at: triggeredAt,
      email_sent_at: null,
      contact_marked_at: null,
      resolved_at: null,
      notes: null,
    }))

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('alerts').insert(toInsert)
    if (insertError) {
      throw new Error(`[churn] failed to insert alerts: ${insertError.message}`)
    }
  }

  // 4 — Stamp last_churn_check_at so the dashboard can show "Última
  // verificação" (Phase 9, Pitfall 3: silent cron failure visibility).
  await stampLastChurnCheck(supabase, triggeredAt, orgId)

  return {
    membersChecked: members.length,
    alertsCreated: toInsert.length,
    skippedExisting: members.length - toInsert.length,
  }
}

/**
 * Records when churn detection last ran (migration 005).
 * Best-effort: a stamp failure is logged but never fails the run.
 */
async function stampLastChurnCheck(
  supabase: SupabaseClient<Database>,
  checkedAt: string,
  orgId?: string
): Promise<void> {
  const stampQuery = supabase
    .from('organizations')
    .update({ last_churn_check_at: checkedAt })

  const { error } = orgId
    ? await stampQuery.eq('id', orgId)
    : // No org filter on cron runs — supabase-js requires SOME filter on
      // UPDATE, so match every row via an always-true created_at bound.
      await stampQuery.gte('created_at', '1970-01-01T00:00:00Z')

  if (error) {
    console.error('[churn] failed to stamp last_churn_check_at:', error.message)
  }
}
