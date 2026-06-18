import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { readOtpSession } from "@/lib/auth/otp";
import { getCustomerOrders, getOrdersByEmail } from "@/lib/woocommerce-customer";
import { mapOrderToDTO } from "@/lib/order-dto";

export const runtime = "nodejs";

/**
 * Orders for the current session:
 * - JWT customer session → orders linked to the customer id
 * - OTP (guest) session  → ALL orders matching the verified billing email
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const jwtPayload = token ? verifyToken(token) : null;

  if (jwtPayload?.userId) {
    const orders = await getCustomerOrders(jwtPayload.userId);
    return NextResponse.json({
      success: true,
      sessionType: "customer",
      email: jwtPayload.email,
      orders: (orders as Parameters<typeof mapOrderToDTO>[0][]).map(mapOrderToDTO),
    });
  }

  const otp = request.cookies.get("otp_session")?.value;
  const otpSession = otp ? readOtpSession(otp) : null;
  if (otpSession?.email) {
    const orders = await getOrdersByEmail(otpSession.email);
    return NextResponse.json({
      success: true,
      sessionType: "guest",
      email: otpSession.email,
      orders: (orders as Parameters<typeof mapOrderToDTO>[0][]).map(mapOrderToDTO),
    });
  }

  return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
}
