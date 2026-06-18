import nodemailer from "nodemailer";

/**
 * Send a transactional email over SMTP. Credentials are read at call time so
 * the build never requires them. Configure on Vercel:
 *   SMTP_HOST, SMTP_PORT (465 SSL / 587 STARTTLS), SMTP_USER, SMTP_PASS, SMTP_FROM
 */
async function sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Mail transport not configured");
  }
  const port = Number(SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transport.sendMail({ from: SMTP_FROM || SMTP_USER, to, subject, text, html });
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await sendMail(
    to,
    "Your Veloria Vault login code",
    `Your login code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    `<div style="font-family:sans-serif">
       <h2 style="color:#b59a5c;margin:0 0 8px">Veloria Vault</h2>
       <p>Your login code is</p>
       <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
       <p style="color:#666">It expires in 10 minutes. If you didn't request this, ignore this email.</p>
     </div>`,
  );
}

export async function sendReturnRequestEmail(opts: {
  to: string;
  orderNumber: string;
  customerEmail: string;
  reason: string;
}): Promise<void> {
  await sendMail(
    opts.to,
    `Return request — Order #${opts.orderNumber}`,
    `Return requested for order #${opts.orderNumber} by ${opts.customerEmail}.\n\nReason:\n${opts.reason}`,
    `<div style="font-family:sans-serif">
       <h3>Return request — Order #${opts.orderNumber}</h3>
       <p><b>Customer:</b> ${opts.customerEmail}</p>
       <p><b>Reason:</b></p>
       <p>${opts.reason.replace(/</g, "&lt;")}</p>
     </div>`,
  );
}
