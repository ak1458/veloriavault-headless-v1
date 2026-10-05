"use client";

import { useState } from "react";
import { Sparkles, Tag, Check, X, Loader2 } from "lucide-react";
import { useCouponStore } from "@/store/cart-coupon";
import { useCartStore } from "@/store/cart";
import { AVAILABLE_COUPONS } from "@/config/coupons";
import { OFFER_TIERS, PREPAID_OFFER_TEXT } from "@/config/offers";

// The code box only appears once at least one manual code is switched on in
// config/coupons.ts — no point showing an input that rejects everything.
const HAS_ACTIVE_COUPONS = AVAILABLE_COUPONS.some((coupon) => coupon.isActive);

export default function CouponSection() {
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const { appliedCouponCodes, calculation, addCoupon, removeCoupon } = useCouponStore();
  const { items } = useCartStore();

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || isApplying) return;
    setIsApplying(true);
    setCouponError(null);
    const result = await addCoupon(code, items);
    setIsApplying(false);
    if (result.success) {
      setCouponInput("");
    } else {
      setCouponError(result.error || "Coupon could not be applied.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <h3 className="font-serif text-lg text-gray-800 mb-4">Discounts & Offers</h3>

      <div className="p-4 bg-gradient-to-r from-[#b59a5c]/10 to-[#b59a5c]/5 border border-[#b59a5c]/20 rounded-lg space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#b59a5c]" />
          <span className="text-sm font-medium text-gray-800">Applied automatically</span>
        </div>
        <ul className="text-sm text-gray-600 space-y-1.5 ml-6 list-disc">
          {OFFER_TIERS.map((tier) => (
            <li key={tier.label}>
              {tier.label}: <span className="text-[#b59a5c] font-medium">{tier.percent}% Off</span>
            </li>
          ))}
          <li>{PREPAID_OFFER_TEXT}</li>
        </ul>
      </div>

      {HAS_ACTIVE_COUPONS && (
        <>
          <div className="flex gap-2 mt-4 mb-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleApplyCoupon();
                  }
                }}
                placeholder="Enter coupon code"
                aria-label="Coupon code"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b59a5c] uppercase"
                disabled={isApplying}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleApplyCoupon()}
              disabled={isApplying || !couponInput.trim()}
              className="px-4 py-2.5 bg-[#1a1a1a] text-white text-sm font-medium rounded-lg hover:bg-[#b59a5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
            </button>
          </div>

          {couponError && <p className="text-xs text-red-500 mb-2">{couponError}</p>}

          {appliedCouponCodes.length > 0 && (
            <div className="space-y-2 mt-3">
              {appliedCouponCodes.map((code) => {
                const detail = calculation?.appliedCoupons.find(
                  (c) => c.coupon.code.toUpperCase() === code,
                );
                return (
                  <div
                    key={code}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <div>
                        <span className="text-sm font-medium text-gray-800">{code}</span>
                        {detail && (
                          <p className="text-xs text-green-600">
                            -₹{detail.discountAmount.toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeCoupon(code, items)}
                      aria-label={`Remove coupon ${code}`}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {calculation?.isCapped && (
            <p className="text-xs text-gray-500 mt-3">
              Total savings are capped at 35% of the order value.
            </p>
          )}
        </>
      )}
    </div>
  );
}
