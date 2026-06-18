import crypto from "crypto";
import jwt from "jsonwebtoken";

// Read the secret at call time (not module load) so the build never fails and
// tests can set it in beforeAll.
function secret(): string {
  return process.env.JWT_SECRET || "build_fallback_secret_not_for_production";
}

/** Cryptographically-random 6-digit code, zero-padded. */
export function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Stateless OTP challenge: a 10-minute signed token carrying the email and the
 * hash of the code. The plain code is emailed; the token is stored in an
 * HttpOnly cookie. Verification compares hashes — the code is never stored.
 */
export function createChallengeToken(email: string, code: string): string {
  return jwt.sign(
    { email: email.toLowerCase().trim(), otpHash: hashOtp(code) },
    secret(),
    { expiresIn: "10m" },
  );
}

export function verifyChallenge(token: string, code: string): { email: string } | null {
  try {
    const p = jwt.verify(token, secret(), { algorithms: ["HS256"] }) as {
      email: string;
      otpHash: string;
    };
    return p.otpHash === hashOtp(code) ? { email: p.email } : null;
  } catch {
    return null;
  }
}

/** 7-day login session for an email-verified (possibly guest) customer. */
export function createOtpSession(email: string): string {
  return jwt.sign({ email: email.toLowerCase().trim(), scope: "otp" }, secret(), {
    expiresIn: "7d",
  });
}

export function readOtpSession(token: string): { email: string } | null {
  try {
    const p = jwt.verify(token, secret(), { algorithms: ["HS256"] }) as {
      email: string;
      scope?: string;
    };
    return p.scope === "otp" ? { email: p.email } : null;
  } catch {
    return null;
  }
}
