import { createShiprocketOrder } from "@/lib/shiprocket";
import type { WcOrder } from "@/lib/woocommerce-orders";

interface OrderLineItem {
  product_id: number;
  name: string;
  quantity: number;
  price: string;
  sku?: string;
}
interface OrderShippingLine {
  total: string;
}
interface OrderBilling {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_1?: string;
  city?: string;
  state?: string;
  postcode?: string;
}

/**
 * Sync a paid (prepaid) WooCommerce order to Shiprocket. Fire-and-forget — never
 * blocks the caller. Shared by the payment-confirm route and the Razorpay webhook
 * so a captured payment is fulfilled regardless of which path observes it.
 *
 * NOTE: amount handling here matches the pre-existing behaviour (Shiprocket COD
 * amount accuracy is finding #5, intentionally out of scope for this change).
 */
export function syncPaidOrderToShiprocket(order: WcOrder): void {
  const billing = (order.billing as OrderBilling) || {};
  const items = ((order.line_items as OrderLineItem[]) || []).map((item) => ({
    id: item.product_id,
    name: item.name,
    quantity: item.quantity,
    price: parseFloat(item.price) || 0,
    sku: item.sku,
  }));

  const subtotal = parseFloat(order.total || "0");
  const shippingTotal = ((order.shipping_lines as OrderShippingLine[]) || []).reduce(
    (sum, line) => sum + parseFloat(line.total || "0"),
    0,
  );
  const totalSavingsMeta = (order.meta_data || []).find((m) => m.key === "_total_savings");
  const actualDiscount = totalSavingsMeta ? parseFloat(totalSavingsMeta.value) || 0 : 0;

  createShiprocketOrder({
    orderId: order.id,
    orderDate:
      new Date().toISOString().split("T")[0] + " " + new Date().toTimeString().split(" ")[0],
    customer: {
      firstName: billing.first_name || "",
      lastName: billing.last_name || "",
      email: billing.email || "",
      phone: billing.phone || "",
      address: billing.address_1 || "",
      city: billing.city || "",
      state: billing.state || "",
      postalCode: billing.postcode || "",
    },
    items,
    paymentMethod: "prepaid",
    subtotal,
    shippingCharges: shippingTotal,
    discount: actualDiscount,
    total: subtotal,
  }).catch((err) =>
    console.error("[Fulfillment] Shiprocket sync failed (non-blocking):", err),
  );
}
