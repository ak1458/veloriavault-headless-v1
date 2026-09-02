import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "./cart";
import { DiscountCalculation } from "@/types/coupon";
import { calculateDiscounts as localCalculateDiscounts } from "@/lib/coupon-calculator";

let activeCalculationRequestId = 0;
let activeCalculationController: AbortController | null = null;

interface CouponState {
  appliedCouponCodes: string[];
  calculation: DiscountCalculation | null;
  isPrepaid: boolean | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addCoupon: (code: string, items: CartItem[]) => Promise<{ success: boolean; error?: string }>;
  removeCoupon: (code: string, items?: CartItem[]) => Promise<void>;
  clearCoupons: () => void;
  setIsPrepaid: (isPrepaid: boolean) => void;
  calculateDiscounts: (items: CartItem[]) => Promise<DiscountCalculation | null>;
  validateCoupon: (code: string, items: CartItem[]) => Promise<{ valid: boolean; error?: string }>;
}

function getNormalizedAppliedCodes(calculation: DiscountCalculation | null): string[] {
  return (calculation?.appliedCoupons ?? []).map((item) => item.coupon.code.toUpperCase());
}

export const useCouponStore = create<CouponState>()(
  persist(
    (set, get) => ({
      appliedCouponCodes: [],
      calculation: null,
      isPrepaid: true,
      isLoading: false,
      error: null,

      addCoupon: async (code: string, items: CartItem[]) => {
        const { appliedCouponCodes } = get();
        const normalizedCode = code.toUpperCase();
        
        // Check if already applied
        if (appliedCouponCodes.includes(normalizedCode)) {
          return { success: false, error: "Coupon already applied" };
        }

        // Validate coupon
        const validation = await get().validateCoupon(code, items);
        
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        // Add coupon
        set({ 
          appliedCouponCodes: [...appliedCouponCodes, normalizedCode],
          error: null,
        });

        const latestCalculation = await get().calculateDiscounts(items);
        const wasApplied = latestCalculation?.appliedCoupons.some(
          (item) => item.coupon.code.toUpperCase() === normalizedCode,
        );

        if (!latestCalculation || !wasApplied) {
          // Rollback
          set({
            appliedCouponCodes: appliedCouponCodes.filter(c => c !== normalizedCode),
          });
          return {
            success: false,
            error:
              normalizedCode === "LUCKYDRAW"
                ? "Lucky Draw discount could not be applied to this cart."
                : "Coupon could not be applied.",
          };
        }

        return { success: true };
      },

      removeCoupon: async (code: string, items?: CartItem[]) => {
        const { appliedCouponCodes } = get();
        set({
          appliedCouponCodes: appliedCouponCodes.filter((c) => c !== code.toUpperCase()),
        });

        if (items && items.length > 0) {
          await get().calculateDiscounts(items);
        } else {
          set({ calculation: null });
        }
      },

      clearCoupons: () => {
        set({ appliedCouponCodes: [], calculation: null });
      },

      setIsPrepaid: (isPrepaid: boolean) => {
        set({ isPrepaid });
      },

      calculateDiscounts: async (items: CartItem[]) => {
        if (items.length === 0) {
          set({ calculation: null, appliedCouponCodes: [], isLoading: false, error: null });
          return null;
        }

        const { isPrepaid } = get();

        // Calculate discounts instantly using local calculator (5% prepaid discount only)
        // Eliminates AbortError and avoids redundant network calls
        const localCalculation = localCalculateDiscounts({
          items,
          appliedCouponCodes: [],
          isPrepaid: isPrepaid ?? true,
        });

        set({
          calculation: localCalculation,
          appliedCouponCodes: [],
          isLoading: false,
          error: null,
        });

        return localCalculation;

        /* [PAUSED FOR FUTURE COUPONS / TIER OFFERS]
        activeCalculationRequestId += 1;
        const requestId = activeCalculationRequestId;

        activeCalculationController?.abort();
        activeCalculationController = new AbortController();

        set({ isLoading: true, error: null });

        try {
          const { appliedCouponCodes, isPrepaid } = get();

          const response = await fetch("/api/coupons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: activeCalculationController.signal,
            body: JSON.stringify({
              items: items.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
              })),
              appliedCouponCodes,
              isPrepaid: isPrepaid ?? true,
            }),
          });

          const data = await response.json();

          if (data.success) {
            const nextCalculation = data.calculation as DiscountCalculation;

            if (requestId === activeCalculationRequestId) {
              set({
                calculation: nextCalculation,
                appliedCouponCodes: getNormalizedAppliedCodes(nextCalculation),
                error: null,
              });
            }

            return nextCalculation;
          } else {
            if (requestId === activeCalculationRequestId) {
              set({ error: data.error || "Failed to calculate discounts", calculation: null });
            }
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return get().calculation;
          }

          if (requestId === activeCalculationRequestId) {
            set({ error: "Network error", calculation: null });
          }
        } finally {
          if (requestId === activeCalculationRequestId) {
            set({ isLoading: false });
          }
        }

        return null;
        */
      },

      validateCoupon: async (code: string, items: CartItem[]) => {
        try {
          const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
          const params = new URLSearchParams({
            code,
            subtotal: String(subtotal),
            itemCount: String(itemCount),
          });

          get().appliedCouponCodes.forEach((appliedCode) => {
            params.append("existingCoupons[]", appliedCode);
          });

          const response = await fetch(`/api/coupons/validate?${params.toString()}`);
          const data = await response.json();
          return { valid: data.success, error: data.error };
        } catch {
          return { valid: false, error: "Failed to validate coupon" };
        }
      },
    }),
    {
      name: "veloria-coupons",
      partialize: (state) => ({ 
        appliedCouponCodes: state.appliedCouponCodes,

      }),
    }
  )
);
