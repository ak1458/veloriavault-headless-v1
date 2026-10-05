import crypto from "crypto";
import jwt from "jsonwebtoken";

// Read the secret at call time (not module load) so the build never fails and
// tests can set it in beforeAll.
function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) {
    // Fail closed: a known fallback secret would let anyone forge sessions.
    throw new Error("JWT_SECRET is not configured");
  }
  return value;
}

/** Cryptographically-random 6-digit code, zero-padded. */
export function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Keyed hash of the code. The challenge JWT is readable by the client, so a
 * plain sha256 of a 6-digit code could be brute-forced offline in milliseconds;
 * an HMAC with the server secret cannot.
 */
export function hashOtp(code: string, email: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${email.toLowerCase().trim()}:${code}`)
    .digest("hex");
}

/**
 * Stateless OTP challenge: a 10-minute signed token carrying the email and the
 * hash of the code. The plain code is emailed; the token is stored in an
 * HttpOnly cookie. Verification compares hashes — the code is never stored.
 */
export function createChallengeToken(email: string, code: string): string {
  return jwt.sign(
    { email: email.toLowerCase().trim(), otpHash: hashOtp(code, email), scope: "otp_challenge" },
    secret(),
    { expiresIn: "10m" },
  );
}

export function verifyChallenge(token: string, code: string): { email: string } | null {
  try {
    const p = jwt.verify(token, secret(), { algorithms: ["HS256"] }) as {
      email: string;
      otpHash: string;
      scope?: string;
    };
    if (p.scope !== "otp_challenge" || typeof p.otpHash !== "string") return null;
    const expected = Buffer.from(hashOtp(code, p.email));
    const actual = Buffer.from(p.otpHash);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
      ? { email: p.email }
      : null;
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
