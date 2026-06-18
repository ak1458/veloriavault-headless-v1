import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail } from "@/lib/auth/session";
import { getWcOrder, updateWcOrder, getOrderMeta, addOrderNote } from "@/lib/woocommerce-orders";
import { sessionOwnsOrder, isCancellable } from "@/lib/orders";
import { refundPayment } from "@/lib/razorpay";
import { cancelShiprocketOrder } from "@/lib/shiprocket";

export const runtime = "nodejs";

const schema = z.object({
  orderId: z.union([z.number(), z.string()]),
  // Guest path: when there is no logged-in session, the customer proves
  // ownership with the billing email they used at checkout (same assurance as
  // order tracking). Ignored when a session is present.
  email: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  let orderId: string | number;
  let bodyEmail: string | undefined;
  try {
    const parsed = schema.parse(await request.json());
    orderId = parsed.orderId;
    bodyEmail = parsed.email;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  // Prefer a verified session email; otherwise fall back to the guest-provided
  // email, which must match the order's billing email (checked below).
  const email = getSessionEmail(request) ?? bodyEmail;
  if (!email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const order = await getWcOrder(orderId);
  if (!order) {
    return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  }
  if (!sessionOwnsOrder(order, email)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  const eligibility = isCancellable(order);
  if (!eligibility.ok) {
    return NextResponse.json({ success: false, error: eligibility.reason }, { status: 409 });
  }

  // Refund prepaid orders that were actually captured. A cancellation is always
  // a FULL refund, so we omit the amount and let Razorpay refund the captured
  // total — avoids any amount-mismatch failures.
  let refunded = false;
  const paymentId = getOrderMeta(order, "_razorpay_payment_id");
  const paymentStatus = getOrderMeta(order, "_payment_status");
  if (paymentId && paymentStatus === "completed") {
    const refund = await refundPayment(paymentId);
    if (!refund.success) {
      // Do NOT cancel if the refund failed — avoid a cancelled-but-unrefunded order.
      console.error(
        `[Cancel] Refund FAILED for order ${order.id} payment ${paymentId}: ${refund.error}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: `Refund could not be processed: ${refund.error || "unknown error"}. Your order is unchanged — please contact care@veloriavault.com.`,
        },
        { status: 502 },
      );
    }
    refunded = true;
    await addOrderNote(order.id, `Customer cancellation — Razorpay refund ${refund.refundId} issued.`);
  }

  // Cancel the Shiprocket shipment if one was created.
  const shiprocketId = getOrderMeta(order, "_shiprocket_order_id");
  if (shiprocketId) {
    await cancelShiprocketOrder(Number(shiprocketId)).catch(() => undefined);
  }

  const updated = await updateWcOrder(order.id, {
    status: "cancelled",
    meta_data: [
      { key: "_cancelled_via", value: "customer" },
      { key: "_cancelled_at", value: new Date().toISOString() },
    ],
  });
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Order refund processed but status update failed. Contact support." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, refunded });
}
