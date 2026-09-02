"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Truck, AlertCircle } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useCouponStore } from "@/store/cart-coupon";

interface OrderSummaryProps {
  showCouponSection?: boolean;
}

export default function OrderSummary({ showCouponSection = true }: OrderSummaryProps) {
  const { items } = useCartStore();
  const { 
    calculation, 
    isPrepaid, 
    setIsPrepaid,
    calculateDiscounts,
  } = useCouponStore();

  useEffect(() => {
    calculateDiscounts(items).catch(() => {});
  }, [items, isPrepaid, calculateDiscounts]);

  if (items.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <p className="text-center text-gray-500">Your cart is empty</p>
      </div>
    );
  }

  const subtotal = calculation?.originalSubtotal || items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalSavings = calculation?.savingsBreakdown.reduce((sum, s) => sum + s.amount, 0) || 0;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <h3 className="font-serif text-lg text-gray-800 mb-6 border-b border-gray-100 pb-3">
        Order Summary
      </h3>

      {/* Items List */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6 pr-2 scrollbar-style">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            <div className="relative w-16 h-16 bg-gray-50 rounded border flex-shrink-0">
              <Image
                src={item.image || "/images/bag-placeholder.svg"}
                alt={item.name}
                fill
                className="object-cover rounded"
                sizes="64px"
              />
              <span className="absolute -top-1 -right-1 bg-gray-900 text-white w-4 h-4 rounded-full text-center flex items-center justify-center text-[10px] font-bold">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium text-gray-800 truncate mb-1">
                {item.name}
              </h4>
              <p className="text-xs text-gray-400 uppercase">{item.category}</p>
            </div>
            <p className="font-bold text-xs text-gray-800">
              ₹{(item.price * item.quantity).toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>

      {showCouponSection && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-600 mb-2">Payment Method</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setIsPrepaid(true)}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded transition-colors ${
                isPrepaid === true
                  ? "bg-[#b59a5c] text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              Prepaid
              <span className="block text-[10px] opacity-80">+5% extra off</span>
            </button>
            <button
              onClick={() => setIsPrepaid(false)}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded transition-colors ${
                isPrepaid === false
                  ? "bg-[#b59a5c] text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              Cash on Delivery
              <span className="block text-[10px] opacity-80">+₹149 fee</span>
            </button>
          </div>
        </div>
      )}

      {/* Calculations */}
      <div className="space-y-2 pt-4 border-t border-gray-100 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-semibold">₹{subtotal.toLocaleString("en-IN")}</span>
        </div>

        {/* All Discounts (Tiers, Coupons, Prepaid) */}
        {calculation?.savingsBreakdown?.map((saving, idx) => (
          <div key={idx} className="flex justify-between text-green-600">
            <span className="text-xs">{saving.label}</span>
            <span className="font-medium text-xs">-₹{saving.amount.toLocaleString("en-IN")}</span>
          </div>
        ))}

        {/* Shipping */}
        <div className="flex justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Truck size={14} /> Shipping
          </span>
          {calculation?.shippingCost === 0 ? (
            <span className="font-bold text-green-600 text-xs">FREE</span>
          ) : (
            <span className="font-semibold">₹{calculation?.shippingCost || 0}</span>
          )}
        </div>

        {/* COD Fee */}
        {isPrepaid === false && (
          <div className="flex justify-between text-amber-600">
            <span className="text-xs flex items-center gap-1">
              <AlertCircle size={12} /> COD Fee
            </span>
            <span className="font-medium text-xs">+₹149</span>
          </div>
        )}

        {/* Total Savings */}
        {totalSavings > 0 && (
          <div className="pt-2 border-t border-dashed border-gray-200">
            <div className="flex justify-between text-green-600">
              <span className="text-xs font-medium">Total Savings</span>
              <span className="font-bold text-xs">₹{totalSavings.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {/* Final Total */}
        <div className="border-t border-gray-100 pt-3 flex justify-between text-base font-bold text-gray-900">
          <span>Total Amount</span>
          <span>₹{(calculation?.finalTotal || subtotal).toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}
