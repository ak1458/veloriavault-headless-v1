import type { DiscountCalculation } from "@/types/coupon";

export interface OrderFeeLine {
  name: string;
  total: string;
  tax_status: "none" | "taxable";
}

/**
 * Convert the headless discount calculation into WooCommerce fee lines.
 *
 * Line items are priced by WooCommerce at catalog price, so their sum equals
 * `calc.originalSubtotal`. Emitting one NEGATIVE fee per savings item plus the
 * positive COD fee makes the WooCommerce order total resolve to:
 *   originalSubtotal − totalDiscounts + codFee (+ shipping line) = finalTotal
 * i.e. the same value Razorpay charges via `_headless_charge_amount`.
 *
 * Discount fees use tax_status "none" so WooCommerce does not recompute tax on
 * the reduction.
 */
export function buildOrderFeeLines(calc: DiscountCalculation): OrderFeeLine[] {
  const lines: OrderFeeLine[] = [];

  for (const saving of calc.savingsBreakdown) {
    if (saving.amount > 0) {
      lines.push({ name: saving.label, total: `-${saving.amount}`, tax_status: "none" });
    }
  }

  if (calc.codFee > 0) {
    lines.push({ name: "Cash on Delivery Fee", total: `${calc.codFee}`, tax_status: "taxable" });
  }

  return lines;
}
