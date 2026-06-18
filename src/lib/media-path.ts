/**
 * Validate the catch-all segments of the WordPress media proxy. Returns the
 * safe joined path under wp-content, or null if any segment is unsafe.
 *
 * Each segment is URL-decoded first (to catch %2e%2e / %2f tricks), then must
 * consist only of letters, digits, dot, underscore and hyphen — no traversal,
 * no separators, no spaces, no null bytes.
 */
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

export function safeMediaPath(segments: string[]): string | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;

  const cleaned: string[] = [];
  for (const raw of segments) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return null; // malformed percent-encoding
    }
    if (decoded === "." || decoded === "..") return null;
    if (decoded.includes("..")) return null;
    if (!SAFE_SEGMENT.test(decoded)) return null;
    cleaned.push(decoded);
  }
  return cleaned.join("/");
}
