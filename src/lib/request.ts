import type { NextRequest } from "next/server";

export function getClientIp(request: NextRequest): string {
  // Prefer x-real-ip: on Vercel this is set by the platform and is not
  // overridable by the client. Fall back to the LAST x-forwarded-for hop
  // (added by the trusted proxy), which is harder to spoof than the first.
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}
