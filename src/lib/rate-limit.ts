/**
 * Rate Limiting Utility
 * Prevents API abuse and brute force attacks
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production for multi-server setup)
const rateLimitMap = new Map<string, RateLimitRecord>();

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  message?: string;
}

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds (default: 1 minute)
 */
export function rateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to cleanup on each request
    cleanupExpiredRecords();
  }

  // No record or expired - create new
  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(identifier, newRecord);

    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetTime: newRecord.resetTime,
    };
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: record.resetTime,
      message: `Too many requests. Please try again in ${resetInSeconds} seconds.`,
    };
  }

  // Increment count
  record.count++;
  rateLimitMap.set(identifier, record);

  return {
    success: true,
    limit,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Clean up expired rate limit records
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  // Prefer x-real-ip (platform-set, not client-spoofable on Vercel). Fall back
  // to the LAST x-forwarded-for hop (added by the trusted proxy), not the first
  // (which a client can prepend to evade rate limits).
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}

/**
 * Different rate limits for different endpoints
 */
export const RATE_LIMITS = {
  // Strict limits for auth/checkout
  CHECKOUT: { limit: 3, windowMs: 60000 },      // 3 per minute
  LOGIN: { limit: 5, windowMs: 300000 },        // 5 per 5 minutes
  REGISTER: { limit: 3, windowMs: 3600000 },    // 3 per hour
  
  // Medium limits for data fetching
  API: { limit: 30, windowMs: 60000 },          // 30 per minute
  SEARCH: { limit: 20, windowMs: 60000 },       // 20 per minute
  
  // Lenient limits for general browsing
  DEFAULT: { limit: 100, windowMs: 60000 },     // 100 per minute
  STATIC: { limit: 200, windowMs: 60000 },      // 200 per minute
} as const;

/**
 * Class-based Rate Limiter for easier instantiation
 */
export class RateLimiter {
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(identifier: string): RateLimitResult {
    return rateLimit(identifier, this.limit, this.windowMs);
  }

  hasRecord(identifier: string): boolean {
    const record = rateLimitMap.get(identifier);
    const now = Date.now();
    return !!(record && now < record.resetTime && record.count >= this.limit);
  }

  reset(identifier: string): void {
    rateLimitMap.delete(identifier);
  }
}
