import { describe, it, expect } from 'vitest'
import { getDaysAgo } from '@/lib/utils/members'

describe('getDaysAgo', () => {
  it('returns null for null last_checked_in', () => {
    expect(getDaysAgo(null)).toBeNull()
  })
  it('returns 0 for today', () => {
    const today = new Date().toISOString()
    expect(getDaysAgo(today)).toBe(0)
  })
  it('returns positive number for past date', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(getDaysAgo(twoDaysAgo)).toBeGreaterThanOrEqual(1)
  })
})
