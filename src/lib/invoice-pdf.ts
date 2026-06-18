import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InvoiceModel } from "@/lib/invoice";

function inr(n: number): string {
  // pdf-lib StandardFonts use WinAnsi encoding, which cannot encode the rupee
  // glyph (U+20B9), so use "Rs." instead of ₹.
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

/** Render an invoice model to PDF bytes. Pure (no network), serverless-safe. */
export async function renderInvoicePdf(m: InvoiceModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 in points
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.71, 0.6, 0.36);
  const dark = rgb(0.1, 0.1, 0.1);
  const grey = rgb(0.4, 0.4, 0.4);

  const left = 50;
  const right = 545;
  let y = 790;

  const text = (s: string, x: number, size = 10, f = font, color = dark) =>
    page.drawText(s, { x, y, size, font: f, color });
  const rightText = (s: string, size = 10, f = font, color = dark) =>
    page.drawText(s, { x: right - f.widthOfTextAtSize(s, size), y, size, font: f, color });

  text("Veloria Vault", left, 22, bold, gold);
  rightText("TAX INVOICE", 12, bold, grey);
  y -= 30;
  text(`Invoice / Order #${m.number}`, left, 12, bold);
  y -= 16;
  text(`Date: ${m.date ? new Date(m.date).toLocaleDateString("en-IN") : "-"}`, left, 10, font, grey);
  y -= 26;

  text("Bill To:", left, 10, bold);
  y -= 14;
  const b = m.billTo;
  text(`${b.first_name ?? ""} ${b.last_name ?? ""}`.trim(), left, 10, font, grey);
  y -= 13;
  text(`${b.address_1 ?? ""}, ${b.city ?? ""}, ${b.state ?? ""} ${b.postcode ?? ""}`, left, 10, font, grey);
  y -= 13;
  if (b.email) {
    text(b.email, left, 10, font, grey);
    y -= 13;
  }
  y -= 12;

  page.drawLine({ start: { x: left, y }, end: { x: right, y }, color: grey, thickness: 0.5 });
  y -= 18;
  text("Item", left, 10, bold);
  rightText("Amount", 10, bold);
  y -= 16;
  for (const l of m.lines) {
    text(`${l.name}  x${l.qty}`, left, 10);
    rightText(inr(l.amount), 10);
    y -= 15;
  }
  y -= 4;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, color: grey, thickness: 0.5 });
  y -= 18;

  const summary = (label: string, value: string, f = font, color = dark) => {
    text(label, left, 10, f, color);
    rightText(value, 10, f, color);
    y -= 15;
  };
  summary("Subtotal (MRP)", inr(m.mrpSubtotal));
  if (m.discountTotal > 0) summary("Discounts", `- ${inr(m.discountTotal)}`, font, gold);
  if (m.shipping > 0) summary("Shipping", inr(m.shipping));
  if (m.codFee > 0) summary("COD Fee", inr(m.codFee));
  y -= 4;
  summary("Amount Paid", inr(m.grandTotal), bold);
  y -= 8;
  text(`Payment: ${m.paymentMethod}${m.paymentId ? ` (${m.paymentId})` : ""}`, left, 9, font, grey);

  return pdf.save();
}
