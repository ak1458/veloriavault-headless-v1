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
import { calculateDiscounts } from "@/lib/coupon-calculator";
import { buildOrderFeeLines } from "@/lib/order-fees";
import { getProductsByIds, getProductById } from "@/lib/woocommerce";
import { verifyToken } from "@/lib/auth/jwt";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { createShiprocketOrder } from "@/lib/shiprocket";
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
  shippingMethod: z.enum(["standard", "express"]),
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

    // Calculate discounts server-side
    const calculation = calculateDiscounts({
      items: secureItems,
      appliedCouponCodes: validatedData.couponCodes,
      isPrepaid: validatedData.isPrepaid,
      luckyDrawDiscount,
    });

    // ========================================
    // CREATE WOOCOMMERCE ORDER
    // ========================================
    const orderData = {
      payment_method: validatedData.paymentMethod === "cod" ? "cod" : "razorpay",
      payment_method_title: validatedData.paymentMethod === "cod" 
        ? "Cash on Delivery" 
        : "UPI / Card / Net Banking",
      set_paid: false,
      status: "pending",
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
          method_id: validatedData.shippingMethod,
          method_title: validatedData.shippingMethod === "standard" 
            ? "Standard Shipping" 
            : "Express Shipping",
          total: calculation.shippingCost.toString(),
        },
      ],
      // All site discounts (tier/prepaid/coupons/lucky-draw) are written as
      // itemized NEGATIVE fee lines + the positive COD fee, so the WooCommerce
      // order total equals the real amount charged (== _headless_charge_amount).
      // Config coupons are NOT WC coupons, so coupon_lines are intentionally
      // omitted — their value is already inside the negative fee lines.
      fee_lines: buildOrderFeeLines(calculation),
      meta_data: [
        { key: "_order_source", value: "Next.js Headless" },
        { key: "_is_prepaid", value: validatedData.isPrepaid ? "yes" : "no" },
        { key: "_tier_discount", value: calculation.tierDiscount.toString() },
        { key: "_prepaid_discount", value: calculation.prepaidDiscount.toString() },
        { key: "_manual_coupon_discount", value: calculation.manualCouponDiscount.toString() },
        { key: "_original_subtotal", value: calculation.originalSubtotal.toString() },
        { key: "_total_savings", value: calculation.savingsBreakdown.reduce((sum, s) => sum + s.amount, 0).toString() },
        // Server-authoritative charge amount (incl. all custom discounts the WC
        // order total does NOT reflect). Read back by create-order/update-payment
        // so the Razorpay amount can never be set by the client. See SECURITY.
        { key: "_headless_charge_amount", value: calculation.finalTotal.toString() },
        { key: "_customer_ip", value: clientIP }, // For fraud detection
      ],
      customer_id: customerId,
    };

    // Create order. Fee lines never fail coupon validation, so no retry needed.
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
    const wpBaseUrl = WC_API_URL.replace(/\/wp-json\/wc\/v3\/?$/, "");
    const paymentUrl =
      validatedData.paymentMethod === "cod"
        ? null
        : order.payment_url ||
          order.checkout_payment_url ||
          (order.order_key
            ? `${wpBaseUrl}/checkout/order-pay/${order.id}/?pay_for_order=true&key=${encodeURIComponent(order.order_key)}`
            : null);

    if (validatedData.paymentMethod !== "cod" && !paymentUrl) {
      return NextResponse.json(
        { error: "Payment link could not be generated" },
        { status: 500 },
      );
    }

    // ========================================
    // SHIPROCKET SYNC (COD orders sync immediately)
    // Prepaid orders sync after payment in update-payment route
    // ========================================
    if (validatedData.paymentMethod === "cod") {
      // Fire-and-forget — don't block checkout response
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
      }).catch((err) => console.error("[Checkout] Shiprocket sync failed (non-blocking):", err));
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.number,
      total: calculation.finalTotal, // Fix: Use headless calculated total, not WC total which lacks custom discounts
      status: order.status,
      paymentRequired: validatedData.paymentMethod !== "cod",
      paymentUrl,
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
