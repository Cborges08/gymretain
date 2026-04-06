import { describe, it, expect } from 'vitest'
import { classifyRisk, computeCounters } from '@/lib/utils/members'
import { mockMembers } from './fixtures/mock-members'

describe('classifyRisk', () => {
  it('null days → inactive', () => { expect(classifyRisk(null)).toBe('inactive') })
  it('0 days → active', () => { expect(classifyRisk(0)).toBe('active') })
  it('4 days → active', () => { expect(classifyRisk(4)).toBe('active') })
  it('5 days → at_risk', () => { expect(classifyRisk(5)).toBe('at_risk') })
  it('7 days → at_risk', () => { expect(classifyRisk(7)).toBe('at_risk') })
  it('8 days → inactive', () => { expect(classifyRisk(8)).toBe('inactive') })
  it('100 days → inactive', () => { expect(classifyRisk(100)).toBe('inactive') })
})

describe('computeCounters', () => {
  it('returns correct active/atRisk/inactive counts from mockMembers', () => {
    // mockMembers: null(inactive) + 9d(inactive) + 6d(at_risk) + 4d(active) + 1d(active) + 0d(active)
    const result = computeCounters(mockMembers)
    expect(result).toEqual({ active: 3, atRisk: 1, inactive: 2 })
  })
  it('returns zeros for empty array', () => {
    expect(computeCounters([])).toEqual({ active: 0, atRisk: 0, inactive: 0 })
  })
})
