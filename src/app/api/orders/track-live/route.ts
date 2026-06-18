import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth/session";
import { getWcOrder, getOrderMeta } from "@/lib/woocommerce-orders";
import { sessionOwnsOrder } from "@/lib/orders";
import { trackByShipmentId } from "@/lib/shiprocket";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const email = getSessionEmail(request);
  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!email || !orderId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const order = await getWcOrder(orderId);
  if (!order) {
    return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  }
  if (!sessionOwnsOrder(order, email)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const shipmentId = getOrderMeta(order, "_shiprocket_shipment_id");
  if (shipmentId) {
    const tracking = await trackByShipmentId(shipmentId);
    if (tracking) {
      return NextResponse.json({ success: true, fallback: false, orderStatus: order.status, ...tracking });
    }
  }

  // No shipment yet (or tracking unavailable): degrade to the WC order status.
  return NextResponse.json({
    success: true,
    fallback: true,
    orderStatus: order.status,
    status: order.status,
    awb: null,
    etaDate: null,
    checkpoints: [],
  });
}
