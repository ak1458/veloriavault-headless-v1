import { z } from "zod";

/** Strip spaces/dashes and an optional +91 / 0 prefix: "+91 98765-43210" -> "9876543210". */
export function normalizeIndianPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

// Shiprocket rejects anything that is not a 10-digit Indian mobile / 6-digit PIN,
// which silently leaves the order unshipped — validate up front instead.
export const indianPhoneSchema = z
  .string()
  .transform(normalizeIndianPhone)
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Please enter a valid 10-digit mobile number");

export const indianPincodeSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, ""))
  .refine((v) => /^[1-9]\d{5}$/.test(v), "Please enter a valid 6-digit PIN code");
