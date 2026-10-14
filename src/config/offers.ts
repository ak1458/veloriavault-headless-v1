/**
 * Customer-facing offer copy (top announcement bar, homepage strip, checkout).
 * The actual maths lives in lib/coupon-calculator.ts — keep these in sync:
 *   1 bag = 10% off, 2+ bags = 15% off, +5% on prepaid, total capped at 35%.
 */
export const OFFER_TIERS = [
  { label: "Buy 1 bag", percent: 10 },
  { label: "Buy 2 or more", percent: 15 },
] as const;

export const PREPAID_OFFER_TEXT = "Extra 5% off on prepaid orders";

export const ANNOUNCEMENT_MESSAGES = [
  "Buy 1 Get 10% Off",
  "Buy 2 Get 15% Off",
  "Extra 5% Off on Prepaid Orders",
] as const;
