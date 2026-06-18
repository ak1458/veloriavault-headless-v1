import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getWcOrder, updateWcOrder, getOrderMeta } from "@/lib/woocommerce-orders";
import { syncPaidOrderToShiprocket } from "@/lib/order-fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook — the server-side safety net for the "browser dropped after
 * payment" case. When Razorpay reports `payment.captured`, mark the matching
 * WooCommerce order paid and fulfil it, even if the client never called
 * /api/checkout/update-payment.
 *
 * Configure in Razorpay Dashboard → Webhooks: <host>/api/razorpay/webhook,
 * event `payment.captured`, secret = RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = request.headers.get("x-razorpay-signature");
  const raw = await request.text();

  if (!secret || !signature) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  // Verify the signature (timing-safe) against the raw body.
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    console.warn("[RazorpayWebhook] Signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; amount?: number; notes?: Record<string, string> } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Acknowledge non-capture events quickly so Razorpay stops retrying.
  if (event.event !== "payment.captured") {
    return NextResponse.json({ received: true });
  }

  const payment = event.payload?.payment?.entity;
  const wcOrderId = payment?.notes?.order_id;
  if (!payment?.id || !wcOrderId) {
    return NextResponse.json({ received: true });
  }

  try {
    const order = await getWcOrder(wcOrderId);
    if (!order) {
      console.error(`[RazorpayWebhook] WC order ${wcOrderId} not found`);
      return NextResponse.json({ received: true });
    }

    // Idempotency: if already paid/processing, do nothing.
    const alreadyPaid =
      getOrderMeta(order, "_payment_status") === "completed" ||
      ["processing", "completed"].includes(order.status);
    if (alreadyPaid) {
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    // Confirm the captured amount covers the server-authoritative charge.
    const charge = getOrderMeta(order, "_headless_charge_amount");
    const expectedPaise = charge ? Math.round(parseFloat(charge) * 100) : NaN;
    const capturedPaise = typeof payment.amount === "number" ? payment.amount : NaN;
    if (Number.isFinite(expectedPaise) && Number.isFinite(capturedPaise) && capturedPaise + 1 < expectedPaise) {
      console.error(`[RazorpayWebhook] Underpayment on order ${wcOrderId}: ${capturedPaise} < ${expectedPaise}`);
      return NextResponse.json({ received: true, underpaid: true });
    }

    const updated = await updateWcOrder(order.id, {
      status: "processing",
      set_paid: true,
      transaction_id: payment.id,
      meta_data: [
        { key: "_razorpay_payment_id", value: payment.id },
        { key: "_payment_status", value: "completed" },
        { key: "_paid_via", value: "razorpay_webhook" },
      ],
    });

    if (updated) {
      syncPaidOrderToShiprocket(updated);
    }
    return NextResponse.json({ received: true, processed: true });
  } catch (e) {
    console.error("[RazorpayWebhook] Error:", e instanceof Error ? e.message : e);
    // Return 200 so Razorpay doesn't hammer retries on a transient WC outage;
    // the client update-payment path is the secondary guard.
    return NextResponse.json({ received: true });
  }
}
