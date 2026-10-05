import { NextRequest, NextResponse } from "next/server";
import { getWcOrder } from "@/lib/woocommerce-orders";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

const WC_API_URL = process.env.WC_API_URL?.trim();
const NOT_FOUND_MESSAGE =
  "We couldn't find an order with that number and email. Please check both and try again.";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get("orderNumber");
    const email = searchParams.get("email");

    if (!orderNumber || !email) {
      return NextResponse.json(
        { error: "Order number and email are required" },
        { status: 400 }
      );
    }

    if (!rateLimit(`track:${getClientIP(request)}`, 10, 60_000).success) {
      return NextResponse.json({ error: "Too many attempts. Please try again in a minute." }, { status: 429 });
    }

    if (!WC_API_URL) {
      console.error("[Track Order] Missing environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Order number == WooCommerce order id (no sequential-number plugin).
    // NOTE: the WC REST list endpoint has no `number` filter — it silently
    // ignores it and returns the newest orders, so fetch by id instead.
    const normalizedNumber = orderNumber.replace(/^#/, "").trim();
    if (!/^\d+$/.test(normalizedNumber)) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw WC REST order shape
    const order = (await getWcOrder(normalizedNumber)) as any;

    // Same response for "no such order" and "wrong email" so the endpoint
    // can't be used to discover which order numbers exist.
    const orderEmail = String(order?.billing?.email ?? "").toLowerCase().trim();
    if (!order || !orderEmail || orderEmail !== email.toLowerCase().trim()) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    // Real amount charged (custom discounts live in meta, not the WC total).
    const meta: Array<{ key: string; value: string }> = order.meta_data || [];
    const charge = meta.find((m) => m.key === "_headless_charge_amount")?.value;

    // Format the order data
    const orderDetails = {
      id: order.id,
      number: order.number,
      status: order.status,
      total: order.total,
      amountPaid: charge ?? order.total,
      paymentMethod: order.payment_method_title || "",
      dateCreated: order.date_created,
      billing: {
        firstName: order.billing.first_name,
        lastName: order.billing.last_name,
        email: order.billing.email,
        phone: order.billing.phone,
        address: order.billing.address_1,
        city: order.billing.city,
        state: order.billing.state,
        postcode: order.billing.postcode,
      },
      lineItems: order.line_items.map((item: {
        name: string;
        quantity: number;
        total: string;
        image?: { src: string };
      }) => ({
        name: item.name,
        quantity: item.quantity,
        total: item.total,
        image: item.image?.src,
      })),
      shippingLines: order.shipping_lines.map((line: {
        method_title: string;
        total: string;
      }) => ({
        methodTitle: line.method_title,
        total: line.total,
      })),
    };

    return NextResponse.json({
      success: true,
      order: orderDetails,
    });

  } catch (error) {
    console.error("[Track Order] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
