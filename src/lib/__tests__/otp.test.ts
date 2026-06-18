import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.JWT_SECRET = "test_secret_for_otp";
});

import {
  generateOtp,
  hashOtp,
  createChallengeToken,
  verifyChallenge,
  createOtpSession,
  readOtpSession,
} from "@/lib/auth/otp";

describe("otp", () => {
  it("generates 6 digits", () => {
    expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it("verifies a correct code and rejects wrong", () => {
    const t = createChallengeToken("a@b.com", "123456");
    expect(verifyChallenge(t, "123456")).toEqual({ email: "a@b.com" });
    expect(verifyChallenge(t, "000000")).toBeNull();
  });

  it("lowercases the challenge email", () => {
    const t = createChallengeToken("A@B.com", "654321");
    expect(verifyChallenge(t, "654321")).toEqual({ email: "a@b.com" });
  });

  it("round-trips a session and rejects garbage", () => {
    const s = createOtpSession("a@b.com");
    expect(readOtpSession(s)).toEqual({ email: "a@b.com" });
    expect(readOtpSession("garbage")).toBeNull();
  });

  it("rejects a non-otp-scope token as session", () => {
    // A challenge token has no scope:"otp" → must not be accepted as a session.
    const challenge = createChallengeToken("a@b.com", "111111");
    expect(readOtpSession(challenge)).toBeNull();
  });

  it("hashOtp is deterministic", () => {
    expect(hashOtp("123456")).toBe(hashOtp("123456"));
  });
});
