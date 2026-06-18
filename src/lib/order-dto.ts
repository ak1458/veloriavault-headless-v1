export interface OrderDTO {
  id: number;
  number: string;
  status: string;
  total: string;
  amountPaid: string;
  paymentMethod: string;
  paymentId: string | null;
  dateCreated: string;
  lineItems: { name: string; quantity: number; total: string }[];
}

interface RawOrder {
  id: number;
  number: string;
  status: string;
  total: string;
  date_created: string;
  payment_method_title?: string;
  meta_data?: { key: string; value: string }[];
  line_items?: { name: string; quantity: number; total: string }[];
}

/** Map a raw WooCommerce order to the customer-facing DTO with the real amount paid. */
export function mapOrderToDTO(order: RawOrder): OrderDTO {
  const meta = order.meta_data || [];
  const charge = meta.find((m) => m.key === "_headless_charge_amount")?.value;
  const payId = meta.find((m) => m.key === "_razorpay_payment_id")?.value ?? null;
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    total: order.total,
    amountPaid: charge ?? order.total,
    paymentMethod: order.payment_method_title ?? "",
    paymentId: payId,
    dateCreated: order.date_created,
    lineItems: (order.line_items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      total: item.total,
    })),
  };
}
