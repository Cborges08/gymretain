/**
 * tests/checkin/route.test.ts
 * Unit tests for POST /api/checkin route handler.
 * Tests: CHKN-01, CHKN-03, CHKN-04, CHKN-05, CHKN-06
 *
 * Mock pattern: vi.mock('@/lib/supabase/service') — no real DB calls.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(),
}))

import { createServiceRoleClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/checkin/route'

const mockedCreateServiceRoleClient = vi.mocked(createServiceRoleClient)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: { qr_hash?: string; cpf?: string }, headers: Record<string, string> = {}): NextRequest {
  const defaultHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'x-forwarded-for': '1.2.3.4',
    'user-agent': 'TestAgent/1.0',
    ...headers,
  }
  return new NextRequest('http://localhost:3000/api/checkin', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(body),
  })
}

/**
 * Creates a chainable Supabase mock builder that mirrors the actual query chains used in route.ts:
 *
 * org:    .from('organizations').select('id, name').eq('qr_code_hash', qr_hash).single()
 * member: .from('members').select('id, name, status').eq('cpf', cpf).eq('org_id', org.id).eq('status', 'active').single()
 * dup:    .from('checkins').select('checked_in_at').eq('member_id', ...).gte(...).order(...).limit(1).single()
 * insert: .from('checkins').insert({...}).select('checked_in_at').single()
 * update: .from('members').update({...}).eq('id', member.id)
 */
function buildMockSupabase({
  orgResult,
  memberResult,
  duplicateResult,
  insertResult,
}: {
  orgResult: { data: { id: string; name: string } | null; error: null | { message: string } }
  memberResult?: { data: { id: string; name: string; status: string } | null; error: null | { message: string } }
  duplicateResult?: { data: { checked_in_at: string } | null; error: null | { message: string } }
  insertResult?: { data: { checked_in_at: string } | null; error: null | { message: string } }
}) {
  // org chain: .select().eq().single()
  const orgSingle = vi.fn().mockResolvedValue(orgResult)
  const orgEq = vi.fn().mockReturnValue({ single: orgSingle })
  const orgSelect = vi.fn().mockReturnValue({ eq: orgEq })

  // member chain: .select().eq(cpf).eq(org_id).eq(status).single()
  const memberSingle = vi.fn().mockResolvedValue(memberResult ?? { data: null, error: { message: 'not found' } })
  const memberEqStatus = vi.fn().mockReturnValue({ single: memberSingle })
  const memberEqOrg = vi.fn().mockReturnValue({ eq: memberEqStatus })
  const memberEqCpf = vi.fn().mockReturnValue({ eq: memberEqOrg })
  const memberSelect = vi.fn().mockReturnValue({ eq: memberEqCpf })

  // duplicate check chain: .select().eq().gte().order().limit().single()
  const dupSingle = vi.fn().mockResolvedValue(duplicateResult ?? { data: null, error: { message: 'no rows' } })
  const dupLimit = vi.fn().mockReturnValue({ single: dupSingle })
  const dupOrder = vi.fn().mockReturnValue({ limit: dupLimit })
  const dupGte = vi.fn().mockReturnValue({ order: dupOrder })
  const dupEq = vi.fn().mockReturnValue({ gte: dupGte })
  const dupSelect = vi.fn().mockReturnValue({ eq: dupEq })

  // insert chain: .insert().select().single()
  const insertSingle = vi.fn().mockResolvedValue(insertResult ?? { data: null, error: { message: 'insert error' } })
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
  const insertFn = vi.fn().mockReturnValue({ select: insertSelect })

  // update chain: .update().eq()
  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const updateFn = vi.fn().mockReturnValue({ eq: updateEq })

  // The checkins table is accessed twice: once for dup-check (select) and once for insert.
  // We track the call count to return the right builder.
  let checkinsCallCount = 0

  const mockFrom = vi.fn((table: string) => {
    if (table === 'organizations') {
      return { select: orgSelect }
    }
    if (table === 'members') {
      return { select: memberSelect, update: updateFn }
    }
    if (table === 'checkins') {
      checkinsCallCount++
      if (checkinsCallCount === 1) {
        // First call: duplicate check (select)
        return { select: dupSelect }
      } else {
        // Second call: insert
        return { insert: insertFn }
      }
    }
    return {}
  })

  return { mockFrom, insertFn, updateEq, updateFn }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/checkin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 4-01-02: Valid qr_hash + cpf → 200 success
  it('4-01-02: returns 200 with ok:true, memberName, checkedInAt on valid check-in', async () => {
    const { mockFrom } = buildMockSupabase({
      orgResult: { data: { id: 'org-1', name: 'Academia Test' }, error: null },
      memberResult: { data: { id: 'mem-1', name: 'João Silva', status: 'active' }, error: null },
      duplicateResult: { data: null, error: { message: 'no rows' } },
      insertResult: { data: { checked_in_at: '2026-03-31T18:00:00.000Z' }, error: null },
    })

    mockedCreateServiceRoleClient.mockReturnValue({ from: mockFrom } as ReturnType<typeof createServiceRoleClient>)

    const req = makeRequest({ qr_hash: 'valid-hash', cpf: '123.456.789-01' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.memberName).toBe('João Silva')
    expect(json.checkedInAt).toBe('2026-03-31T18:00:00.000Z')
  })

  // 4-01-03: Duplicate check-in within 4h → 400 DUPLICATE
  it('4-01-03: returns 400 DUPLICATE with checkedInAt when member checked in within 4h', async () => {
    const { mockFrom } = buildMockSupabase({
      orgResult: { data: { id: 'org-1', name: 'Academia Test' }, error: null },
      memberResult: { data: { id: 'mem-1', name: 'João Silva', status: 'active' }, error: null },
      duplicateResult: { data: { checked_in_at: '2026-03-31T16:00:00.000Z' }, error: null },
    })

    mockedCreateServiceRoleClient.mockReturnValue({ from: mockFrom } as ReturnType<typeof createServiceRoleClient>)

    const req = makeRequest({ qr_hash: 'valid-hash', cpf: '12345678901' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.ok).toBe(false)
    expect(json.code).toBe('DUPLICATE')
    expect(json.checkedInAt).toBe('2026-03-31T16:00:00.000Z')
  })

  // 4-01-04: Success → checkins row contains ip_address and user_agent from headers
  it('4-01-04: successful check-in records ip_address and user_agent in the insert call', async () => {
    const { mockFrom, insertFn } = buildMockSupabase({
      orgResult: { data: { id: 'org-1', name: 'Academia Test' }, error: null },
      memberResult: { data: { id: 'mem-1', name: 'Ana Costa', status: 'active' }, error: null },
      duplicateResult: { data: null, error: { message: 'no rows' } },
      insertResult: { data: { checked_in_at: '2026-03-31T18:30:00.000Z' }, error: null },
    })

    mockedCreateServiceRoleClient.mockReturnValue({ from: mockFrom } as ReturnType<typeof createServiceRoleClient>)

    const req = makeRequest(
      { qr_hash: 'valid-hash', cpf: '12345678901' },
      { 'x-forwarded-for': '10.0.0.1, 192.168.1.1', 'user-agent': 'Mozilla/5.0 TestBrowser' }
    )
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)

    // Verify the insert was called with ip_address and user_agent
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_address: '10.0.0.1',
        user_agent: 'Mozilla/5.0 TestBrowser',
      })
    )
  })

  // 4-01-05: Success → members.last_checked_in is updated
  it('4-01-05: successful check-in updates members.last_checked_in', async () => {
    const { mockFrom, updateFn } = buildMockSupabase({
      orgResult: { data: { id: 'org-1', name: 'Academia Test' }, error: null },
      memberResult: { data: { id: 'mem-1', name: 'Pedro Alves', status: 'active' }, error: null },
      duplicateResult: { data: null, error: { message: 'no rows' } },
      insertResult: { data: { checked_in_at: '2026-03-31T19:00:00.000Z' }, error: null },
    })

    mockedCreateServiceRoleClient.mockReturnValue({ from: mockFrom } as ReturnType<typeof createServiceRoleClient>)

    const req = makeRequest({ qr_hash: 'valid-hash', cpf: '12345678901' })
    const res = await POST(req)

    expect(res.status).toBe(200)

    // Verify members update was called with the checkin timestamp
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        last_checked_in: '2026-03-31T19:00:00.000Z',
      })
    )
  })

  // 4-01-06 (CPF not found): unknown cpf → 400 NOT_FOUND
  it('4-01-06a: returns 400 NOT_FOUND when CPF is not registered', async () => {
    const { mockFrom } = buildMockSupabase({
      orgResult: { data: { id: 'org-1', name: 'Academia Test' }, error: null },
      memberResult: { data: null, error: { message: 'not found' } },
    })

    mockedCreateServiceRoleClient.mockReturnValue({ from: mockFrom } as ReturnType<typeof createServiceRoleClient>)

    const req = makeRequest({ qr_hash: 'valid-hash', cpf: '99999999999' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.ok).toBe(false)
    expect(json.code).toBe('NOT_FOUND')
  })

  // 4-01-06 (inactive member): inactive member → 400 NOT_FOUND (same code, per D-13)
  it('4-01-06b: returns 400 NOT_FOUND for inactive member (same generic code per D-13)', async () => {
    // When status='active' filter is applied in the query, inactive members won't match
    // so the query returns null/error — same NOT_FOUND response as unknown CPF.
    const { mockFrom } = buildMockSupabase({
      orgResult: { data: { id: 'org-1', name: 'Academia Test' }, error: null },
      memberResult: { data: null, error: { message: 'not found' } },
    })

    mockedCreateServiceRoleClient.mockReturnValue({ from: mockFrom } as ReturnType<typeof createServiceRoleClient>)

    const req = makeRequest({ qr_hash: 'valid-hash', cpf: '88888888888' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.ok).toBe(false)
    expect(json.code).toBe('NOT_FOUND')
  })

  // Invalid qr_hash: hash not in organizations → 400 INVALID_HASH
  it('returns 400 INVALID_HASH when qr_hash is not found in organizations', async () => {
    const { mockFrom } = buildMockSupabase({
      orgResult: { data: null, error: { message: 'not found' } },
    })

    mockedCreateServiceRoleClient.mockReturnValue({ from: mockFrom } as ReturnType<typeof createServiceRoleClient>)

    const req = makeRequest({ qr_hash: 'unknown-hash', cpf: '12345678901' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.ok).toBe(false)
    expect(json.code).toBe('INVALID_HASH')
  })
})
