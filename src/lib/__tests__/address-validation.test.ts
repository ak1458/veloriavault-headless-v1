import { describe, it, expect } from "vitest";
import { indianPhoneSchema, indianPincodeSchema } from "@/lib/address-validation";

describe("indianPhoneSchema", () => {
  it.each(["9876543210", "+91 98765 43210", "09876543210", "98765-43210"])("accepts %s", (v) => {
    expect(indianPhoneSchema.parse(v)).toBe("9876543210");
  });
  it.each(["12345", "abcdefghij", "1234567890", "98765432101"])("rejects %s", (v) => {
    expect(indianPhoneSchema.safeParse(v).success).toBe(false);
  });
});

describe("indianPincodeSchema", () => {
  it("accepts 6 digits", () => expect(indianPincodeSchema.parse("110 001")).toBe("110001"));
  it.each(["1100", "011001", "abcdef"])("rejects %s", (v) => {
    expect(indianPincodeSchema.safeParse(v).success).toBe(false);
  });
});
