interface OrderLike {
  status: string;
  date_created: string;
  billing?: { email?: string };
}

const DAY = 24 * 60 * 60 * 1000;

export function sessionOwnsOrder(order: { billing?: { email?: string } }, email: string): boolean {
  return (order.billing?.email || "").toLowerCase().trim() === email.toLowerCase().trim();
}

// Cancellable: order still open (not shipped/done) AND within 24h of placement.
const CANCELLABLE_STATUSES = new Set(["pending", "processing", "on-hold"]);
export function isCancellable(order: OrderLike, now: Date = new Date()): { ok: boolean; reason?: string } {
  if (!CANCELLABLE_STATUSES.has(order.status)) {
    return { ok: false, reason: "This order can no longer be cancelled online. Please contact care@veloriavault.com." };
  }
  const created = new Date(order.date_created).getTime();
  if (!Number.isFinite(created) || now.getTime() - created > DAY) {
    return { ok: false, reason: "The 24-hour cancellation window has passed. Please contact care@veloriavault.com." };
  }
  return { ok: true };
}

// Returnable: order is processing/completed AND within the 7-day return policy.
const RETURNABLE_STATUSES = new Set(["processing", "completed"]);
export function isReturnable(order: OrderLike, now: Date = new Date()): { ok: boolean; reason?: string } {
  if (!RETURNABLE_STATUSES.has(order.status)) {
    return { ok: false, reason: "Returns can only be requested for processing or delivered orders." };
  }
  const created = new Date(order.date_created).getTime();
  if (!Number.isFinite(created) || now.getTime() - created > 7 * DAY) {
    return { ok: false, reason: "The 7-day return window has passed. Please contact care@veloriavault.com." };
  }
  return { ok: true };
}
