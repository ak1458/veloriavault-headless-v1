import { describe, it, expect } from "vitest";
import { buildOrderFeeLines } from "@/lib/order-fees";
import type { DiscountCalculation } from "@/types/coupon";

const base: DiscountCalculation = {
  originalSubtotal: 2999,
  itemCount: 1,
  isPrepaid: true,
  tierDiscount: 450,
  prepaidDiscount: 150,
  manualCouponDiscount: 0,
  appliedCoupons: [],
  codFee: 0,
  shippingCost: 0,
  finalTotal: 2399,
  isCapped: false,
  savingsBreakdown: [
    { label: "Automatic Tier Discount (15%)", amount: 450 },
    { label: "Prepaid Bonus (5%)", amount: 150 },
  ],
};

describe("buildOrderFeeLines", () => {
  it("emits one negative fee per savings line", () => {
    const lines = buildOrderFeeLines(base);
    expect(lines).toEqual([
      { name: "Automatic Tier Discount (15%)", total: "-450", tax_status: "none" },
      { name: "Prepaid Bonus (5%)", total: "-150", tax_status: "none" },
    ]);
  });

  it("adds COD fee as a positive line", () => {
    const lines = buildOrderFeeLines({
      ...base,
      codFee: 149,
      finalTotal: 2698,
      savingsBreakdown: [{ label: "Automatic Tier Discount (15%)", amount: 450 }],
    });
    expect(lines).toContainEqual({
      name: "Cash on Delivery Fee",
      total: "149",
      tax_status: "taxable",
    });
  });

  it("totals reconcile to finalTotal", () => {
    const lines = buildOrderFeeLines(base);
    const feeSum = lines.reduce((s, l) => s + parseFloat(l.total), 0);
    expect(base.originalSubtotal + feeSum + base.shippingCost).toBe(base.finalTotal);
  });

  it("skips zero-amount savings lines", () => {
    const lines = buildOrderFeeLines({
      ...base,
      savingsBreakdown: [
        { label: "Automatic Tier Discount (15%)", amount: 450 },
        { label: "Coupon: ZERO", amount: 0 },
      ],
    });
    expect(lines).toEqual([
      { name: "Automatic Tier Discount (15%)", total: "-450", tax_status: "none" },
    ]);
  });
});
