import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail } from "@/lib/auth/session";
import { getWcOrder, updateWcOrder, getOrderMeta, addOrderNote } from "@/lib/woocommerce-orders";
import { sessionOwnsOrder, isCancellable } from "@/lib/orders";
import { refundPayment } from "@/lib/razorpay";
import { cancelShiprocketOrder } from "@/lib/shiprocket";

export const runtime = "nodejs";

const schema = z.object({ orderId: z.union([z.number(), z.string()]) });

export async function POST(request: NextRequest) {
  const email = getSessionEmail(request);
  if (!email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  let orderId: string | number;
  try {
    orderId = schema.parse(await request.json()).orderId;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
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

  // Refund prepaid orders that were actually captured.
  let refunded = false;
  const paymentId = getOrderMeta(order, "_razorpay_payment_id");
  const paymentStatus = getOrderMeta(order, "_payment_status");
  if (paymentId && paymentStatus === "completed") {
    const charge = getOrderMeta(order, "_headless_charge_amount");
    const amountPaise = charge ? Math.round(parseFloat(charge) * 100) : undefined;
    const refund = await refundPayment(paymentId, amountPaise);
    if (!refund.success) {
      // Do NOT cancel if the refund failed — avoid a cancelled-but-unrefunded order.
      return NextResponse.json(
        { success: false, error: "We couldn't process the refund automatically. Please contact care@veloriavault.com — your order is unchanged." },
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
