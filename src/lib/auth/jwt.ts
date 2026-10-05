import jwt from "jsonwebtoken";

export interface JWTPayload {
  userId: number;
  email: string;
  displayName: string;
  iat?: number;
  exp?: number;
}

// Read the secret at call time and fail closed if it is missing. Tokens are
// only ever signed/verified at request time, so the build never needs it.
function requireSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

export function generateToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, requireSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  // Missing secret => treat the token as invalid (fail closed) instead of
  // silently verifying against a build fallback.
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET missing — refusing to verify token");
    return null;
  }
  try {
    // Pin the algorithm so a forged token can't downgrade to "none" or swap to
    // an asymmetric alg (alg-confusion). We only ever sign with HS256.
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] }) as
      Partial<JWTPayload> & { scope?: unknown; otpHash?: unknown };
    // Other tokens (OTP challenge/session, lucky draw) share JWT_SECRET. Only
    // accept real customer tokens, or e.g. an OTP challenge requested for
    // someone else's email would pass as a login for that email.
    if (
      typeof payload.userId !== "number" ||
      payload.userId <= 0 ||
      typeof payload.email !== "string" ||
      payload.scope !== undefined ||
      payload.otpHash !== undefined
    ) {
      return null;
    }
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

export function generateRefreshToken(payload: { userId: number }): string {
  return jwt.sign(payload, requireSecret(), { expiresIn: "30d" });
}
