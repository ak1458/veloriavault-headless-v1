/**
 * Razorpay server helpers. Credentials are read at call time.
 */

function rzpAuth(): string {
  return Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
}

/**
 * Refund a captured payment. Pass `amountPaise` for a partial refund, omit for
 * a full refund. Fails safe: returns `{ success: false }` rather than throwing.
 */
export async function refundPayment(
  paymentId: string,
  amountPaise?: number,
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
      {
        method: "POST",
        signal: ctl.signal,
        headers: { Authorization: `Basic ${rzpAuth()}`, "Content-Type": "application/json" },
        body: JSON.stringify(amountPaise ? { amount: amountPaise } : {}),
      },
    );
    clearTimeout(timer);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data?.error?.description || `Refund failed (${res.status})` };
    }
    const data = await res.json();
    return { success: true, refundId: data.id as string };
  } catch (e) {
    clearTimeout(timer);
    return { success: false, error: e instanceof Error ? e.message : "Refund error" };
  }
}

/** Fetch a Razorpay order (used to bind a payment to a WooCommerce order). */
export async function getRazorpayOrder(
  razorpayOrderId: string,
): Promise<{ ok: boolean; order?: { receipt?: string; notes?: Record<string, string> } }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(
      `https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpayOrderId)}`,
      { headers: { Authorization: `Basic ${rzpAuth()}` }, signal: ctl.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return { ok: false };
    return { ok: true, order: await res.json() };
  } catch {
    clearTimeout(timer);
    return { ok: false };
  }
}
