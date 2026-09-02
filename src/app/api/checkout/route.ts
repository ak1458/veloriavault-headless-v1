/**
 * ============================================================
 * SECURE CHECKOUT API — /api/checkout
 * ============================================================
 * 
 * SECURITY FEATURES:
 * - Rate limiting (3 attempts per minute per IP)
 * - Stock validation before order creation
 * - Price validation from WooCommerce (tamper-proof)
 * - Input sanitization (XSS prevention)
 * - Coupon validation server-side
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { calculateDiscounts } from "@/lib/coupon-calculator";
import { buildOrderFeeLines } from "@/lib/order-fees";
import { getProductsByIds, getProductById } from "@/lib/woocommerce";
import { verifyToken } from "@/lib/auth/jwt";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { createShiprocketOrder } from "@/lib/shiprocket";
import { syncPaidOrderToShiprocket } from "@/lib/order-fulfillment";
import jwt from "jsonwebtoken";

// Basic HTML sanitizer for security
function stripHtmlTags(str: string): string {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
}

const checkoutSchema = z.object({
  email: z.string().email("Invalid email address").transform(stripHtmlTags),
  firstName: z.string().min(1, "First name is required").transform(stripHtmlTags),
  lastName: z.string().min(1, "Last name is required").transform(stripHtmlTags),
  address: z.string().min(5, "Address is required").transform(stripHtmlTags),
  city: z.string().min(2, "City is required").transform(stripHtmlTags),
  state: z.string().min(2, "State is required").transform(stripHtmlTags),
  postalCode: z.string().min(4, "Valid postal code is required").transform(stripHtmlTags),
  phone: z.string().min(10, "Valid phone number is required").transform(stripHtmlTags),
  paymentMethod: z.enum(["card", "cod"]),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  isPrepaid: z.boolean().default(true),
  items: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      quantity: z.number().min(1),
      price: z.number().positive(),
    })
  ).min(1, "Cart is empty"),
  couponCodes: z.array(z.string()).default([]),
  discounts: z.object({
    tierDiscount: z.number().default(0),
    prepaidDiscount: z.number().default(0),
    manualCouponDiscount: z.number().default(0),
  }).optional(),
  totals: z.object({
    subtotal: z.number(),
    shipping: z.number(),
    codFee: z.number(),
    total: z.number(),
  }),
  paymentDetails: z.object({
    paymentId: z.string().min(1),
    razorpayOrderId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  }).optional(),
});

const WC_API_URL = process.env.WC_API_URL?.trim();
const CONSUMER_KEY = process.env.WC_CONSUMER_KEY?.trim();
const CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET?.trim();

function getAuthHeader(): string {
  return "Basic " + Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
}

/**
 * Validate stock availability for all items
 */
async function validateStock(
  items: Array<{ id: number; name: string; quantity: number }>
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Fetch real products with stock info
  const productIds = items.map((i) => i.id);
  const realProducts = await getProductsByIds(productIds);
  
  // For any missing products (likely variations), fetch individually
  const missingIds = productIds.filter((id) => !realProducts.find((p) => p.id === id));
  if (missingIds.length > 0) {
    const individualFetches = await Promise.all(
      missingIds.map((id) => getProductById(id))
    );
    for (const p of individualFetches) {
      if (p) realProducts.push(p);
    }
  }

  // Check stock for each item
  for (const item of items) {
    const product = realProducts.find((p) => p.id === item.id);
    
    if (!product) {
      errors.push(`Product not found: ${item.name}`);
      continue;
    }
    
    if (product.stock_status === "outofstock") {
      errors.push(`${product.name} is out of stock`);
      continue;
    }
    
    if (product.stock_quantity !== null && product.stock_quantity !== undefined) {
      if (product.stock_quantity < item.quantity) {
        errors.push(
          `${product.name} only has ${product.stock_quantity} items in stock (you requested ${item.quantity})`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function POST(request: NextRequest) {
  try {
    // ========================================
    // RATE LIMITING CHECK
    // ========================================
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(
      `checkout:${clientIP}`,
      RATE_LIMITS.CHECKOUT.limit,
      RATE_LIMITS.CHECKOUT.windowMs
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.message },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.resetTime),
          }
        }
      );
    }

    // ========================================
    // VALIDATE INPUT
    // ========================================
    const body = await request.json();
    const validatedData = checkoutSchema.parse(body);

    if (!WC_API_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
      console.error("[Checkout] Missing environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // ========================================
    // STOCK VALIDATION (CRITICAL SECURITY CHECK)
    // ========================================
    const stockValidation = await validateStock(validatedData.items);
    if (!stockValidation.valid) {
      return NextResponse.json(
        { 
          error: "Some items are unavailable", 
          details: stockValidation.errors,
          code: "STOCK_ERROR"
        },
        { status: 400 }
      );
    }

    // ========================================
    // PRICE VALIDATION (Tamper-proof)
    // ========================================
    const productIds = validatedData.items.map((i) => i.id);
    const realProducts = await getProductsByIds(productIds);

    // Map real prices to items
    const secureItems = validatedData.items.map((clientItem) => {
      const realProduct = realProducts.find((p) => p.id === clientItem.id);
      if (!realProduct) {
        console.error(`[Checkout] SECURITY: Product ${clientItem.id} (${clientItem.name}) not found in WC � rejecting order`);
        throw new Error(`Product "${clientItem.name}" could not be verified. Please refresh your cart.`);
      }
      return {
        ...clientItem,
        price: parseFloat(realProduct.price || realProduct.regular_price || "0"),
        slug: "",
        image: "",
        category: "",
      };
    });

    console.log("[Checkout] Stock validated, Secure items:", secureItems.length);

    // ========================================
    // AUTHENTICATION & DISCOUNTS
    // ========================================
    let customerId = 0;
    let luckyDrawDiscount = 0;

    // Check for Lucky Draw token
    const luckyToken = request.cookies.get("veloria_lucky_draw")?.value;
    if (luckyToken) {
      try {
        const secret = process.env.JWT_SECRET as string;
        const decoded = jwt.verify(luckyToken, secret) as { discount: number };
        luckyDrawDiscount = decoded.discount;
      } catch {
        // Invalid/expired lucky draw token - ignore
      }
    }

    // Check for authenticated user
    const authToken = request.cookies.get("token")?.value;
    if (authToken) {
      try {
        const payload = await verifyToken(authToken);
        if (payload?.userId) {
          customerId = payload.userId as number;
        }
      } catch {
        // Not authenticated - continue as guest
      }
    }

    // Calculate discounts server-side (only 5% prepaid bonus active)
    const calculation = calculateDiscounts({
      items: secureItems,
      appliedCouponCodes: validatedData.couponCodes,
      isPrepaid: validatedData.isPrepaid,
      luckyDrawDiscount,
    });

    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim() || "";
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim() || "";

    // ========================================
    // CASE 1: PREPAID INITIATION (NO WOOCOMMERCE ORDER YET)
    // Avoid creating any WooCommerce order until the customer genuinely pays.
    // If they cancel or close Razorpay, WooCommerce remains 100% clean!
    // ========================================
    if (validatedData.paymentMethod === "card" && !validatedData.paymentDetails) {
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        console.error("[Checkout] Missing Razorpay credentials");
        return NextResponse.json(
          { error: "Payment gateway not configured" },
          { status: 500 }
        );
      }

      const rzpAuth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
      const safeReceipt = `vv_${Date.now().toString().slice(-8)}`;

      const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${rzpAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(calculation.finalTotal * 100),
          currency: "INR",
          receipt: safeReceipt,
          notes: {
            customer_email: validatedData.email.substring(0, 250),
            customer_phone: validatedData.phone.substring(0, 250),
            customer_name: `${validatedData.firstName} ${validatedData.lastName}`.substring(0, 250),
          },
        }),
      });

      if (!rzpResponse.ok) {
        const errorData = await rzpResponse.json().catch(() => ({}));
        console.error("[Checkout] Razorpay order initiation failed:", errorData);
        return NextResponse.json(
          { error: "Failed to initialize payment gateway" },
          { status: 500 }
        );
      }

      const rzpOrder = await rzpResponse.json();

      return NextResponse.json({
        success: true,
        paymentRequired: true,
        razorpayOrderId: rzpOrder.id,
        amount: calculation.finalTotal,
        key: RAZORPAY_KEY_ID,
        currency: "INR",
        orderNumber: safeReceipt,
        calculation: {
          subtotal: calculation.originalSubtotal,
          tierDiscount: calculation.tierDiscount,
          prepaidDiscount: calculation.prepaidDiscount,
          manualCouponDiscount: calculation.manualCouponDiscount,
          shipping: calculation.shippingCost,
          codFee: calculation.codFee,
          finalTotal: calculation.finalTotal,
          savingsBreakdown: calculation.savingsBreakdown,
        },
      });
    }

    // ========================================
    // CASE 2: PREPAID PAYMENT VERIFICATION
    // If prepaid, verify the cryptographic signature before creating the order
    // ========================================
    const isPaidCard = validatedData.paymentMethod === "card" && Boolean(validatedData.paymentDetails);
    if (isPaidCard) {
      if (!RAZORPAY_KEY_SECRET) {
        return NextResponse.json(
          { error: "Payment verification configuration error" },
          { status: 500 }
        );
      }

      const { paymentId, razorpayOrderId, razorpaySignature } = validatedData.paymentDetails!;
      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${paymentId}`)
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        console.error(`[Checkout] Signature mismatch: expected ${expectedSignature}, got ${razorpaySignature}`);
        return NextResponse.json(
          { error: "Payment verification failed" },
          { status: 403 }
        );
      }
    }

    // ========================================
    // CREATE GENUINE WOOCOMMERCE ORDER (Paid Prepaid OR COD)
    // ========================================
    const orderData = {
      payment_method: isPaidCard ? "razorpay" : "cod",
      payment_method_title: isPaidCard 
        ? "UPI / Card / Net Banking (Razorpay)" 
        : "Cash on Delivery",
      set_paid: isPaidCard,
      status: "processing", // Real confirmed orders start as processing
      ...(isPaidCard ? { transaction_id: validatedData.paymentDetails!.paymentId } : {}),
      currency: "INR",
      billing: {
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        address_1: validatedData.address,
        address_2: "",
        city: validatedData.city,
        state: validatedData.state,
        postcode: validatedData.postalCode,
        country: "IN",
        email: validatedData.email,
        phone: validatedData.phone,
      },
      shipping: {
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        address_1: validatedData.address,
        address_2: "",
        city: validatedData.city,
        state: validatedData.state,
        postcode: validatedData.postalCode,
        country: "IN",
      },
      line_items: validatedData.items.map((item) => {
        const realProduct = realProducts.find((p) => p.id === item.id);
        return {
          product_id: realProduct?.parent_id || item.id,
          variation_id: realProduct?.parent_id ? item.id : 0,
          quantity: item.quantity,
        };
      }),
      shipping_lines: [
        {
          method_id: validatedData.shippingMethod || "standard",
          method_title: (validatedData.shippingMethod || "standard") === "standard" 
            ? "Standard Shipping" 
            : "Express Shipping",
          total: calculation.shippingCost.toString(),
        },
      ],
      fee_lines: buildOrderFeeLines(calculation),
      meta_data: [
        { key: "_order_source", value: "Next.js Headless" },
        { key: "_is_prepaid", value: validatedData.isPrepaid ? "yes" : "no" },
        { key: "_tier_discount", value: calculation.tierDiscount.toString() },
        { key: "_prepaid_discount", value: calculation.prepaidDiscount.toString() },
        { key: "_manual_coupon_discount", value: calculation.manualCouponDiscount.toString() },
        { key: "_original_subtotal", value: calculation.originalSubtotal.toString() },
        { key: "_total_savings", value: calculation.savingsBreakdown.reduce((sum, s) => sum + s.amount, 0).toString() },
        { key: "_headless_charge_amount", value: calculation.finalTotal.toString() },
        ...(isPaidCard ? [
          { key: "_razorpay_order_id", value: validatedData.paymentDetails!.razorpayOrderId },
          { key: "_razorpay_payment_id", value: validatedData.paymentDetails!.paymentId },
          { key: "_payment_status", value: "completed" },
        ] : []),
        { key: "_customer_ip", value: clientIP },
      ],
      customer_id: customerId,
    };

    // Create order in WooCommerce
    const response = await fetch(`${WC_API_URL}/orders`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Checkout] WooCommerce API error:", errorData);
      return NextResponse.json(
        { error: "Failed to create order", details: errorData },
        { status: 500 }
      );
    }

    const order = await response.json();

    // ========================================
    // SHIPROCKET SYNC
    // ========================================
    if (isPaidCard) {
      syncPaidOrderToShiprocket(order);
    } else if (validatedData.paymentMethod === "cod") {
      createShiprocketOrder({
        orderId: order.id,
        orderDate: new Date().toISOString().split("T")[0] + " " + new Date().toTimeString().split(" ")[0],
        customer: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          phone: validatedData.phone,
          address: validatedData.address,
          city: validatedData.city,
          state: validatedData.state,
          postalCode: validatedData.postalCode,
        },
        items: secureItems.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod: "cod",
        subtotal: calculation.originalSubtotal,
        shippingCharges: calculation.shippingCost,
        discount: calculation.prepaidDiscount + calculation.manualCouponDiscount,
        total: calculation.finalTotal,
      }).catch((err) => console.error("[Checkout] Shiprocket COD sync failed (non-blocking):", err));
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.number,
      total: calculation.finalTotal,
      status: order.status,
      paymentRequired: false,
      calculation: {
        subtotal: calculation.originalSubtotal,
        tierDiscount: calculation.tierDiscount,
        prepaidDiscount: calculation.prepaidDiscount,
        manualCouponDiscount: calculation.manualCouponDiscount,
        shipping: calculation.shippingCost,
        codFee: calculation.codFee,
        finalTotal: calculation.finalTotal,
        savingsBreakdown: calculation.savingsBreakdown,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("[Checkout] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
