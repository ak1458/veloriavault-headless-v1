import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { getCustomerById, getCustomerOrders } from "@/lib/woocommerce-customer";

interface CustomerOrderLineItem {
  name: string;
  quantity: number;
  total: string;
}

interface CustomerOrder {
  id: number;
  number: string;
  status: string;
  total: string;
  date_created: string;
  payment_method_title?: string;
  meta_data?: { key: string; value: string }[];
  line_items?: CustomerOrderLineItem[];
}

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get fresh customer data from WooCommerce
    const customer = await getCustomerById(payload.userId);

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    // Get customer orders
    const orders = await getCustomerOrders(customer.id);

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        displayName: `${customer.first_name} ${customer.last_name}`.trim(),
        billing: customer.billing,
        shipping: customer.shipping,
        avatarUrl: customer.avatar_url,
        isPayingCustomer: customer.is_paying_customer,
        dateCreated: customer.date_created,
      },
      orders: (orders as CustomerOrder[]).map((order) => {
        const meta = order.meta_data || [];
        const charge = meta.find((m) => m.key === "_headless_charge_amount")?.value;
        const payId = meta.find((m) => m.key === "_razorpay_payment_id")?.value ?? null;
        return {
          id: order.id,
          number: order.number,
          status: order.status,
          total: order.total,
          // Real amount the customer was charged (WC total now matches it too,
          // but the meta is authoritative for older orders created before the fix).
          amountPaid: charge ?? order.total,
          paymentMethod: order.payment_method_title ?? "",
          paymentId: payId,
          dateCreated: order.date_created,
          lineItems: order.line_items?.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            total: item.total,
          })),
        };
      }),
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Update customer in WooCommerce
    const { updateCustomer } = await import("@/lib/woocommerce-customer");
    const updatedCustomer = await updateCustomer(payload.userId, body);

    if (!updatedCustomer) {
      return NextResponse.json(
        { success: false, error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: updatedCustomer.id,
        email: updatedCustomer.email,
        firstName: updatedCustomer.first_name,
        lastName: updatedCustomer.last_name,
        displayName: `${updatedCustomer.first_name} ${updatedCustomer.last_name}`.trim(),
        billing: updatedCustomer.billing,
        shipping: updatedCustomer.shipping,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
