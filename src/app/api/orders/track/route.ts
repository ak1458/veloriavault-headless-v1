import { NextRequest, NextResponse } from "next/server";

const WC_API_URL = process.env.WC_API_URL?.trim();
const CONSUMER_KEY = process.env.WC_CONSUMER_KEY?.trim();
const CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET?.trim();

function getAuthHeader(): string {
  return "Basic " + Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
}

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

    if (!WC_API_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
      console.error("[Track Order] Missing environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Search for order by order number
    const response = await fetch(
      `${WC_API_URL}/orders?number=${encodeURIComponent(orderNumber)}`,
      {
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Track Order] WooCommerce API error:", errorData);
      return NextResponse.json(
        { error: "Failed to fetch order" },
        { status: 500 }
      );
    }

    const orders = await response.json();

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: "Order not found. Please check your order number and try again." },
        { status: 404 }
      );
    }

    // Get the first matching order
    const order = orders[0];

    // Verify email matches (security check)
    const orderEmail = order.billing?.email?.toLowerCase().trim();
    const providedEmail = email.toLowerCase().trim();

    if (orderEmail !== providedEmail) {
      return NextResponse.json(
        { error: "Email address does not match our records" },
        { status: 403 }
      );
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
