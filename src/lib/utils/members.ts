import { differenceInDays, parseISO } from 'date-fns'

/**
 * Returns days since last_checked_in.
 * Returns null if last_checked_in is null (member never checked in).
 * Returns 0 if checked in today.
 */
export function getDaysAgo(isoString: string | null): number | null {
  if (!isoString) return null
  const checkInDate = parseISO(isoString)
  const now = new Date()
  return Math.max(0, differenceInDays(now, checkInDate))
}

/**
 * Formats days-ago into a display string.
 * null → '—', 0 → 'hoje', 1 → '1d', 7 → '7d'
 */
export function formatLastCheckin(isoString: string | null): string {
  const days = getDaysAgo(isoString)
  if (days === null) return '—'
  if (days === 0) return 'hoje'
  return `${days}d`
}

/**
 * Classifies a member's risk level based on days since last check-in.
 * null (never checked in) counts as inactive.
 * Active: days <= 4 | At-risk: 4 < days <= 7 | Inactive: days > 7
 * Per D-07 (CONTEXT.md)
 */
export function classifyRisk(days: number | null): 'active' | 'at_risk' | 'inactive' {
  if (days === null || days > 7) return 'inactive'
  if (days > 4) return 'at_risk'
  return 'active'
}

/**
 * Counts members into risk buckets from a member array.
 * Uses getDaysAgo + classifyRisk — no extra DB query needed (D-08).
 */
export function computeCounters(
  members: Array<{ last_checked_in: string | null }>
): { active: number; atRisk: number; inactive: number } {
  const counts = { active: 0, atRisk: 0, inactive: 0 }
  for (const m of members) {
    const days = getDaysAgo(m.last_checked_in)
    const risk = classifyRisk(days)
    if (risk === 'active') counts.active++
    else if (risk === 'at_risk') counts.atRisk++
    else counts.inactive++
  }
  return counts
}

/**
 * Calculates the Supabase .range() parameters for a page.
 * page=1, pageSize=50 → { from: 0, to: 49 }
 * Per D-09, D-10 (CONTEXT.md): server-side URL param pagination.
 */
export function getPaginationRange(
  page: number,
  pageSize: number
): { from: number; to: number } {
  const from = (page - 1) * pageSize
  const to = page * pageSize - 1
  return { from, to }
}

/**
 * Returns total page count for a given record count and page size.
 * count=0 → 0; count=51, pageSize=50 → 2
 */
export function getTotalPages(count: number, pageSize: number): number {
  if (count === 0) return 0
  return Math.ceil(count / pageSize)
}
