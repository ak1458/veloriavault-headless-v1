/**
 * ============================================================
 * SHIPROCKET API CLIENT — /lib/shiprocket.ts
 * ============================================================
 * 
 * Handles auto-syncing of orders to Shiprocket when created
 * via the Next.js headless checkout.
 * 
 * ENV VARS REQUIRED:
 * - SHIPROCKET_EMAIL: API user email
 * - SHIPROCKET_PASSWORD: API user password
 * - SHIPROCKET_PICKUP_LOCATION: Pickup location name (default: "Primary")
 * - SHIPROCKET_CHANNEL_ID: Channel ID (optional)
 * ============================================================
 */

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

// In-memory token cache (refreshes on cold start or expiry)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Authenticate with Shiprocket and get a bearer token.
 * Token is valid for 10 days — we cache it in memory.
 */
async function getAuthToken(): Promise<string> {
  // Return cached token if still valid (with 1-hour buffer)
  if (cachedToken && Date.now() < tokenExpiry - 3600000) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    console.warn("[Shiprocket] Missing credentials — Build-time skip.");
    return "";
  }

  console.log("[Shiprocket] Authenticating with API...");

  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Shiprocket] Auth failed:", err);
    return "";
  }

  const data = await res.json();
  cachedToken = data.token;
  // Cache for 9 days (token valid for 10)
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;

  console.log("[Shiprocket] Authenticated successfully");
  return cachedToken as string;
}

/**
 * Make an authenticated request to Shiprocket API
 */
async function shiprocketFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();

  const res = await fetch(`${SHIPROCKET_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  // If token expired (401), clear cache and retry once
  if (res.status === 401) {
    console.warn("[Shiprocket] Token expired, re-authenticating...");
    cachedToken = null;
    tokenExpiry = 0;
    const newToken = await getAuthToken();
    return fetch(`${SHIPROCKET_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
        ...options.headers,
      },
    });
  }

  return res;
}

/**
 * Order item shape from WooCommerce
 */
interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  sku?: string;
}

/**
 * Customer details for Shiprocket
 */
interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
}

/**
 * Create an order on Shiprocket
 * Called after WooCommerce order is created successfully
 */
export async function createShiprocketOrder(params: {
  orderId: number | string;
  orderDate: string;
  customer: CustomerDetails;
  items: OrderItem[];
  paymentMethod: "prepaid" | "cod";
  subtotal: number;
  shippingCharges: number;
  discount: number;
  total: number;
}): Promise<{ success: boolean; shiprocketOrderId?: number; error?: string }> {
  try {
    const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || "Primary";
    const channelId = process.env.SHIPROCKET_CHANNEL_ID;

    const orderPayload: Record<string, unknown> = {
      order_id: String(params.orderId),
      order_date: params.orderDate,
      pickup_location: pickupLocation,
      billing_customer_name: params.customer.firstName,
      billing_last_name: params.customer.lastName,
      billing_address: params.customer.address,
      billing_city: params.customer.city,
      billing_pincode: params.customer.postalCode,
      billing_state: params.customer.state,
      billing_country: "India",
      billing_email: params.customer.email,
      billing_phone: params.customer.phone,
      shipping_is_billing: true,
      order_items: params.items.map((item) => ({
        name: item.name.substring(0, 100), // Shiprocket has 100 char limit
        sku: item.sku || `VV-${item.id}`,
        units: item.quantity,
        selling_price: item.price,
        discount: 0,
        tax: 0,
        hsn: "",
      })),
      payment_method: params.paymentMethod === "cod" ? "COD" : "Prepaid",
      sub_total: params.subtotal,
      shipping_charges: params.shippingCharges,
      // Shiprocket requires length, breadth, height, weight
      length: 25,
      breadth: 20,
      height: 10,
      weight: 0.5, // Default 500g — adjust per product if needed
    };

    if (channelId) {
      orderPayload.channel_id = channelId;
    }

    console.log(`[Shiprocket] Creating order #${params.orderId}...`);

    const res = await shiprocketFetch("/orders/create/adhoc", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[Shiprocket] Order creation failed:", JSON.stringify(data));
      return {
        success: false,
        error: data.message || data.errors?.toString() || `Shiprocket error ${res.status}`,
      };
    }

    console.log(`[Shiprocket] Order #${params.orderId} synced → Shiprocket ID: ${data.order_id}`);

    // Persist Shiprocket identifiers on the WC order so cancellation and live
    // tracking can resolve them later. Non-fatal if it fails.
    try {
      const { updateWcOrder } = await import("@/lib/woocommerce-orders");
      const meta: { key: string; value: string }[] = [
        { key: "_shiprocket_order_id", value: String(data.order_id) },
      ];
      if (data.shipment_id) meta.push({ key: "_shiprocket_shipment_id", value: String(data.shipment_id) });
      await updateWcOrder(params.orderId, { meta_data: meta });
    } catch (e) {
      console.error("[Shiprocket] Failed to persist ids to WC order:", e instanceof Error ? e.message : e);
    }

    return {
      success: true,
      shiprocketOrderId: data.order_id,
    };
  } catch (error) {
    console.error("[Shiprocket] Error creating order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Shiprocket error",
    };
  }
}

export interface NormalizedTracking {
  status: string;
  awb: string | null;
  etaDate: string | null;
  checkpoints: { date: string; activity: string; location: string }[];
}

/**
 * Fetch live tracking for a Shiprocket shipment and normalize it. Best-effort:
 * returns null on any error so callers can fall back to the WC order status.
 */
export async function trackByShipmentId(shipmentId: string | number): Promise<NormalizedTracking | null> {
  try {
    const res = await shiprocketFetch(`/courier/track/shipment/${encodeURIComponent(String(shipmentId))}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Shiprocket nests the payload under the shipment id or `tracking_data`.
    const td =
      data?.tracking_data ||
      (typeof data === "object" ? Object.values(data)[0] : null) ||
      {};
    const track = Array.isArray(td.shipment_track) ? td.shipment_track[0] : undefined;
    const activities = Array.isArray(td.shipment_track_activities) ? td.shipment_track_activities : [];
    return {
      status: track?.current_status || td.shipment_status || "In Transit",
      awb: track?.awb_code || null,
      etaDate: track?.edd || td.etd || null,
      checkpoints: activities.map((a: { date?: string; activity?: string; location?: string }) => ({
        date: a.date || "",
        activity: a.activity || "",
        location: a.location || "",
      })),
    };
  } catch (e) {
    console.error("[Shiprocket] Tracking error:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Cancel an order on Shiprocket
 */
export async function cancelShiprocketOrder(
  shiprocketOrderId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await shiprocketFetch("/orders/cancel", {
      method: "POST",
      body: JSON.stringify({ ids: [shiprocketOrderId] }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.message || "Failed to cancel" };
    }

    return { success: true };
  } catch (error) {
    console.error("[Shiprocket] Cancel error:", error);
    return { success: false, error: "Failed to cancel order on Shiprocket" };
  }
}
