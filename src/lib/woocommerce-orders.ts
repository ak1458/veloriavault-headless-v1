/**
 * Shared WooCommerce order helpers (fetch / update / note) used by the cancel,
 * return, webhook, and live-tracking routes. Credentials read at call time.
 */

const WC_API_URL = process.env.WC_API_URL?.trim();

function wcAuth(): string {
  return (
    "Basic " +
    Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString("base64")
  );
}

export interface WcOrder {
  id: number;
  number: string;
  status: string;
  total: string;
  date_created: string;
  payment_method?: string;
  billing?: { email?: string; first_name?: string; last_name?: string };
  meta_data?: { key: string; value: string }[];
  [key: string]: unknown;
}

export function getOrderMeta(order: WcOrder, key: string): string | undefined {
  return (order.meta_data || []).find((m) => m.key === key)?.value;
}

export async function getWcOrder(orderId: string | number): Promise<WcOrder | null> {
  if (!WC_API_URL) return null;
  try {
    const res = await fetch(`${WC_API_URL}/orders/${encodeURIComponent(String(orderId))}`, {
      headers: { Authorization: wcAuth() },
    });
    if (!res.ok) return null;
    return (await res.json()) as WcOrder;
  } catch {
    return null;
  }
}

export async function updateWcOrder(
  orderId: string | number,
  body: Record<string, unknown>,
): Promise<WcOrder | null> {
  if (!WC_API_URL) return null;
  try {
    const res = await fetch(`${WC_API_URL}/orders/${encodeURIComponent(String(orderId))}`, {
      method: "PUT",
      headers: { Authorization: wcAuth(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as WcOrder;
  } catch {
    return null;
  }
}

export async function addOrderNote(
  orderId: string | number,
  note: string,
  customerNote = false,
): Promise<boolean> {
  if (!WC_API_URL) return false;
  try {
    const res = await fetch(`${WC_API_URL}/orders/${encodeURIComponent(String(orderId))}/notes`, {
      method: "POST",
      headers: { Authorization: wcAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({ note, customer_note: customerNote }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
