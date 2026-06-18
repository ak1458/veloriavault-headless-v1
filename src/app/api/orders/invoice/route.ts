import { NextRequest, NextResponse } from "next/server";
import { buildInvoiceModel } from "@/lib/invoice";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { verifyToken } from "@/lib/auth/jwt";
import { readOtpSession } from "@/lib/auth/otp";

export const runtime = "nodejs";

const WC_API_URL = process.env.WC_API_URL?.trim();

function wcAuth(): string {
  return (
    "Basic " +
    Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString("base64")
  );
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const jwtPayload = token ? verifyToken(token) : null;
  const otp = request.cookies.get("otp_session")?.value;
  const sessionEmail = jwtPayload?.email ?? (otp ? readOtpSession(otp)?.email : undefined);

  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!sessionEmail || !orderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!WC_API_URL) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const res = await fetch(`${WC_API_URL}/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: wcAuth() },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const order = await res.json();

  // Ownership check: the order's billing email must match the session.
  if (String(order.billing?.email || "").toLowerCase() !== sessionEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const model = buildInvoiceModel(order);
  const bytes = await renderInvoicePdf(model);

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="veloria-invoice-${model.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
