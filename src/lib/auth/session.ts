import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { readOtpSession } from "@/lib/auth/otp";

/**
 * Resolve the verified email for the current request from either a registered
 * customer JWT (`token`) or an email-OTP guest session (`otp_session`).
 */
export function getSessionEmail(request: NextRequest): string | undefined {
  const token = request.cookies.get("token")?.value;
  const jwtPayload = token ? verifyToken(token) : null;
  if (jwtPayload?.email) return jwtPayload.email;

  const otp = request.cookies.get("otp_session")?.value;
  return otp ? readOtpSession(otp)?.email ?? undefined : undefined;
}
