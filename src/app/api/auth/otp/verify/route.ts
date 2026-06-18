import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyChallenge, createOtpSession } from "@/lib/auth/otp";
import { RateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

export const runtime = "nodejs";

// 10 verification attempts per 15 minutes per IP.
const limiter = new RateLimiter(10, 15 * 60 * 1000);
const schema = z.object({ code: z.string().regex(/^\d{6}$/) });

export async function POST(request: NextRequest) {
  if (!limiter.check(getClientIp(request)).success) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  const challenge = request.cookies.get("otp_challenge")?.value;

  let code: string;
  try {
    code = schema.parse(await request.json()).code;
  } catch {
    return NextResponse.json({ success: false, error: "Enter the 6-digit code" }, { status: 400 });
  }

  const result = challenge ? verifyChallenge(challenge, code) : null;
  if (!result) {
    return NextResponse.json(
      { success: false, error: "Invalid or expired code" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ success: true, email: result.email });
  res.cookies.set({
    name: "otp_session",
    value: createOtpSession(result.email),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  // Consume the challenge.
  res.cookies.set({ name: "otp_challenge", value: "", maxAge: 0, path: "/" });
  return res;
}
