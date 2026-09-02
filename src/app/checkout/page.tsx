"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Check, ArrowRight, CreditCard, ShoppingBag, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/store/cart";
import { useCouponStore } from "@/store/cart-coupon";
import OrderSummary from "@/components/OrderSummary";
import CouponSection from "@/components/CouponSection";
import { SpinWheel } from "@/components/SpinWheel";
import RazorpayPayment from "@/components/RazorpayPayment";

const checkoutSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  address: z.string().min(5, "Please enter a complete address"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().min(4, "Valid postal code is required"),
  phone: z.string().min(10, "Please enter a valid 10-digit phone number"),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const steps = [
  { id: 1, label: "Information" },
  { id: 2, label: "Payment" },
];

interface PendingOrder {
  orderId?: number;
  orderNumber: string;
  total: number;
  razorpayOrderId?: string;
  razorpayKey?: string;
}

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore();
  const { calculation, isPrepaid, setIsPrepaid, calculateDiscounts, clearCoupons } = useCouponStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<{ orderId: number; orderNumber: string } | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [showCodModal, setShowCodModal] = useState(false);
  const formDataRef = useRef<CheckoutFormData | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  // Store form values for payment screen
  const handleFormSubmit = (data: CheckoutFormData) => {
    formDataRef.current = data;
    if (currentStep === 1) {
      setCurrentStep(2);
      setOrderError(null);
      return;
    }

    if (!isPrepaid && !showCodModal) {
      setShowCodModal(true);
      return;
    }

    onSubmit(data);
  };

  const validateStep = async (step: number): Promise<boolean> => {
    if (step === 1) {
      return await trigger(["email", "firstName", "lastName", "address", "city", "state", "postalCode", "phone"]);
    }
    return true;
  };

  const handleNextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 2) {
      setCurrentStep(currentStep + 1);
      setOrderError(null);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setOrderError(null);
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true);
    setOrderError(null);

    try {
      // Calculate final amounts
      const latestCalculation = await calculateDiscounts(items);
      
      if (!latestCalculation) {
        throw new Error("Failed to calculate order total");
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          paymentMethod: isPrepaid ? "card" : "cod",
          shippingMethod: "standard",
          isPrepaid,
          couponCodes: latestCalculation.appliedCoupons.map(c => c.coupon.code),
          discounts: {
            tierDiscount: latestCalculation.tierDiscount,
            prepaidDiscount: latestCalculation.prepaidDiscount,
            manualCouponDiscount: latestCalculation.manualCouponDiscount,
          },
          totals: {
            subtotal: latestCalculation.originalSubtotal,
            shipping: latestCalculation.shippingCost,
            codFee: latestCalculation.codFee,
            total: latestCalculation.finalTotal,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process checkout");
      }

      // For prepaid orders, show Razorpay payment (NO order created in WooCommerce yet!)
      if (result.paymentRequired) {
        formDataRef.current = data;
        setPendingOrder({
          orderNumber: result.orderNumber || "Checkout",
          total: result.amount,
          razorpayOrderId: result.razorpayOrderId,
          razorpayKey: result.key,
        });
        setIsSubmitting(false);
        return;
      }

      // COD order created successfully
      setPlacedOrder({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
      });
      clearCart();
      clearCoupons();
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: { paymentId: string; razorpayOrderId: string; razorpaySignature: string }) => {
    // Payment verified on Razorpay -> Now create genuine, paid order in WooCommerce!
    try {
      setIsSubmitting(true);
      const latestCalculation = await calculateDiscounts(items);
      const currentData = formDataRef.current;

      if (!currentData) {
        throw new Error("Order information missing. Please re-enter details.");
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentData,
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          paymentMethod: "card",
          shippingMethod: "standard",
          isPrepaid: true,
          couponCodes: [],
          totals: {
            subtotal: latestCalculation?.originalSubtotal || 0,
            shipping: latestCalculation?.shippingCost || 0,
            codFee: 0,
            total: latestCalculation?.finalTotal || 0,
          },
          paymentDetails: {
            paymentId: paymentData.paymentId,
            razorpayOrderId: paymentData.razorpayOrderId,
            razorpaySignature: paymentData.razorpaySignature,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to record confirmed order");
      }

      setPlacedOrder({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
      });
      setPendingOrder(null);
      clearCart();
      clearCoupons();
    } catch (e) {
      console.error("Failed to complete order after payment:", e);
      setOrderError(e instanceof Error ? e.message : "Payment succeeded but order creation failed. Please contact support.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentError = (error: string) => {
    setOrderError(error);
  };

  if (items.length === 0 && !placedOrder && !pendingOrder) {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f5] p-4 pt-20 sm:pt-24">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-sm w-full text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-serif text-lg mb-4 text-gray-800">Your cart is empty</p>
            <Link href="/shop" className="bg-[#1a1a1a] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#b59a5c] transition-colors block text-center">
              Return to shop
            </Link>
          </div>
        </div>
        {/* [PAUSED] <SpinWheel /> */}
      </>
    );
  }

  // Razorpay Payment Screen
  if (pendingOrder) {
    return (
      <>
        <div className="min-h-screen bg-[#faf8f5] pb-16 pt-20 sm:pt-24">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <h2 className="font-serif text-2xl text-gray-900 mb-2">Complete Your Payment</h2>
              <p className="text-sm text-gray-500">Secure gateway powered by Razorpay</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Amount to Pay</span>
                <span className="text-2xl font-bold text-gray-900">₹{Number(pendingOrder.total).toLocaleString("en-IN")}</span>
              </div>
              <div className="border-t border-gray-200 my-3"></div>
              <p className="text-xs text-green-700 text-center font-medium">
                ✓ Includes 5% extra discount for prepaid payment
              </p>
            </div>

            {orderError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{orderError}</p>
              </div>
            )}

            <RazorpayPayment
              amount={Number(pendingOrder.total)}
              orderNumber={pendingOrder.orderNumber}
              razorpayOrderId={pendingOrder.razorpayOrderId}
              razorpayKey={pendingOrder.razorpayKey}
              customerDetails={{
                name: `${formDataRef.current?.firstName || ''} ${formDataRef.current?.lastName || ''}`.trim(),
                email: formDataRef.current?.email || '',
                phone: formDataRef.current?.phone || '',
              }}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onDismiss={() => {
                setPendingOrder(null);
                setOrderError("Payment was cancelled. You can change details or choose Cash on Delivery.");
              }}
            />

            <button
              onClick={() => {
                setPendingOrder(null);
                setOrderError(null);
              }}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Cancel and go back
            </button>
          </motion.div>
          </div>
        </div>
        {/* [PAUSED] <SpinWheel /> */}
      </>
    );
  }

  if (placedOrder) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8f5] p-4 pt-24 sm:pt-32">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="font-serif text-2xl text-gray-900 mb-2">Order Confirmed!</h2>
          <p className="text-sm text-gray-500 mb-2">Thank you for your purchase.</p>
          <p className="text-lg font-semibold text-[#b59a5c] mb-2">Order #{placedOrder.orderNumber}</p>
          <p className="text-xs text-gray-400 mb-6">
            A confirmation email has been sent to you
          </p>
          
          <div className="space-y-3">
            <Link 
              href={`/track-order`} 
              className="bg-[#b59a5c] text-white px-6 py-3 rounded text-xs font-bold uppercase tracking-widest hover:bg-[#a08a4f] transition-colors block text-center"
            >
              Track Your Order
            </Link>
            <Link 
              href="/shop" 
              className="bg-[#1a1a1a] text-white px-6 py-3 rounded text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors block text-center"
            >
              Continue Shopping
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] pb-16 pt-20 sm:pt-24">
      {/* COD Warning Modal */}
      {showCodModal && formDataRef.current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center"
          >
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💸</span>
            </div>
            <h3 className="font-serif text-xl font-medium text-gray-900 mb-2">Wait! Save ₹149 on COD fee</h3>
            <p className="text-sm text-gray-600 mb-6">
              You selected Cash on Delivery, which includes an extra ₹149 convenience fee. Switch to Prepaid to save this fee AND get an extra 5% off!
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsPrepaid(true);
                  setShowCodModal(false);
                }}
                className="w-full bg-[#1a1a1a] text-white py-3 rounded text-sm font-semibold hover:bg-black transition-colors shadow-md"
              >
                Switch to Prepaid & Save
              </button>
              <button
                onClick={() => {
                  setShowCodModal(false);
                  onSubmit(formDataRef.current!);
                }}
                className="w-full bg-white text-gray-600 border border-gray-200 py-3 rounded text-sm font-semibold hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </span>
                ) : (
                  "Continue with COD (Pay ₹149 Extra)"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Form Side */}
          <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-sm">
            
            {/* Stepper Header */}
            <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4 sm:justify-between">
              {steps.map((s, idx) => (
                <div key={s.id} className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep === s.id ? "bg-[#b59a5c] text-white" : currentStep > s.id ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    {currentStep > s.id ? <Check size={12} /> : s.id}
                  </div>
                  <span className={`text-xs font-medium ${currentStep === s.id ? "text-gray-900 font-semibold" : "text-gray-400"}`}>{s.label}</span>
                  {idx < steps.length - 1 && <div className="h-[1px] w-8 bg-gray-200 hidden md:block" /> }
                </div>
              ))}
            </div>

            {orderError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{orderError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-serif text-lg text-gray-800 mb-2">Contact & Shipping</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address *</label>
                    <input 
                      {...register("email")}
                      type="email" 
                      placeholder="email@address.com" 
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c]"
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">First Name *</label>
                      <input 
                        {...register("firstName")}
                        type="text" 
                        placeholder="John" 
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c]"
                      />
                      {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name *</label>
                      <input 
                        {...register("lastName")}
                        type="text" 
                        placeholder="Doe" 
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c]"
                      />
                      {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address *</label>
                    <input 
                      {...register("address")}
                      type="text" 
                      placeholder="Apartment, suite, street no." 
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c]"
                    />
                    {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City *</label>
                      <input 
                        {...register("city")}
                        type="text" 
                        placeholder="New Delhi" 
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c]"
                      />
                      {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">State *</label>
                      <input 
                        {...register("state")}
                        type="text" 
                        placeholder="Delhi" 
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c]"
                      />
                      {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Postal Code *</label>
                      <input 
                        {...register("postalCode")}
                        type="text" 
                        placeholder="110001" 
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c]"
                      />
                      {errors.postalCode && <p className="text-xs text-red-500 mt-1">{errors.postalCode.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone *</label>
                    <input 
                      {...register("phone")}
                      type="tel" 
                      placeholder="9876543210" 
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#b59a5c]"
                    />
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                  </div>
                </div>
              </div>
            )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-serif text-lg text-gray-800 mb-2">Payment Method</h3>
                  
                  <div className="space-y-3">
                    <label className={`flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                      isPrepaid === true ? "border-[#b59a5c] bg-[#b59a5c]/5" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <div className="flex items-center space-x-3">
                        <input 
                          type="radio" 
                          checked={isPrepaid === true}
                          onChange={() => setIsPrepaid(true)}
                          className="text-[#b59a5c]"
                        />
                      <div className="flex items-center space-x-2">
                        <CreditCard size={20} className="text-gray-500" />
                        <div>
                          <p className="text-sm font-semibold">UPI / Card / Net Banking</p>
                          <p className="text-xs text-gray-400">Secure payment via Razorpay</p>
                        </div>
                      </div>
                    </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">+5% off</span>
                    </label>

                    <label className={`flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                      isPrepaid === false ? "border-[#b59a5c] bg-[#b59a5c]/5" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <div className="flex items-center space-x-3">
                        <input 
                          type="radio" 
                          checked={isPrepaid === false}
                          onChange={() => setIsPrepaid(false)}
                          className="text-[#b59a5c]"
                        />
                        <div>
                          <p className="text-sm font-semibold">Cash on Delivery</p>
                          <p className="text-xs text-gray-400">Pay when you receive</p>
                        </div>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">+₹149</span>
                    </label>
                  </div>

                  {/* Order Summary for Mobile */}
                  <div className="lg:hidden mt-6">
                    {/* [PAUSED] <CouponSection /> */}
                    <OrderSummary showCouponSection={false} />
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                {currentStep > 1 ? (
                  <button type="button" onClick={handlePrevStep} className="text-sm text-gray-500 font-medium hover:text-black sm:text-left">
                    Back
                  </button>
                ) : <div />}
                
                {currentStep < 2 ? (
                  <button 
                    type="button"
                    onClick={handleNextStep}
                    className="flex w-full items-center justify-center space-x-2 rounded bg-[#1a1a1a] px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#b59a5c] sm:w-auto"
                  >
                    <span>Continue</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button 
                    type="submit"
                    disabled={isSubmitting || isPrepaid === null}
                    className="flex w-full items-center justify-center space-x-2 rounded bg-[#1a1a1a] px-6 py-3 text-center text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#b59a5c] disabled:opacity-50 sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {isPrepaid === null ? "Select Payment Method" : isPrepaid ? "Continue to Payment" : "Place Order"} - ₹{(calculation?.finalTotal || 0).toLocaleString("en-IN")}
                        </span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>

            {/* Summary Side */}
          <div className="lg:col-span-5 space-y-4 hidden lg:block">
            <OrderSummary />
            {/* [PAUSED] <CouponSection /> */}
          </div>

        </div>
      </div>
      {/* [PAUSED] <SpinWheel /> - Uncomment when running gamified spin promotions */}
    </div>
  );
}
