import { NextRequest, NextResponse } from "next/server";
import { buildInvoiceModel } from "@/lib/invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WC_API_URL = process.env.WC_API_URL?.trim();

function wcAuth(): string {
  return (
    "Basic " +
    Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString("base64")
  );
}

/**
 * Merchant reconciliation: real amount received per order vs MRP, with the
 * Razorpay payment id. Guarded by the ADMIN_API_KEY header so only the owner
 * can read it. Use: curl -H "x-admin-key: <key>" <host>/api/admin/orders
 */
export async function GET(request: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || request.headers.get("x-admin-key") !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!WC_API_URL) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const perPage = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("per_page") || "50")));
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || "1"));

  const res = await fetch(
    `${WC_API_URL}/orders?per_page=${perPage}&page=${page}&orderby=date&order=desc`,
    { headers: { Authorization: wcAuth() } },
  );
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 502 });
  }
  const orders = await res.json();

  const rows = (orders as Array<Record<string, unknown>>).map((order) => {
    const m = buildInvoiceModel(order);
    return {
      orderNumber: m.number,
      date: m.date,
      status: order.status,
      customer: `${m.billTo.first_name ?? ""} ${m.billTo.last_name ?? ""}`.trim(),
      email: m.billTo.email ?? "",
      mrpSubtotal: m.mrpSubtotal,
      discount: m.discountTotal,
      shipping: m.shipping,
      codFee: m.codFee,
      amountReceived: m.grandTotal,
      paymentMethod: m.paymentMethod,
      paymentId: m.paymentId,
    };
  });

  const totalReceived = rows.reduce((s, r) => s + r.amountReceived, 0);
  return NextResponse.json({ success: true, page, count: rows.length, totalReceived, orders: rows });
}
