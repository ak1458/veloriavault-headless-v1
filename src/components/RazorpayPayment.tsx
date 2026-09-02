"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface RazorpayPaymentProps {
  amount: number;
  orderId?: string;
  orderNumber?: string;
  razorpayOrderId?: string;
  razorpayKey?: string;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
  };
  onSuccess: (paymentData: { paymentId: string; razorpayOrderId: string; razorpaySignature: string }) => void;
  onError: (error: string) => void;
  onDismiss?: () => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
  handler: (response: RazorpayResponse) => Promise<void>;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): {
    open: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export default function RazorpayPayment({
  amount,
  orderId,
  orderNumber,
  razorpayOrderId,
  razorpayKey,
  customerDetails,
  onSuccess,
  onError,
  onDismiss,
}: RazorpayPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const hasOpened = useRef(false);

  const loadRazorpayScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Window not available"));
        return;
      }
      
      if (window.Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.body.appendChild(script);
    });
  }, []);

  const handlePayment = async () => {
    // Prevent double-click or auto-trigger
    if (hasOpened.current || isLoading) {
      return;
    }
    hasOpened.current = true;
    setIsLoading(true);
    try {
      // Load Razorpay SDK
      await loadRazorpayScript();

      let rzpOrderId = razorpayOrderId;
      let rzpKey = razorpayKey;

      // If razorpayOrderId is not provided, create via API (backwards compatibility fallback)
      if (!rzpOrderId || !rzpKey) {
        const response = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            orderId: orderId || "",
            orderNumber: orderNumber || "",
            customerDetails,
          }),
        });

        const orderData = await response.json();

        if (!response.ok) {
          throw new Error(orderData.error || "Failed to create payment order");
        }

        rzpOrderId = orderData.orderId;
        rzpKey = orderData.key;
      }

      const options: RazorpayOptions = {
        key: rzpKey!,
        amount: Math.round(amount * 100),
        currency: "INR",
        name: "Veloria Vault",
        description: `Order #${orderNumber || "Checkout"}`,
        order_id: rzpOrderId!,
        prefill: {
          name: customerDetails.name,
          email: customerDetails.email,
          contact: customerDetails.phone,
        },
        theme: {
          color: "#b59a5c",
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            hasOpened.current = false; // Allow retry if dismissed
            onDismiss?.();
          },
        },
        handler: async (response: RazorpayResponse) => {
          onSuccess({
            paymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK unavailable");
      }

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      hasOpened.current = false; // Allow retry on error
      onError(error instanceof Error ? error.message : "Payment failed");
    }
  };

  useEffect(() => {
    // Automatically trigger payment when component mounts
    handlePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-4 py-4 text-gray-500">
      {isLoading ? (
        <div className="flex flex-col items-center space-y-3">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <p className="text-sm font-medium">Initializing Secure Payment...</p>
        </div>
      ) : (
        <button
          onClick={handlePayment}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-[#072654] text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#0d3a7a] transition-colors disabled:opacity-50 rounded shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Pay Securely with Razorpay</span>
        </button>
      )}
    </div>
  );
}
