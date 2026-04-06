import { describe, it, expect } from 'vitest'
import { getPaginationRange, getTotalPages } from '@/lib/utils/members'
import { mockCheckins } from './fixtures/mock-checkins'

describe('getPaginationRange', () => {
  it('page 1 → from 0 to 49', () => {
    expect(getPaginationRange(1, 50)).toEqual({ from: 0, to: 49 })
  })
  it('page 2 → from 50 to 99', () => {
    expect(getPaginationRange(2, 50)).toEqual({ from: 50, to: 99 })
  })
  it('page 3 → from 100 to 149', () => {
    expect(getPaginationRange(3, 50)).toEqual({ from: 100, to: 149 })
  })
})

describe('getTotalPages', () => {
  it('0 records → 0 pages', () => { expect(getTotalPages(0, 50)).toBe(0) })
  it('50 records → 1 page', () => { expect(getTotalPages(50, 50)).toBe(1) })
  it('51 records → 2 pages', () => { expect(getTotalPages(51, 50)).toBe(2) })
  it('150 records → 3 pages', () => { expect(getTotalPages(150, 50)).toBe(3) })
  it('149 records → 3 pages', () => { expect(getTotalPages(149, 50)).toBe(3) })
})

describe('mockCheckins fixture', () => {
  it('has 150 records', () => { expect(mockCheckins).toHaveLength(150) })
  it('page 1 slice is indices 0–49', () => {
    const { from, to } = getPaginationRange(1, 50)
    expect(mockCheckins.slice(from, to + 1)).toHaveLength(50)
  })
})
