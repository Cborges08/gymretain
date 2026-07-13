/**
 * tests/phase9/hardening.test.ts
 * Phase 9 — Launch hardening: rate limiting, error boundaries, churn-check
 * stamping (Pitfall 3), timezone-aware rendering component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { checkRateLimit, resetRateLimiter } from '@/lib/utils/rate-limit'

const ROOT = join(__dirname, '../..')

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

describe('checkRateLimit — sliding window', () => {
  beforeEach(() => resetRateLimiter())

  it('allows up to `limit` hits inside the window, then blocks', () => {
    const now = 1_000_000
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('ip:1.2.3.4', { limit: 5, now: now + i })).toBe(true)
    }
    expect(checkRateLimit('ip:1.2.3.4', { limit: 5, now: now + 10 })).toBe(false)
  })

  it('frees the window as old hits expire (sliding, not fixed)', () => {
    const now = 1_000_000
    const windowMs = 5 * 60 * 1000
    expect(checkRateLimit('k', { limit: 1, windowMs, now })).toBe(true)
    expect(checkRateLimit('k', { limit: 1, windowMs, now: now + 1000 })).toBe(false)
    // Just past the window: the old hit expired
    expect(checkRateLimit('k', { limit: 1, windowMs, now: now + windowMs + 1 })).toBe(true)
  })

  it('tracks keys independently', () => {
    const now = 1_000_000
    expect(checkRateLimit('a', { limit: 1, now })).toBe(true)
    expect(checkRateLimit('b', { limit: 1, now })).toBe(true)
    expect(checkRateLimit('a', { limit: 1, now: now + 1 })).toBe(false)
    expect(checkRateLimit('b', { limit: 1, now: now + 1 })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// /api/checkin rate limiting (backend-enforced — Pitfall 1)
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(),
}))

describe('POST /api/checkin — rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimiter()
  })

  it('returns 429 RATE_LIMITED after exceeding the per-IP limit', async () => {
    const { NextRequest } = await import('next/server')
    const { createServiceRoleClient } = await import('@/lib/supabase/service')
    const { POST } = await import('@/app/api/checkin/route')

    // Requests fail early (invalid body) but still count against the limit
    const makeReq = () =>
      new NextRequest('http://localhost:3000/api/checkin', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' },
        body: JSON.stringify({}),
      })

    let lastStatus = 0
    for (let i = 0; i < 11; i++) {
      const res = await POST(makeReq())
      lastStatus = res.status
    }

    expect(lastStatus).toBe(429)
    const res = await POST(makeReq())
    const body = await res.json()
    expect(body.code).toBe('RATE_LIMITED')
    // Rate limit fires BEFORE any DB access
    expect(vi.mocked(createServiceRoleClient)).not.toHaveBeenCalled()
  })

  it('does not rate limit distinct IPs', async () => {
    const { NextRequest } = await import('next/server')
    const { POST } = await import('@/app/api/checkin/route')

    for (let i = 0; i < 20; i++) {
      const res = await POST(
        new NextRequest('http://localhost:3000/api/checkin', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${i}` },
          body: JSON.stringify({}),
        })
      )
      // 400 (invalid body) — never 429
      expect(res.status).toBe(400)
    }
  })
})

// ---------------------------------------------------------------------------
// Error boundaries and branded 404 (no blank pages)
// ---------------------------------------------------------------------------

describe('error boundaries', () => {
  it('global error boundary exists and is a Client Component with reset', () => {
    const path = join(ROOT, 'src/app/error.tsx')
    expect(existsSync(path)).toBe(true)
    const source = readFileSync(path, 'utf-8')
    expect(source).toContain("'use client'")
    expect(source).toContain('reset')
  })

  it('branded not-found page exists (pt-BR, links back to dashboard)', () => {
    const path = join(ROOT, 'src/app/not-found.tsx')
    expect(existsSync(path)).toBe(true)
    const source = readFileSync(path, 'utf-8')
    expect(source).toContain('não encontrada')
    expect(source).toContain('/dashboard')
  })
})

// ---------------------------------------------------------------------------
// Churn check stamping (Pitfall 3 — cron visibility)
// ---------------------------------------------------------------------------

describe('detectChurn — last_churn_check_at stamping', () => {
  it('migration 005 adds last_churn_check_at to organizations', () => {
    const sql = readFileSync(
      join(ROOT, 'supabase/migrations/005-last-churn-check.sql'),
      'utf-8'
    )
    expect(sql).toContain('ALTER TABLE organizations')
    expect(sql).toContain('last_churn_check_at')
  })

  it('stamps the org even when no members qualify (run visibility)', async () => {
    const { detectChurn } = await import('@/lib/utils/churn')

    const stampEq = vi.fn().mockResolvedValue({ error: null })
    const stampUpdate = vi.fn().mockReturnValue({ eq: stampEq })

    const membersChain: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'or']) {
      membersChain[m] = vi.fn().mockReturnValue(membersChain)
    }
    membersChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve)

    const from = vi.fn((table: string) => {
      if (table === 'members') return membersChain
      if (table === 'organizations') return { update: stampUpdate }
      return {}
    })

    await detectChurn(
      { from } as never,
      'org-1'
    )

    expect(stampUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ last_churn_check_at: expect.any(String) })
    )
    expect(stampEq).toHaveBeenCalledWith('id', 'org-1')
  })
})
