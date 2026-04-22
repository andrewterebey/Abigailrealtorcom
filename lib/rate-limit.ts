/**
 * Simple in-memory IP-based token bucket used by `/api/contact` to keep the
 * form from becoming an open spam relay once Resend is wired in
 * (CLAUDE.md §11 — contact form destination).
 *
 * NOTE: This is single-instance only. Netlify dev / a single serverless
 * instance is fine, but a multi-instance or edge deployment will need a
 * shared store (Upstash Redis, Durable Objects, etc). If/when that happens,
 * swap this module's implementation — callers only depend on the
 * `checkRateLimit` signature.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const DEFAULT_LIMIT = 5
const DEFAULT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

export type RateLimitOptions = {
  limit?: number
  windowMs?: number
}

export type RateLimitResult = {
  ok: boolean
  /** Seconds until the bucket resets, only set when `ok` is false. */
  retryAfter?: number
}

/**
 * Prune expired buckets opportunistically so the map does not grow
 * unboundedly over the lifetime of the process.
 */
function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key)
  }
}

export function checkRateLimit(
  ip: string,
  opts: RateLimitOptions = {},
): RateLimitResult {
  const limit = opts.limit ?? DEFAULT_LIMIT
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS
  const now = Date.now()

  pruneExpired(now)

  const existing = buckets.get(ip)
  if (!existing || now > existing.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (existing.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    return { ok: false, retryAfter }
  }

  existing.count += 1
  return { ok: true }
}

/** Test-only helper: wipe all buckets. Not called from production paths. */
export function __resetRateLimitForTests(): void {
  buckets.clear()
}
