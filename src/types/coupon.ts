export type CouponCategory = "standard" | "influencer" | "seasonal" | "lucky_draw" | "payment" | "bogo";

export interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed_cart" | "fixed_product" | "tiered" | "prepaid_bonus";
  category: CouponCategory;
  stackable: boolean;
  amount: number;
  description: string;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  startDate?: string; // Optional start date (ISO string like "2026-05-01")
  expiryDate?: string; // Optional end date (ISO string like "2026-06-30")
  isActive: boolean;
  excludeSaleItems?: boolean;
  productIds?: number[];
  excludedProductIds?: number[];
  categoryIds?: number[];
  excludedCategoryIds?: number[];
  minQuantity?: number;
  isAutomatic: boolean;
}

export interface CartCoupon {
  coupon: Coupon;
  discountAmount: number; // The actual visible amount (might be scaled down)
  rawAmount: number;      // Unscaled theoretical amount
  appliedTo: "subtotal" | "shipping" | "total";
}

export interface DiscountCalculation {
  originalSubtotal: number;
  itemCount: number;
  isPrepaid: boolean;
  appliedCoupons: CartCoupon[];
  tierDiscount: number;   // 1 item = 10%, 2+ items = 15%
  prepaidDiscount: number;
  manualCouponDiscount: number;
  codFee: number;
  shippingCost: number;
  finalTotal: number;
  isCapped: boolean; // Indicates if scaling happened in the backend
  savingsBreakdown: {
    label: string;
    amount: number;
  }[];
}

// Global Cap Rule
export const MAX_DISCOUNT_PERCENT = 35; 

export const PREPAID_BONUS_PERCENT = 5;
export const COD_FEE = 149;
export const FREE_SHIPPING_THRESHOLD = 0;
export const STANDARD_SHIPPING_COST = 0;
