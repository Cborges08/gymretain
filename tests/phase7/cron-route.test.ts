/**
 * tests/phase7/cron-route.test.ts
 * Phase 7 — GET /api/cron/detect-churn (ALRT-01, ALRT-04, ALRT-05).
 *
 * Auth-first behavior: 401 before any DB access when the CRON_SECRET bearer
 * token is missing or wrong. Detection is delegated to the shared detectChurn()
 * (covered in tests/phase6/churn.test.ts) — here we verify wiring + responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(),
}))
vi.mock('@/lib/utils/churn', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/churn')>()
  return { ...actual, detectChurn: vi.fn() }
})

import { createServiceRoleClient } from '@/lib/supabase/service'
import { detectChurn } from '@/lib/utils/churn'
import { GET } from '@/app/api/cron/detect-churn/route'

const mockedDetectChurn = vi.mocked(detectChurn)
const mockedCreateClient = vi.mocked(createServiceRoleClient)

const CRON_SECRET = 'test-secret-abc123'

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader) headers['authorization'] = authHeader
  return new NextRequest('http://localhost:3000/api/cron/detect-churn', {
    method: 'GET',
    headers,
  })
}

describe('GET /api/cron/detect-churn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
    mockedCreateClient.mockReturnValue({} as ReturnType<typeof createServiceRoleClient>)
    mockedDetectChurn.mockResolvedValue({
      membersChecked: 3,
      alertsCreated: 2,
      skippedExisting: 1,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 401 with no Authorization header — no DB access (ALRT-04)', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect(mockedCreateClient).not.toHaveBeenCalled()
    expect(mockedDetectChurn).not.toHaveBeenCalled()
  })

  it('returns 401 with a wrong secret', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
    expect(mockedDetectChurn).not.toHaveBeenCalled()
  })

  it('returns 401 when CRON_SECRET env var is unset (fail closed)', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(401)
  })

  it('runs detectChurn with the service-role client on valid secret (ALRT-05)', async () => {
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockedCreateClient).toHaveBeenCalledTimes(1)
    // Called WITHOUT orgId — cron processes all orgs
    expect(mockedDetectChurn).toHaveBeenCalledWith(expect.anything())
    expect(body).toMatchObject({
      ok: true,
      membersChecked: 3,
      alertsCreated: 2,
      skippedExisting: 1,
    })
    expect(body.startedAt).toBeTruthy()
  })

  it('returns 500 (not a crash) when detection throws', async () => {
    mockedDetectChurn.mockRejectedValue(new Error('db down'))
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.ok).toBe(false)
  })
})

describe('cron configuration', () => {
  it('vercel.json schedules /api/cron/detect-churn daily at 6h UTC', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const vercelConfig = JSON.parse(
      readFileSync(join(__dirname, '../../vercel.json'), 'utf-8')
    )
    expect(vercelConfig.crons).toEqual([
      { path: '/api/cron/detect-churn', schedule: '0 6 * * *' },
    ])
  })

  it('middleware exempts /api/cron from session auth', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = readFileSync(join(__dirname, '../../src/middleware.ts'), 'utf-8')
    expect(source).toContain("pathname.startsWith('/api/cron')")
  })
})
