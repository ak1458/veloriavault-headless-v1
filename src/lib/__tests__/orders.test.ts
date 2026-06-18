import { describe, it, expect } from "vitest";
import { sessionOwnsOrder, isCancellable, isReturnable } from "@/lib/orders";

const now = new Date("2026-06-10T12:00:00Z");
const fresh = { status: "processing", date_created: "2026-06-10T06:00:00Z", billing: { email: "a@b.com" } };
const old = { status: "processing", date_created: "2026-06-08T06:00:00Z", billing: { email: "a@b.com" } };
const completed = { status: "completed", date_created: "2026-06-10T06:00:00Z", billing: { email: "a@b.com" } };

describe("sessionOwnsOrder", () => {
  it("matches owner email case-insensitively", () => {
    expect(sessionOwnsOrder(fresh, "A@B.com")).toBe(true);
    expect(sessionOwnsOrder(fresh, "x@y.com")).toBe(false);
  });
});

describe("isCancellable", () => {
  it("cancellable within 24h + open status", () => {
    expect(isCancellable(fresh, now).ok).toBe(true);
  });
  it("not cancellable after 24h", () => {
    expect(isCancellable(old, now).ok).toBe(false);
  });
  it("not cancellable when completed", () => {
    expect(isCancellable(completed, now).ok).toBe(false);
  });
});

describe("isReturnable", () => {
  it("returnable within 7 days when processing/completed", () => {
    expect(isReturnable(completed, now).ok).toBe(true);
    expect(isReturnable(fresh, now).ok).toBe(true);
  });
  it("not returnable after 7 days", () => {
    const stale = { status: "completed", date_created: "2026-06-01T06:00:00Z", billing: { email: "a@b.com" } };
    expect(isReturnable(stale, now).ok).toBe(false);
  });
  it("not returnable when pending/cancelled", () => {
    expect(isReturnable({ status: "pending", date_created: "2026-06-10T06:00:00Z" }, now).ok).toBe(false);
    expect(isReturnable({ status: "cancelled", date_created: "2026-06-10T06:00:00Z" }, now).ok).toBe(false);
  });
});
