import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.JWT_SECRET = "test_secret_for_jwt";
});

import { generateToken, verifyToken } from "@/lib/auth/jwt";
import { createChallengeToken, createOtpSession } from "@/lib/auth/otp";

describe("verifyToken", () => {
  it("accepts a customer token", () => {
    const t = generateToken({ userId: 7, email: "a@b.com", displayName: "A" });
    expect(verifyToken(t)?.email).toBe("a@b.com");
  });

  it("rejects an OTP challenge token used as a login cookie", () => {
    expect(verifyToken(createChallengeToken("victim@b.com", "123456"))).toBeNull();
  });

  it("rejects an OTP session token as a customer token", () => {
    expect(verifyToken(createOtpSession("a@b.com"))).toBeNull();
  });
});
