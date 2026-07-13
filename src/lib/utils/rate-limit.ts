// src/lib/utils/rate-limit.ts
// In-memory sliding-window rate limiter (Phase 9 — check-in abuse guard).
//
// Scope note: state is per serverless instance. On Vercel, concurrent lambdas
// each keep their own window, so the effective global limit is `limit × N
// instances`. Good enough to stop CPF brute-force/replay from a single client
// on the MVP's free tier — swap for Upstash/Redis if it ever needs to be
// globally exact.

const WINDOW_MS = 5 * 60 * 1000 // 5-minute window (roadmap Phase 9 criterion)
const MAX_TRACKED_KEYS = 10_000 // memory cap: evict oldest key beyond this

const buckets = new Map<string, number[]>()

export interface RateLimitOptions {
  /** Max requests allowed inside the window. */
  limit: number
  /** Window size in ms. Defaults to 5 minutes. */
  windowMs?: number
  /** Injectable clock for tests. */
  now?: number
}

/**
 * Records a hit for `key` and reports whether it is allowed.
 * Returns false when the key already used up `limit` hits inside the window.
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs = WINDOW_MS, now = Date.now() }: RateLimitOptions
): boolean {
  const cutoff = now - windowMs
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff)

  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }

  hits.push(now)

  // Map preserves insertion order — delete + set moves the key to the end,
  // so the first key is always the least-recently-used one to evict.
  buckets.delete(key)
  if (buckets.size >= MAX_TRACKED_KEYS) {
    const oldest = buckets.keys().next().value
    if (oldest !== undefined) buckets.delete(oldest)
  }
  buckets.set(key, hits)

  return true
}

/** Test helper: clears all tracked windows. */
export function resetRateLimiter(): void {
  buckets.clear()
}
