/**
 * tests/phase6/churn.test.ts
 * Phase 6 — DASH-04 (marcar como contatado) + DASH-05 (verificação manual).
 *
 * detectChurn() unit tests: candidate selection, idempotency (D-13),
 * contact silence window (D-12/D-05), org scoping.
 * markContactedAction tests: update-existing vs create-new alert paths (D-14).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { detectChurn, CHURN_THRESHOLD_DAYS, CONTACT_SILENCE_DAYS } from '@/lib/utils/churn'

// ---------------------------------------------------------------------------
// Chainable Supabase mock: every builder method returns the same thenable
// object, which resolves to the configured result when awaited.
// ---------------------------------------------------------------------------

type MockResult = { data: unknown; error: null | { message: string } }

function chainable(result: MockResult) {
  const obj: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'or', 'is', 'in', 'gte', 'order', 'limit']
  for (const m of methods) {
    obj[m] = vi.fn().mockReturnValue(obj)
  }
  // Thenable: `await query` resolves to `result`
  obj.then = (resolve: (v: MockResult) => unknown) => Promise.resolve(result).then(resolve)
  return obj as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<MockResult>
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function buildChurnMock({
  membersResult,
  alertsResult,
  insertResult = { data: null, error: null },
}: {
  membersResult: MockResult
  alertsResult?: MockResult
  insertResult?: MockResult
}) {
  const membersChain = chainable(membersResult)
  const alertsChain = chainable(alertsResult ?? { data: [], error: null })
  const insertFn = vi.fn().mockResolvedValue(insertResult)

  const from = vi.fn((table: string) => {
    if (table === 'members') return membersChain
    if (table === 'alerts') return { ...alertsChain, insert: insertFn }
    return {}
  })

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    from,
    membersChain,
    insertFn,
  }
}

// ---------------------------------------------------------------------------
// detectChurn
// ---------------------------------------------------------------------------

describe('detectChurn — candidate selection and alert creation', () => {
  it('creates an alert for an inactive member with no open alert', async () => {
    const { client, insertFn } = buildChurnMock({
      membersResult: { data: [{ id: 'm1', org_id: 'org1' }], error: null },
      alertsResult: { data: [], error: null },
    })

    const result = await detectChurn(client)

    expect(result).toEqual({ membersChecked: 1, alertsCreated: 1, skippedExisting: 0 })
    expect(insertFn).toHaveBeenCalledTimes(1)
    const rows = insertFn.mock.calls[0][0]
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      org_id: 'org1',
      member_id: 'm1',
      alert_type: 'churn',
      email_sent_at: null,
      contact_marked_at: null,
      resolved_at: null,
    })
  })

  it('is idempotent: skips members that already have a pending unresolved alert (D-13)', async () => {
    const { client, insertFn } = buildChurnMock({
      membersResult: { data: [{ id: 'm1', org_id: 'org1' }], error: null },
      alertsResult: { data: [{ member_id: 'm1', contact_marked_at: null }], error: null },
    })

    const result = await detectChurn(client)

    expect(result).toEqual({ membersChecked: 1, alertsCreated: 0, skippedExisting: 1 })
    expect(insertFn).not.toHaveBeenCalled()
  })

  it('skips members contacted within the 7-day silence window (D-12)', async () => {
    const { client, insertFn } = buildChurnMock({
      membersResult: { data: [{ id: 'm1', org_id: 'org1' }], error: null },
      alertsResult: {
        data: [{ member_id: 'm1', contact_marked_at: daysAgoIso(2) }],
        error: null,
      },
    })

    const result = await detectChurn(client)

    expect(result.alertsCreated).toBe(0)
    expect(result.skippedExisting).toBe(1)
    expect(insertFn).not.toHaveBeenCalled()
  })

  it('creates a NEW alert when the contact window has expired (D-05)', async () => {
    const { client, insertFn } = buildChurnMock({
      membersResult: { data: [{ id: 'm1', org_id: 'org1' }], error: null },
      alertsResult: {
        data: [{ member_id: 'm1', contact_marked_at: daysAgoIso(CONTACT_SILENCE_DAYS + 1) }],
        error: null,
      },
    })

    const result = await detectChurn(client)

    expect(result.alertsCreated).toBe(1)
    expect(insertFn).toHaveBeenCalledTimes(1)
  })

  it('handles a mix: some blocked, some fresh', async () => {
    const { client, insertFn } = buildChurnMock({
      membersResult: {
        data: [
          { id: 'm1', org_id: 'org1' },
          { id: 'm2', org_id: 'org1' },
          { id: 'm3', org_id: 'org1' },
        ],
        error: null,
      },
      alertsResult: {
        data: [
          { member_id: 'm1', contact_marked_at: null },        // pending → blocked
          { member_id: 'm2', contact_marked_at: daysAgoIso(1) }, // contacted → blocked
        ],
        error: null,
      },
    })

    const result = await detectChurn(client)

    expect(result).toEqual({ membersChecked: 3, alertsCreated: 1, skippedExisting: 2 })
    const rows = insertFn.mock.calls[0][0]
    expect(rows.map((r: { member_id: string }) => r.member_id)).toEqual(['m3'])
  })

  it('scopes the members query to orgId when provided (Phase 6 manual trigger)', async () => {
    const { client, membersChain } = buildChurnMock({
      membersResult: { data: [], error: null },
    })

    await detectChurn(client, 'org-abc')

    expect(membersChain.eq).toHaveBeenCalledWith('org_id', 'org-abc')
  })

  it('does not filter by org when orgId omitted (Phase 7 cron, all orgs)', async () => {
    const { client, membersChain } = buildChurnMock({
      membersResult: { data: [], error: null },
    })

    await detectChurn(client)

    expect(membersChain.eq).not.toHaveBeenCalledWith('org_id', expect.anything())
  })

  it('uses the 7-day churn threshold in the members query (ALRT-01)', async () => {
    const { client, membersChain } = buildChurnMock({
      membersResult: { data: [], error: null },
    })

    await detectChurn(client)

    expect(CHURN_THRESHOLD_DAYS).toBe(7)
    const orArg = membersChain.or.mock.calls[0][0] as string
    expect(orArg).toContain('last_checked_in.is.null')
    expect(orArg).toContain('last_checked_in.lt.')
  })

  it('returns zeros when no members qualify', async () => {
    const { client, insertFn } = buildChurnMock({
      membersResult: { data: [], error: null },
    })

    const result = await detectChurn(client)

    expect(result).toEqual({ membersChecked: 0, alertsCreated: 0, skippedExisting: 0 })
    expect(insertFn).not.toHaveBeenCalled()
  })

  it('throws when the members query fails', async () => {
    const { client } = buildChurnMock({
      membersResult: { data: null, error: { message: 'boom' } },
    })

    await expect(detectChurn(client)).rejects.toThrow(/failed to query members/)
  })

  it('throws when the alert insert fails', async () => {
    const { client } = buildChurnMock({
      membersResult: { data: [{ id: 'm1', org_id: 'org1' }], error: null },
      insertResult: { data: null, error: { message: 'insert boom' } },
    })

    await expect(detectChurn(client)).rejects.toThrow(/failed to insert alerts/)
  })
})

// ---------------------------------------------------------------------------
// markContactedAction (D-14)
// ---------------------------------------------------------------------------

vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({})) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockServerFrom = vi.fn()
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(),
}))

describe('markContactedAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { app_metadata: { org_id: 'org-123' } } },
    })
  })

  function makeFormData(memberId?: string): FormData {
    const fd = new FormData()
    if (memberId) fd.set('memberId', memberId)
    return fd
  }

  /** alerts select chain: .select().eq().is().order().limit().maybeSingle() */
  function mockAlertsTable({
    openAlert,
    updateError = null,
    insertError = null,
  }: {
    openAlert: { id: string } | null
    updateError?: null | { message: string }
    insertError?: null | { message: string }
  }) {
    const maybeSingle = vi.fn().mockResolvedValue({ data: openAlert, error: null })
    const limit = vi.fn().mockReturnValue({ maybeSingle })
    const order = vi.fn().mockReturnValue({ limit })
    const isFn = vi.fn().mockReturnValue({ order })
    const eq = vi.fn().mockReturnValue({ is: isFn })
    const select = vi.fn().mockReturnValue({ eq })

    const updateEq = vi.fn().mockResolvedValue({ error: updateError })
    const update = vi.fn().mockReturnValue({ eq: updateEq })
    const insert = vi.fn().mockResolvedValue({ error: insertError })

    mockServerFrom.mockReturnValue({ select, update, insert })
    return { update, updateEq, insert }
  }

  it('returns error when memberId is missing', async () => {
    const { markContactedAction } = await import('@/lib/actions/churn')
    const result = await markContactedAction(null, makeFormData())
    expect(result.error).toBeDefined()
  })

  it('returns error when session has no org_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { markContactedAction } = await import('@/lib/actions/churn')
    const result = await markContactedAction(null, makeFormData('m1'))
    expect(result.error).toMatch(/Sessão/)
  })

  it('updates the existing open alert with contact_marked_at (D-14a)', async () => {
    const { update, insert } = mockAlertsTable({ openAlert: { id: 'alert-1' } })
    const { markContactedAction } = await import('@/lib/actions/churn')

    const result = await markContactedAction(null, makeFormData('m1'))

    expect(result.error).toBeUndefined()
    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0][0]).toHaveProperty('contact_marked_at')
    expect(insert).not.toHaveBeenCalled()
  })

  it('creates a contacted alert when no open alert exists (D-14b)', async () => {
    const { update, insert } = mockAlertsTable({ openAlert: null })
    const { markContactedAction } = await import('@/lib/actions/churn')

    const result = await markContactedAction(null, makeFormData('m1'))

    expect(result.error).toBeUndefined()
    expect(update).not.toHaveBeenCalled()
    expect(insert).toHaveBeenCalledTimes(1)
    const row = insert.mock.calls[0][0]
    expect(row).toMatchObject({
      org_id: 'org-123',
      member_id: 'm1',
      alert_type: 'churn',
      resolved_at: null,
      email_sent_at: null,
    })
    expect(row.contact_marked_at).toBeTruthy()
  })

  it('returns a pt-BR error when the update fails', async () => {
    mockAlertsTable({ openAlert: { id: 'alert-1' }, updateError: { message: 'db down' } })
    const { markContactedAction } = await import('@/lib/actions/churn')

    const result = await markContactedAction(null, makeFormData('m1'))
    expect(result.error).toMatch(/Erro ao marcar/)
  })
})
