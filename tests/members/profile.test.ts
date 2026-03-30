import { describe, it, expect } from 'vitest'
import { maskCpf, isValidCpfFormat } from '@/lib/utils/cpf'

describe('maskCpf', () => {
  it('masks CPF showing only last 2 digits', () => {
    expect(maskCpf('12345678901')).toBe('***.***.***-01')
  })
  it('returns em dash for null/undefined', () => {
    expect(maskCpf(null)).toBe('—')
    expect(maskCpf(undefined)).toBe('—')
  })
})

describe('isValidCpfFormat', () => {
  it('returns true for 11-digit string', () => {
    expect(isValidCpfFormat('12345678901')).toBe(true)
  })
  it('returns false for less than 11 digits', () => {
    expect(isValidCpfFormat('123')).toBe(false)
  })
  it('returns false for non-digit characters after stripping', () => {
    expect(isValidCpfFormat('abc')).toBe(false)
  })
})
