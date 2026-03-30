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
