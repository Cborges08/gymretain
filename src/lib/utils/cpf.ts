/**
 * CPF utilities — Brazilian taxpayer ID formatting and validation.
 * Phase 3: basic format validation only. Full checksum validation deferred to Phase 9.
 */

/**
 * Masks CPF for display. Shows only last 2 digits.
 * Input: '12345678901' → Output: '***.***.***-01'
 * Input: null | undefined → Output: '—'
 */
export function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return '—'
  const digits = cpf.replace(/\D/g, '')
  if (digits.length < 2) return '—'
  const last2 = digits.slice(-2)
  return `***.***.***-${last2}`
}

/**
 * Validates CPF format: strips non-digits, checks for exactly 11 digits.
 * Does NOT validate checksum (Phase 9 concern).
 */
export function isValidCpfFormat(raw: string): boolean {
  if (!raw) return false
  const digits = raw.replace(/\D/g, '')
  return digits.length === 11
}

/**
 * Formats a raw 11-digit CPF string to display format: '123.456.789-01'.
 * Used in edit form where full CPF is visible to admin.
 */
export function formatCpf(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 11) return raw
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

/**
 * Strips CPF formatting to raw 11 digits for DB storage.
 * Accepts: '123.456.789-01', '12345678901', '123 456 789 01'
 */
export function stripCpf(formatted: string): string {
  return formatted.replace(/\D/g, '')
}
