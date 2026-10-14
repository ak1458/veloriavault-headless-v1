import { describe, it, expect } from "vitest";
import { calculateDiscounts } from "@/lib/coupon-calculator";
import type { CartItem } from "@/store/cart";

const item = (id: number, price: number, quantity = 1) =>
  ({ id, name: `Bag ${id}`, slug: "", image: "", category: "", price, quantity }) as CartItem;

describe("calculateDiscounts", () => {
  it("applies 10% tier + 5% prepaid for one bag", () => {
    const calc = calculateDiscounts({ items: [item(1, 2999)], appliedCouponCodes: [], isPrepaid: true });
    expect(calc.tierDiscount).toBe(300);
    expect(calc.prepaidDiscount).toBe(150);
    expect(calc.finalTotal).toBe(2549);
    expect(calc.savingsBreakdown.map((s) => s.label)).toEqual([
      "Automatic Tier Discount (10%)",
      "Prepaid Bonus (5%)",
    ]);
  });

  it("applies 15% tier for 2+ bags (by quantity)", () => {
    const calc = calculateDiscounts({ items: [item(1, 2000, 2)], appliedCouponCodes: [], isPrepaid: true });
    expect(calc.tierDiscount).toBe(600);
    expect(calc.prepaidDiscount).toBe(200);
    expect(calc.finalTotal).toBe(3200);
  });

  it("COD gets tier discount but no prepaid bonus, plus COD fee", () => {
    const calc = calculateDiscounts({ items: [item(1, 2000)], appliedCouponCodes: [], isPrepaid: false });
    expect(calc.tierDiscount).toBe(200);
    expect(calc.prepaidDiscount).toBe(0);
    expect(calc.finalTotal).toBe(2000 - 200 + 149);
  });

  it("returns zeros for empty cart", () => {
    const calc = calculateDiscounts({ items: [], appliedCouponCodes: [], isPrepaid: true });
    expect(calc.finalTotal).toBe(0);
    expect(calc.tierDiscount).toBe(0);
  });
});
