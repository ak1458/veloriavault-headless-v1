import {
  Coupon,
  DiscountCalculation,
  CartCoupon,
  PREPAID_BONUS_PERCENT,
  COD_FEE,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_COST,
  MAX_DISCOUNT_PERCENT,
} from "@/types/coupon";
import { CartItem } from "@/store/cart";
import { AVAILABLE_COUPONS } from "@/config/coupons";

// The spin wheel / scratch card are switched off, so the dynamic LUCKYDRAW code
// must not be redeemable (its cookie endpoint is still reachable). Flip to true
// only when a lucky-draw promotion is actually running.
const LUCKY_DRAW_ENABLED = false;

export interface CalculationInput {
  items: CartItem[];
  appliedCouponCodes: string[];
  isPrepaid: boolean;
  customerId?: number;
  luckyDrawDiscount?: number;
}

function getCouponByCode(code: string, luckyDrawDiscount?: number): Coupon | null {
  let coupon = AVAILABLE_COUPONS.find((item) => item.code.toUpperCase() === code.toUpperCase());

  // Dynamic Lucky Draw Coupon
  if (!coupon && code.toUpperCase() === "LUCKYDRAW" && luckyDrawDiscount) {
    coupon = {
      id: "lucky-draw-dynamic",
      code: "LUCKYDRAW",
      type: "percentage",
      category: "lucky_draw",
      stackable: true,
      amount: luckyDrawDiscount,
      description: `Lucky Draw Winner - ${luckyDrawDiscount}% Off`,
      isActive: true,
      isAutomatic: false,
      usageCount: 0,
    };
  }

  return coupon ?? null;
}

function getCouponValidationError(
  coupon: Coupon,
  subtotal: number,
  itemCount: number,
): string | null {
  if (!coupon.isActive) {
    return "This coupon is not active";
  }

  if (coupon.startDate) {
    const start = new Date(coupon.startDate);
    if (!Number.isNaN(start.getTime()) && start.getTime() > Date.now()) {
      return "This coupon is not yet active";
    }
  }

  if (coupon.expiryDate) {
    const expiry = new Date(coupon.expiryDate);
    // Add 1 day to expiry date so it's valid throughout the entire expiry date
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() + 86400000 < Date.now()) {
      return "This coupon has expired";
    }
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return "This coupon has reached its usage limit";
  }

  if (coupon.minPurchase && subtotal < coupon.minPurchase) {
    return `Minimum purchase of ₹${coupon.minPurchase} required`;
  }

  if (coupon.minQuantity && itemCount < coupon.minQuantity) {
    return `Minimum of ${coupon.minQuantity} items required for this coupon`;
  }

  return null;
}

function resolveValidCoupons(
  appliedCouponCodes: string[],
  subtotal: number,
  itemCount: number,
  luckyDrawDiscount?: number,
): CartCoupon[] {
  const uniqueCodes = Array.from(new Set(appliedCouponCodes.map((code) => code.toUpperCase())));
  
  const validCoupons = uniqueCodes
    .map((code) => getCouponByCode(code, luckyDrawDiscount))
    .filter((coupon): coupon is Coupon => Boolean(coupon))
    .filter((coupon) => !getCouponValidationError(coupon, subtotal, itemCount))
    .map((coupon) => {
      let rawAmount = 0;
      if (coupon.type === "percentage") {
        rawAmount = Math.round((subtotal * coupon.amount) / 100);
      } else if (coupon.type === "fixed_cart") {
        rawAmount = coupon.amount;
      }
      
      if (coupon.maxDiscount) {
        rawAmount = Math.min(rawAmount, coupon.maxDiscount);
      }

      return {
        coupon,
        rawAmount,
        discountAmount: rawAmount, // Will be scaled later if capped
        appliedTo: "subtotal" as const,
      };
    })
    .filter((entry) => entry.rawAmount > 0);

  // Stacking logic validation
  // If any coupon is NON-stackable (standard), it overrides all others except prepaid.
  const hasNonStackable = validCoupons.some(c => !c.coupon.stackable);
  if (hasNonStackable) {
    // Return only the best single non-stackable coupon if there are multiple somehow
    return validCoupons
      .filter(c => !c.coupon.stackable)
      .sort((a, b) => b.rawAmount - a.rawAmount)
      .slice(0, 1);
  }

  return validCoupons;
}

export function calculateDiscounts(input: CalculationInput): DiscountCalculation {
  const { items, isPrepaid, appliedCouponCodes } = input;
  const luckyDrawDiscount = LUCKY_DRAW_ENABLED ? input.luckyDrawDiscount : undefined;

  const originalSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (originalSubtotal === 0) {
    return {
      originalSubtotal: 0, itemCount: 0, isPrepaid, appliedCoupons: [], tierDiscount: 0,
      prepaidDiscount: 0, manualCouponDiscount: 0, codFee: 0, shippingCost: 0, finalTotal: 0,
      isCapped: false, savingsBreakdown: [],
    };
  }

  // 1. Automatic Tier Discount (1 item = 10%, 2+ items = 15%)
  const tierPercent = itemCount >= 2 ? 15 : (itemCount === 1 ? 10 : 0);
  const rawTierDiscount = Math.round((originalSubtotal * tierPercent) / 100);

  // 2. Manual coupons (codes from config/coupons.ts)
  const resolvedCoupons = resolveValidCoupons(
    appliedCouponCodes ?? [],
    originalSubtotal,
    itemCount,
    luckyDrawDiscount,
  );
  const rawManualDiscount = resolvedCoupons.reduce((sum, item) => sum + item.rawAmount, 0);

  // 3. Prepaid Discount (5% Off on Prepaid / Online Orders)
  const rawPrepaidDiscount = isPrepaid
    ? Math.round((originalSubtotal * PREPAID_BONUS_PERCENT) / 100)
    : 0;

  // 4. Global cap: total of ALL discounts never exceeds MAX_DISCOUNT_PERCENT of
  // the subtotal. Above it, every discount is scaled down proportionally
  // (floored, so the cap can never be overshot by rounding).
  const rawTotalDiscount = rawTierDiscount + rawManualDiscount + rawPrepaidDiscount;
  const maxDiscount = Math.floor((originalSubtotal * MAX_DISCOUNT_PERCENT) / 100);
  const isCapped = rawTotalDiscount > maxDiscount;
  const scale = isCapped ? maxDiscount / rawTotalDiscount : 1;
  const finalTierDiscount = Math.floor(rawTierDiscount * scale);
  const finalPrepaidDiscount = Math.floor(rawPrepaidDiscount * scale);
  const appliedCoupons: CartCoupon[] = resolvedCoupons.map((entry) => ({
    ...entry,
    discountAmount: Math.floor(entry.rawAmount * scale),
  }));
  const finalManualDiscount = appliedCoupons.reduce((sum, item) => sum + item.discountAmount, 0);

  const totalDiscountsApplied = finalTierDiscount + finalManualDiscount + finalPrepaidDiscount;
  const subtotalAfterDiscounts = Math.max(0, originalSubtotal - totalDiscountsApplied);
  
  const shippingCost = originalSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  const codFee = !isPrepaid ? COD_FEE : 0;
  const finalTotal = Math.max(0, subtotalAfterDiscounts + shippingCost + codFee);

  // Formatting Savings Breakdown
  const savingsBreakdown: { label: string; amount: number }[] = [];
  
  if (finalTierDiscount > 0) {
    savingsBreakdown.push({
      label: `Automatic Tier Discount (${tierPercent}%)`,
      amount: finalTierDiscount,
    });
  }
  
  if (finalPrepaidDiscount > 0) {
    savingsBreakdown.push({
      label: `Prepaid Bonus (${PREPAID_BONUS_PERCENT}%)`,
      amount: finalPrepaidDiscount,
    });
  }
  
  appliedCoupons.forEach(({ coupon, discountAmount }) => {
    if (discountAmount > 0) {
      savingsBreakdown.push({
        label: coupon.code === "LUCKYDRAW" ? "Lucky Draw Discount" : `Coupon: ${coupon.code}`,
        amount: discountAmount,
      });
    }
  });

  return {
    originalSubtotal,
    itemCount,
    isPrepaid,
    tierDiscount: finalTierDiscount,
    prepaidDiscount: finalPrepaidDiscount,
    manualCouponDiscount: finalManualDiscount,
    appliedCoupons,
    codFee,
    shippingCost,
    finalTotal,
    isCapped,
    savingsBreakdown,
  };
}

export function validateCoupon(
  code: string,
  subtotal: number,
  itemCount: number = 1,
  luckyDrawDiscount?: number,
  existingCoupons: string[] = [],
): { valid: boolean; coupon?: Coupon; error?: string } {
  const coupon = getCouponByCode(code, LUCKY_DRAW_ENABLED ? luckyDrawDiscount : undefined);

  if (!coupon) {
    if (code.toUpperCase() === "LUCKYDRAW") {
      return { valid: false, error: "Lucky Draw coupon is invalid or expired. Please spin the wheel." };
    }
    return { valid: false, error: "Invalid coupon code" };
  }

  const validationError = getCouponValidationError(coupon, subtotal, itemCount);
  if (validationError) {
    return { valid: false, error: validationError };
  }

  // Check stacking rules against existing
  if (existingCoupons.length > 0) {
    if (!coupon.stackable) {
      return { valid: false, error: "This coupon cannot be combined with other offers." };
    }
    const hasNonStackable = existingCoupons
      .map(c => getCouponByCode(c, LUCKY_DRAW_ENABLED ? luckyDrawDiscount : undefined))
      .some(c => c && !c.stackable);
      
    if (hasNonStackable) {
      return { valid: false, error: "You already have a non-combinable offer applied to your cart." };
    }
    
    const existingCategories = existingCoupons
      .map(c => getCouponByCode(c, LUCKY_DRAW_ENABLED ? luckyDrawDiscount : undefined)?.category)
      .filter(Boolean);
      
    if (existingCategories.includes(coupon.category)) {
      return { valid: false, error: `You can only use one ${coupon.category.replace('_', ' ')} code at a time.` };
    }
  }

  return { valid: true, coupon };
}
