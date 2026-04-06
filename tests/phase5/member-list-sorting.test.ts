import { describe, it, expect } from 'vitest'
import { getDaysAgo, formatLastCheckin } from '@/lib/utils/members'
import { mockMembers } from './fixtures/mock-members'

describe('getDaysAgo', () => {
  it('returns null for null input', () => {
    expect(getDaysAgo(null)).toBeNull()
  })
  it('returns 0 for today ISO string', () => {
    expect(getDaysAgo(new Date().toISOString())).toBe(0)
  })
  it('returns 1 for 1 day ago', () => {
    const d = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    expect(getDaysAgo(d)).toBe(1)
  })
  it('returns 9 for 9 days ago', () => {
    const d = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
    expect(getDaysAgo(d)).toBe(9)
  })
})

describe('formatLastCheckin', () => {
  it('returns em-dash for null', () => { expect(formatLastCheckin(null)).toBe('—') })
  it('returns hoje for today', () => { expect(formatLastCheckin(new Date().toISOString())).toBe('hoje') })
  it('returns Nd for N days ago', () => {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatLastCheckin(d)).toBe('7d')
  })
})

describe('mockMembers sort order', () => {
  it('null last_checked_in member appears first', () => {
    expect(mockMembers[0].last_checked_in).toBeNull()
  })
  it('9-day member appears before 6-day member', () => {
    const nineDay = mockMembers.find(m => m.id === 'm2')!
    const sixDay = mockMembers.find(m => m.id === 'm3')!
    const nineIdx = mockMembers.indexOf(nineDay)
    const sixIdx = mockMembers.indexOf(sixDay)
    expect(nineIdx).toBeLessThan(sixIdx)
  })
})
