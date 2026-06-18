interface WCMeta {
  key: string;
  value: string;
}

export interface InvoiceLine {
  name: string;
  qty: number;
  amount: number;
}

export interface InvoiceModel {
  number: string;
  date: string;
  billTo: {
    first_name?: string;
    last_name?: string;
    email?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  lines: InvoiceLine[];
  mrpSubtotal: number;
  discountTotal: number;
  shipping: number;
  codFee: number;
  grandTotal: number;
  paymentMethod: string;
  paymentId: string | null;
}

/**
 * Build an invoice model from a raw WooCommerce order. Discounts are read from
 * negative fee lines, the grand total from `_headless_charge_amount` (the real
 * charge) with `order.total` as a fallback for older orders.
 */
export function buildInvoiceModel(order: Record<string, unknown>): InvoiceModel {
  const lineItems = (order.line_items as Array<Record<string, unknown>>) || [];
  const lines: InvoiceLine[] = lineItems.map((i) => ({
    name: String(i.name ?? ""),
    qty: Number(i.quantity ?? 0),
    amount: parseFloat(String(i.subtotal ?? i.total ?? "0")),
  }));
  const mrpSubtotal = lines.reduce((s, l) => s + l.amount, 0);

  const feeLines = (order.fee_lines as Array<Record<string, unknown>>) || [];
  const discountTotal = feeLines
    .filter((f) => parseFloat(String(f.total)) < 0)
    .reduce((s, f) => s + Math.abs(parseFloat(String(f.total))), 0);
  const codFee = feeLines
    .filter((f) => parseFloat(String(f.total)) > 0)
    .reduce((s, f) => s + parseFloat(String(f.total)), 0);

  const shippingLines = (order.shipping_lines as Array<Record<string, unknown>>) || [];
  const shipping = shippingLines.reduce((s, l) => s + parseFloat(String(l.total ?? "0")), 0);

  const meta = (order.meta_data as WCMeta[]) || [];
  const charge = meta.find((m) => m.key === "_headless_charge_amount")?.value;
  const grandTotal = charge ? parseFloat(charge) : parseFloat(String(order.total ?? "0"));

  return {
    number: String(order.number ?? ""),
    date: String(order.date_created ?? ""),
    billTo: (order.billing as InvoiceModel["billTo"]) || {},
    lines,
    mrpSubtotal,
    discountTotal,
    shipping,
    codFee,
    grandTotal,
    paymentMethod: String(order.payment_method_title ?? ""),
    paymentId: meta.find((m) => m.key === "_razorpay_payment_id")?.value ?? null,
  };
}
