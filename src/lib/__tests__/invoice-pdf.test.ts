import { describe, it, expect } from "vitest";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import type { InvoiceModel } from "@/lib/invoice";

const model: InvoiceModel = {
  number: "1234",
  date: "2026-06-10T10:00:00",
  billTo: { first_name: "A", last_name: "B", email: "a@b.com", address_1: "x", city: "Delhi", state: "DL", postcode: "110001" },
  lines: [{ name: "Tote", qty: 1, amount: 2999 }],
  mrpSubtotal: 2999,
  discountTotal: 600,
  shipping: 0,
  codFee: 0,
  grandTotal: 2399,
  paymentMethod: "UPI / Card / Net Banking",
  paymentId: "pay_X",
};

describe("renderInvoicePdf", () => {
  it("produces a valid non-empty PDF", async () => {
    const bytes = await renderInvoicePdf(model);
    expect(bytes.length).toBeGreaterThan(800);
    // PDF magic header "%PDF"
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x25, 0x50, 0x44, 0x46]);
  });
});
