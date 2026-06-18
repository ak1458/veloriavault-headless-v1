import { describe, it, expect } from "vitest";
import { buildInvoiceModel } from "@/lib/invoice";

const order = {
  number: "1234",
  date_created: "2026-06-10T10:00:00",
  total: "2399",
  billing: {
    first_name: "A",
    last_name: "B",
    email: "a@b.com",
    address_1: "x",
    city: "Delhi",
    state: "DL",
    postcode: "110001",
  },
  line_items: [{ name: "Tote", quantity: 1, subtotal: "2999", total: "2999" }],
  shipping_lines: [{ total: "0" }],
  fee_lines: [
    { name: "Automatic Tier Discount (15%)", total: "-450" },
    { name: "Prepaid Bonus (5%)", total: "-150" },
  ],
  payment_method_title: "UPI / Card / Net Banking",
  meta_data: [
    { key: "_headless_charge_amount", value: "2399" },
    { key: "_razorpay_payment_id", value: "pay_X" },
  ],
};

describe("buildInvoiceModel", () => {
  it("reconciles mrp, discount, grand total", () => {
    const m = buildInvoiceModel(order);
    expect(m.mrpSubtotal).toBe(2999);
    expect(m.discountTotal).toBe(600);
    expect(m.grandTotal).toBe(2399);
    expect(m.paymentId).toBe("pay_X");
    expect(m.paymentMethod).toBe("UPI / Card / Net Banking");
  });

  it("falls back to order.total when charge meta absent", () => {
    const m = buildInvoiceModel({ ...order, meta_data: [] });
    expect(m.grandTotal).toBe(2399);
    expect(m.paymentId).toBeNull();
  });

  it("treats positive fee as COD fee, not discount", () => {
    const m = buildInvoiceModel({
      ...order,
      fee_lines: [
        { name: "Automatic Tier Discount (15%)", total: "-450" },
        { name: "Cash on Delivery Fee", total: "149" },
      ],
    });
    expect(m.discountTotal).toBe(450);
    expect(m.codFee).toBe(149);
  });
});
