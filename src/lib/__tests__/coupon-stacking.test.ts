import { describe, it, expect, vi } from "vitest";
import type { CartItem } from "@/store/cart";

// Pretend a few codes are configured, to prove the engine + 35% cap.
vi.mock("@/config/coupons", () => ({
  AVAILABLE_COUPONS: [
    { id: "ff", code: "FF10", type: "percentage", category: "influencer", stackable: true, amount: 10,
      description: "", isActive: true, isAutomatic: false, usageCount: 0 },
    { id: "dw", code: "DIWALI20", type: "percentage", category: "seasonal", stackable: true, amount: 20,
      description: "", isActive: true, isAutomatic: false, usageCount: 0 },
    { id: "s5", code: "SAVE500", type: "fixed_cart", category: "standard", stackable: false, amount: 500,
      minPurchase: 3000, description: "", isActive: true, isAutomatic: false, usageCount: 0 },
    { id: "old", code: "OLD", type: "percentage", category: "seasonal", stackable: true, amount: 10,
      expiryDate: "2020-01-01", description: "", isActive: true, isAutomatic: false, usageCount: 0 },
  ],
}));

import { calculateDiscounts, validateCoupon } from "@/lib/coupon-calculator";

const item = (id: number, price: number, quantity = 1) =>
  ({ id, name: `Bag ${id}`, slug: "", image: "", category: "", price, quantity }) as CartItem;

const totalDiscount = (c: ReturnType<typeof calculateDiscounts>) =>
  c.tierDiscount + c.prepaidDiscount + c.manualCouponDiscount;

describe("coupon engine", () => {
  it("stacks tier + coupon + prepaid under the cap", () => {
    const c = calculateDiscounts({ items: [item(1, 2999)], appliedCouponCodes: ["ff10"], isPrepaid: true });
    expect(c.tierDiscount).toBe(450);
    expect(c.manualCouponDiscount).toBe(300);
    expect(c.prepaidDiscount).toBe(150);
    expect(c.isCapped).toBe(false);
    expect(c.finalTotal).toBe(2999 - 900);
    expect(c.savingsBreakdown.reduce((s, x) => s + x.amount, 0)).toBe(900);
  });

  it("caps total discount at 35% (2 bags + 20% code + prepaid = 45%)", () => {
    const c = calculateDiscounts({ items: [item(1, 2000, 2)], appliedCouponCodes: ["DIWALI20"], isPrepaid: true });
    expect(c.isCapped).toBe(true);
    expect(totalDiscount(c)).toBeLessThanOrEqual(1400);
    expect(totalDiscount(c)).toBeGreaterThanOrEqual(1397);
    expect(c.finalTotal).toBe(4000 - totalDiscount(c));
    // breakdown (what becomes WC fee lines) adds up to the same discount
    expect(c.savingsBreakdown.reduce((s, x) => s + x.amount, 0)).toBe(totalDiscount(c));
  });

  it("never exceeds 35% even with every stackable code", () => {
    const c = calculateDiscounts({
      items: [item(1, 3333, 3)],
      appliedCouponCodes: ["FF10", "DIWALI20"],
      isPrepaid: true,
    });
    expect(totalDiscount(c)).toBeLessThanOrEqual(Math.floor(9999 * 0.35));
  });

  it("COD: tier + coupon, no prepaid bonus, plus COD fee", () => {
    const c = calculateDiscounts({ items: [item(1, 2000)], appliedCouponCodes: ["FF10"], isPrepaid: false });
    expect(c.prepaidDiscount).toBe(0);
    expect(c.finalTotal).toBe(2000 - 300 - 200 + 149);
  });

  it("non-stackable flat coupon respects minimum purchase", () => {
    expect(calculateDiscounts({ items: [item(1, 2999)], appliedCouponCodes: ["SAVE500"], isPrepaid: true })
      .manualCouponDiscount).toBe(0);
    const c = calculateDiscounts({ items: [item(1, 3500)], appliedCouponCodes: ["SAVE500", "FF10"], isPrepaid: true });
    expect(c.appliedCoupons.map((x) => x.coupon.code)).toEqual(["SAVE500"]);
    expect(c.manualCouponDiscount).toBe(500);
  });

  it("ignores unknown, expired and lucky-draw codes", () => {
    const c = calculateDiscounts({
      items: [item(1, 2000)],
      appliedCouponCodes: ["NOPE", "OLD", "LUCKYDRAW"],
      isPrepaid: true,
      luckyDrawDiscount: 30,
    });
    expect(c.manualCouponDiscount).toBe(0);
    expect(validateCoupon("LUCKYDRAW", 2000, 1, 30).valid).toBe(false);
    expect(validateCoupon("OLD", 2000).valid).toBe(false);
  });

  it("validateCoupon enforces stacking rules", () => {
    expect(validateCoupon("FF10", 2000).valid).toBe(true);
    expect(validateCoupon("SAVE500", 3500, 1, undefined, ["FF10"]).valid).toBe(false);
  });
});
