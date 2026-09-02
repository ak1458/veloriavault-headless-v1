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
  const { items, isPrepaid } = input;
  // const { appliedCouponCodes, luckyDrawDiscount } = input; // [PAUSED] Uncomment when re-enabling manual coupons

  const originalSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (originalSubtotal === 0) {
    return {
      originalSubtotal: 0, itemCount: 0, isPrepaid, appliedCoupons: [], tierDiscount: 0,
      prepaidDiscount: 0, manualCouponDiscount: 0, codFee: 0, shippingCost: 0, finalTotal: 0,
      isCapped: false, savingsBreakdown: [],
    };
  }

  /* =========================================================================
   * [PAUSED OFFERS - TO RE-ENABLE IN FUTURE, UNCOMMENT THIS BLOCK]
   * 1. Automatic Tier Discount (1 item = 15%, 2+ items = 20%)
   * const tierPercent = itemCount >= 2 ? 20 : 15;
   * const rawTierDiscount = Math.round((originalSubtotal * tierPercent) / 100);
   *
   * 3. Manual Coupons & Lucky Draw
   * const appliedCoupons = resolveValidCoupons(
   *   appliedCouponCodes,
   *   originalSubtotal,
   *   itemCount,
   *   luckyDrawDiscount,
   * );
   * const rawManualDiscount = appliedCoupons.reduce((sum, item) => sum + item.rawAmount, 0);
   * ========================================================================= */

  // 1. Prepaid Discount (5% Off on Prepaid / Online Orders)
  const finalPrepaidDiscount = isPrepaid
    ? Math.round((originalSubtotal * PREPAID_BONUS_PERCENT) / 100)
    : 0;

  const totalDiscountsApplied = finalPrepaidDiscount;
  const subtotalAfterDiscounts = Math.max(0, originalSubtotal - totalDiscountsApplied);
  
  const shippingCost = originalSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  const codFee = !isPrepaid ? COD_FEE : 0;
  const finalTotal = Math.max(0, subtotalAfterDiscounts + shippingCost + codFee);

  // Formatting Savings Breakdown
  const savingsBreakdown: { label: string; amount: number }[] = [];
  
  /* [PAUSED] Uncomment to show tier savings line:
  if (finalTierDiscount > 0) {
    savingsBreakdown.push({
      label: itemCount >= 2 ? "Automatic Tier Discount (20%)" : "Automatic Tier Discount (15%)",
      amount: finalTierDiscount,
    });
  }
  */
  
  if (finalPrepaidDiscount > 0) {
    savingsBreakdown.push({
      label: `Prepaid Bonus (${PREPAID_BONUS_PERCENT}%)`,
      amount: finalPrepaidDiscount,
    });
  }
  
  /* [PAUSED] Uncomment to show applied coupon savings:
  appliedCoupons.forEach(({ coupon, discountAmount }) => {
    savingsBreakdown.push({ 
      label: coupon.code === "LUCKYDRAW" ? "Lucky Draw Discount" : `Coupon: ${coupon.code}`, 
      amount: discountAmount 
    });
  });
  */

  return {
    originalSubtotal,
    itemCount,
    isPrepaid,
    tierDiscount: 0,
    prepaidDiscount: finalPrepaidDiscount,
    manualCouponDiscount: 0,
    appliedCoupons: [],
    codFee,
    shippingCost,
    finalTotal,
    isCapped: false,
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
  // [PAUSED] Coupons are currently disabled. To re-enable, uncomment the code below:
  /*
  const coupon = getCouponByCode(code, luckyDrawDiscount);

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
      .map(c => getCouponByCode(c, luckyDrawDiscount))
      .some(c => c && !c.stackable);
      
    if (hasNonStackable) {
      return { valid: false, error: "You already have a non-combinable offer applied to your cart." };
    }
    
    const existingCategories = existingCoupons
      .map(c => getCouponByCode(c, luckyDrawDiscount)?.category)
      .filter(Boolean);
      
    if (existingCategories.includes(coupon.category)) {
      return { valid: false, error: `You can only use one ${coupon.category.replace('_', ' ')} code at a time.` };
    }
  }

  return { valid: true, coupon };
  */
  return { valid: false, error: "Coupons are temporarily disabled." };
}
