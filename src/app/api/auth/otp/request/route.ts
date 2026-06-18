import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateOtp, createChallengeToken } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/mailer";
import { RateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

export const runtime = "nodejs";

// 5 code requests per 15 minutes per IP.
const limiter = new RateLimiter(5, 15 * 60 * 1000);
const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  if (!limiter.check(getClientIp(request)).success) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  let email: string;
  try {
    email = schema.parse(await request.json()).email;
  } catch {
    return NextResponse.json({ success: false, error: "Enter a valid email" }, { status: 400 });
  }

  const code = generateOtp();
  // Best-effort send; never reveal whether the email exists (no enumeration).
  try {
    await sendOtpEmail(email, code);
  } catch (e) {
    console.error("[OTP] mail send failed:", e instanceof Error ? e.message : e);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: "otp_challenge",
    value: createChallengeToken(email, code),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
