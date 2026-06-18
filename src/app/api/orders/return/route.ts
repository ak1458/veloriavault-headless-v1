import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail } from "@/lib/auth/session";
import { getWcOrder, updateWcOrder, addOrderNote } from "@/lib/woocommerce-orders";
import { sessionOwnsOrder, isReturnable } from "@/lib/orders";
import { sendReturnRequestEmail } from "@/lib/mailer";

export const runtime = "nodejs";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "care@veloriavault.com";

const schema = z.object({
  orderId: z.union([z.number(), z.string()]),
  reason: z.string().trim().min(5, "Please tell us a little about the reason").max(2000),
  // Guest path: ownership proven by the billing email (matched below).
  email: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  let orderId: string | number;
  let reason: string;
  let bodyEmail: string | undefined;
  try {
    const parsed = schema.parse(await request.json());
    orderId = parsed.orderId;
    reason = parsed.reason;
    bodyEmail = parsed.email;
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message : "Invalid request";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }

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
  const eligibility = isReturnable(order);
  if (!eligibility.ok) {
    return NextResponse.json({ success: false, error: eligibility.reason }, { status: 409 });
  }

  await addOrderNote(order.id, `Return requested by customer (${email}). Reason: ${reason}`);
  await updateWcOrder(order.id, {
    status: "on-hold",
    meta_data: [
      { key: "_return_requested", value: "yes" },
      { key: "_return_reason", value: reason.slice(0, 500) },
      { key: "_return_requested_at", value: new Date().toISOString() },
    ],
  });

  // Notify support (best-effort).
  try {
    await sendReturnRequestEmail({
      to: SUPPORT_EMAIL,
      orderNumber: order.number,
      customerEmail: email,
      reason,
    });
  } catch (e) {
    console.error("[Return] notify email failed:", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ success: true });
}
