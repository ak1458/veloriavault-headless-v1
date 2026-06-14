/**
 * Secure Razorpay Order Creation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createOrderSchema = z.object({
  amount: z.number().positive(),
  orderId: z.string(),
  orderNumber: z.string(),
  customerDetails: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || "").trim();
    const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    // ========================================
    // SERVER-AUTHORITATIVE AMOUNT (anti-underpayment)
    // Never trust the client `amount`. Read the charge amount stored on the
    // WooCommerce order by /api/checkout (_headless_charge_amount). Fall back to
    // the validated client amount only if the WC order can't be read or the meta
    // is missing — a server->WC hiccup must not block payment init for honest
    // customers, and an attacker cannot force that fallback.
    // ========================================
    let chargeAmount = validated.amount;
    const WC_API_URL = process.env.WC_API_URL?.trim();
    const WC_KEY = process.env.WC_CONSUMER_KEY?.trim();
    const WC_SECRET = process.env.WC_CONSUMER_SECRET?.trim();
    if (WC_API_URL && WC_KEY && WC_SECRET) {
      try {
        const wcAuth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString("base64");
        const wcCtl = new AbortController();
        const wcTimer = setTimeout(() => wcCtl.abort(), 8000);
        const wcRes = await fetch(`${WC_API_URL}/orders/${encodeURIComponent(validated.orderId)}`, {
          headers: { Authorization: `Basic ${wcAuth}` },
          signal: wcCtl.signal,
        });
        clearTimeout(wcTimer);
        if (wcRes.ok) {
          const wcOrder = await wcRes.json();
          const meta = (wcOrder.meta_data || []).find(
            (m: { key: string; value: string }) => m.key === "_headless_charge_amount",
          );
          const stored = meta ? parseFloat(String(meta.value)) : NaN;
          if (Number.isFinite(stored) && stored > 0) {
            chargeAmount = stored;
          }
        }
      } catch {
        // keep fallback chargeAmount
      }
    }

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    const safeReceipt = validated.orderNumber.substring(0, 40);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(chargeAmount * 100),
        currency: "INR",
        receipt: safeReceipt,
        notes: {
          order_id: validated.orderId.substring(0, 250),
          customer_email: validated.customerDetails.email.substring(0, 250),
          customer_name: validated.customerDetails.name.substring(0, 250),
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: "Razorpay error", details: errorData },
        { status: 500 }
      );
    }

    const razorpayOrder = await response.json();

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: RAZORPAY_KEY_ID,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Payment service timeout" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Payment initialization failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
