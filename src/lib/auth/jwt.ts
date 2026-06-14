import jwt from "jsonwebtoken";

// Use a fallback for build-time safety to prevent "FATAL: JWT_SECRET not set" errors.
// The actual runtime check will happen in the generate/verify functions.
const JWT_SECRET = process.env.JWT_SECRET || "build_fallback_secret_not_for_production";

export interface JWTPayload {
  userId: number;
  email: string;
  displayName: string;
  iat?: number;
  exp?: number;
}

export function generateToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    console.warn("WARNING: JWT_SECRET is missing during token generation!");
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    // Pin the algorithm so a forged token can't downgrade to "none" or swap to
    // an asymmetric alg (alg-confusion). We only ever sign with HS256.
    return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function generateRefreshToken(payload: { userId: number }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}
