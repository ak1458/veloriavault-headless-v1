import { describe, it, expect } from "vitest";
import { filterOrdersByEmail } from "@/lib/woocommerce-customer";

const orders = [
  { id: 1, billing: { email: "A@B.com" } },
  { id: 2, billing: { email: "x@y.com" } },
  { id: 3, billing: { email: "a@b.com" } },
  { id: 4, billing: {} },
];

describe("filterOrdersByEmail", () => {
  it("matches case-insensitively", () => {
    expect(filterOrdersByEmail(orders, "a@b.com").map((o) => o.id)).toEqual([1, 3]);
  });
  it("trims whitespace", () => {
    expect(filterOrdersByEmail(orders, "  x@y.com  ").map((o) => o.id)).toEqual([2]);
  });
  it("returns [] for no match", () => {
    expect(filterOrdersByEmail(orders, "none@none.com")).toEqual([]);
  });
});
