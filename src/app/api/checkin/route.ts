/**
 * src/app/api/checkin/route.ts
 * POST /api/checkin — Public QR check-in endpoint.
 *
 * This route is intentionally public (no auth required). It is accessible
 * without a session because members scan the gym QR code on their personal
 * phones and check in without creating an account.
 *
 * Public route: /api/checkin does NOT start with /dashboard or /api/admin,
 * so middleware's isProtected check evaluates to false and passes it through.
 * See src/middleware.ts for the auth guard comment.
 *
 * Uses createServiceRoleClient() to bypass RLS for organization and member
 * lookups. See src/lib/supabase/service.ts for the allowed-usage list.
 *
 * Phase 4 — CHKN-01, CHKN-03, CHKN-04, CHKN-05, CHKN-06
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { stripCpf } from '@/lib/utils/cpf'

export async function POST(request: NextRequest) {
  try {
    // Step 1 — Parse body
    const body = await request.json() as { qr_hash?: string; cpf?: string }
    const { qr_hash, cpf: rawCpf } = body

    if (!qr_hash || !rawCpf) {
      return NextResponse.json({ ok: false, code: 'INVALID_HASH' }, { status: 400 })
    }

    const cpf = stripCpf(rawCpf)
    if (cpf.length !== 11) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 400 })
    }

    // Step 2 — Extract audit headers
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = request.headers.get('user-agent') ?? null

    // Step 3 — Validate QR hash (organizations table)
    const supabase = createServiceRoleClient()
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('qr_code_hash', qr_hash)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ ok: false, code: 'INVALID_HASH' }, { status: 400 })
    }

    // Step 4 — Lookup member (CPF + org + active status)
    // Inactive members return the same generic NOT_FOUND code per D-13
    // (prevents membership enumeration via the public check-in page)
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, status')
      .eq('cpf', cpf)
      .eq('org_id', org.id)
      .eq('status', 'active')
      .single()

    if (memberError || !member) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 400 })
    }

    // Step 5 — Duplicate detection (4-hour window)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('checkins')
      .select('checked_in_at')
      .eq('member_id', member.id)
      .gte('checked_in_at', fourHoursAgo)
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(
        { ok: false, code: 'DUPLICATE', checkedInAt: existing.checked_in_at },
        { status: 400 }
      )
    }

    // Step 6 — Insert checkin row (audit trail)
    const checkedInAt = new Date().toISOString()
    const { data: checkin, error: insertError } = await supabase
      .from('checkins')
      .insert({
        member_id: member.id,
        org_id: org.id,
        checked_in_at: checkedInAt,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select('checked_in_at')
      .single()

    if (insertError || !checkin) {
      console.error('[checkin] insert error:', insertError)
      return NextResponse.json({ ok: false, code: 'SERVER_ERROR' }, { status: 500 })
    }

    // Step 7 — Update members.last_checked_in (per D-17)
    await supabase
      .from('members')
      .update({ last_checked_in: checkin.checked_in_at })
      .eq('id', member.id)

    // Step 8 — Return success
    return NextResponse.json({
      ok: true,
      memberName: member.name,
      checkedInAt: checkin.checked_in_at,
    })
  } catch (err) {
    console.error('[checkin] unexpected error:', err)
    return NextResponse.json({ ok: false, code: 'SERVER_ERROR' }, { status: 500 })
  }
}
