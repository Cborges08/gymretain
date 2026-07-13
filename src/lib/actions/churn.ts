'use server'

// Phase 6 — DASH-04 (marcar como contatado) + DASH-05 (verificação manual).
// Both actions require an authenticated admin session (D-21) — unlike the
// Phase 7 cron endpoint, which authenticates via CRON_SECRET.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { detectChurn } from '@/lib/utils/churn'

async function getOrgId(): Promise<string | null> {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.app_metadata?.org_id ?? null
}

/**
 * Manual churn check — "Verificar Churn Agora" button (DASH-05).
 * Runs the same detectChurn() the cron uses (D-10), scoped to the admin's org,
 * then soft-refreshes the member list via revalidatePath (D-08).
 */
export async function runChurnCheckAction(): Promise<{ error?: string }> {
  const org_id = await getOrgId()
  if (!org_id) {
    return { error: 'Sessão inválida. Faça login novamente.' }
  }

  try {
    const service = createServiceRoleClient()
    await detectChurn(service, org_id)
  } catch (err) {
    console.error('[churn] manual check failed:', err)
    return { error: 'Erro ao verificar churn. Tente novamente.' }
  }

  revalidatePath('/dashboard/members')
  return {}
}

/**
 * Marks a member as contacted (DASH-04) — silences repeat alerts for 7 days.
 * Sets contact_marked_at on the member's open alert, or creates a contacted
 * alert record if none exists yet (D-14). Uses the RLS-scoped client, so the
 * admin can only touch alerts in their own org.
 */
export async function markContactedAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const memberId = formData.get('memberId') as string
  if (!memberId) {
    return { error: 'Membro não informado.' }
  }

  const org_id = await getOrgId()
  if (!org_id) {
    return { error: 'Sessão inválida. Faça login novamente.' }
  }

  const supabase = createServerClient()
  const now = new Date().toISOString()

  // Latest unresolved alert for this member (RLS scopes the query to the org)
  const { data: openAlert, error: selectError } = await supabase
    .from('alerts')
    .select('id')
    .eq('member_id', memberId)
    .is('resolved_at', null)
    .order('triggered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (selectError) {
    console.error('[churn] markContacted select failed:', selectError)
    return { error: 'Erro ao marcar como contatado. Tente novamente.' }
  }

  if (openAlert) {
    const { error } = await supabase
      .from('alerts')
      .update({ contact_marked_at: now, updated_at: now })
      .eq('id', openAlert.id)

    if (error) {
      console.error('[churn] markContacted update failed:', error)
      return { error: 'Erro ao marcar como contatado. Tente novamente.' }
    }
  } else {
    // No open alert yet (e.g. cron hasn't run) — create one already contacted.
    // Phase 8 skips contacted alerts when emailing, so no email is sent for it.
    const { error } = await supabase.from('alerts').insert({
      org_id,
      member_id: memberId,
      alert_type: 'churn',
      triggered_at: now,
      email_sent_at: null,
      contact_marked_at: now,
      resolved_at: null,
      notes: null,
    })

    if (error) {
      console.error('[churn] markContacted insert failed:', error)
      return { error: 'Erro ao marcar como contatado. Tente novamente.' }
    }
  }

  revalidatePath('/dashboard/members')
  return {}
}
