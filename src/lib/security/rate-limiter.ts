/**
 * SolarOS High-Performance In-Memory Sliding-Window Rate Limiter
 * 
 * Provides defense-in-depth against Denial of Service (DoS), brute force,
 * and automated spam bots targeting public forms (enquiries) and financial APIs.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // epoch ms
  retryAfterSec: number;
}

interface WindowRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private store: Map<string, WindowRecord> = new Map();
  private cleanupIntervalMs: number;
  private lastCleanup: number = Date.now();

  constructor(cleanupIntervalMs: number = 60_000) {
    this.cleanupIntervalMs = cleanupIntervalMs;
  }

  /**
   * Check if a request from an identifier (e.g. client IP) is within the rate limit.
   * 
   * @param key Unique key (e.g. client IP + action namespace)
   * @param limit Maximum allowed requests within the time window
   * @param windowMs Time window in milliseconds
   */
  public check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    this.lazyCleanup(now);

    const record = this.store.get(key) || { timestamps: [] };

    // Discard timestamps outside the current sliding window
    const windowStart = now - windowMs;
    const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (validTimestamps.length >= limit) {
      const oldestValid = validTimestamps[0];
      const resetTime = oldestValid + windowMs;
      const retryAfterSec = Math.max(1, Math.ceil((resetTime - now) / 1000));

      // Update store with cleaned timestamps
      record.timestamps = validTimestamps;
      this.store.set(key, record);

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime,
        retryAfterSec,
      };
    }

    // Record this hit
    validTimestamps.push(now);
    record.timestamps = validTimestamps;
    this.store.set(key, record);

    const remaining = Math.max(0, limit - validTimestamps.length);
    const resetTime = validTimestamps[0] + windowMs;

    return {
      allowed: true,
      limit,
      remaining,
      resetTime,
      retryAfterSec: 0,
    };
  }

  /**
   * Reset rate limit state for a key (useful for tests or post-authentication)
   */
  public reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all records in the limiter
   */
  public clear(): void {
    this.store.clear();
  }

  /**
   * Periodic lazy purge of empty or expired keys to prevent memory leaks
   */
  private lazyCleanup(now: number): void {
    if (now - this.lastCleanup < this.cleanupIntervalMs) return;

    this.lastCleanup = now;
    const expiryThreshold = now - 3600_000; // 1 hour max retention

    for (const [key, record] of this.store.entries()) {
      const active = record.timestamps.filter((ts) => ts > expiryThreshold);
      if (active.length === 0) {
        this.store.delete(key);
      } else {
        record.timestamps = active;
      }
    }
  }
}

// Global Singleton instance for application runtime
export const globalRateLimiter = new SlidingWindowRateLimiter();

/**
 * Standard HTTP headers for rate limiting
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSec);
  }

  return headers;
}
