import { Coupon } from "@/types/coupon";

/**
 * ============================================================
 * VELORIA VAULT - COUPON CONFIGURATION
 * ============================================================
 * 
 * HOW TO ADD A NEW COUPON:
 * 1. Copy one of the examples below based on the type you need.
 * 2. Change the code, amount, description, category, and stackable properties.
 * 3. Save the file and deploy.
 * 
 * COUPON CATEGORIES & STACKING:
 * - "influencer": Can stack with seasonal or lucky_draw (e.g. F&F)
 * - "seasonal": For events like Diwali, Eid. Can stack with influencer.
 * - "standard": Usually non-stackable general coupons.
 * 
 * NOTE: The 15%/20% item-based tier discounts and the 5% Prepaid 
 * discount are applied AUTOMATICALLY by the system. Do not add them here.
 * 
 * ALL DISCOUNTS ARE GLOBALLY CAPPED AT 35%. 
 * If total discounts > 35%, they are scaled down proportionally.
 * ============================================================
 */

export const AVAILABLE_COUPONS: Coupon[] = [
  // ─────────────────────────────────────────────
  // INFLUENCER / PARTNER / SEASONAL COUPON TEMPLATE (EASY TO COPY)
  // ─────────────────────────────────────────────
  // 
  // Simply uncomment the block below and change the values.
  // 
  // {
  //   id: "campaign-fnf-2026",
  //   code: "FNF",                  // ← Name of the coupon users will enter
  //   type: "percentage",
  //   category: "influencer",       // "influencer" stacks with other promotions. "standard" DOES NOT stack.
  //   stackable: true,              // Set to false if this shouldn't be used with other promo codes
  //   amount: 10,                   // ← 10 means 10% off
  //   description: "Family & Friends - 10% Off", 
  //   startDate: "2026-05-01",      // ← Active FROM this date (optional, ISO string format YYYY-MM-DD)
  //   expiryDate: "2026-05-31",     // ← Active UNTIL this date (optional, ISO string format YYYY-MM-DD)
  //   isActive: true,               // ← Set to false to disable immediately
  //   isAutomatic: false,
  //   usageCount: 0,
  // },
  //
  // [PAUSED] All coupons are currently paused. Uncomment to activate:
  // {
  //   id: "influencer-ff10",
  //   code: "F&F", 
  //   type: "percentage",
  //   category: "influencer",
  //   stackable: true, 
  //   amount: 10,
  //   description: "Friends & Family - 10% Off",
  //   isActive: true,
  //   isAutomatic: false,
  //   usageCount: 0,
  // },

  // Example for Diwali:
  // {
  //   id: "seasonal-diwali",
  //   code: "DIWALI20",
  //   type: "percentage",
  //   category: "seasonal",
  //   stackable: true,
  //   amount: 20, // 20% off
  //   description: "Diwali Fest - 20% Off",
  //   expiryDate: "2026-11-15",
  //   isActive: true,
  //   isAutomatic: false,
  //   usageCount: 0,
  // },

  // ─────────────────────────────────────────────
  // STANDARD FLAT AMOUNT COUPONS (Non-stackable usually)
  // ─────────────────────────────────────────────
  // {
  //   id: "standard-save500",
  //   code: "SAVE500",
  //   type: "fixed_cart",
  //   category: "standard",
  //   stackable: false, // If false, this coupon clears other manual coupons
  //   amount: 500, // ₹500 flat off
  //   description: "₹500 Off on orders above ₹3000",
  //   minPurchase: 3000,
  //   isActive: true,
  //   isAutomatic: false,
  //   usageCount: 0,
  // },

  // ====== ADD YOUR COUPONS ABOVE THIS LINE ======
];
