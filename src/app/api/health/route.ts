import { NextResponse } from "next/server";

export async function GET() {
  const wcApiUrl = process.env.WC_API_URL || "not set";
  const legacyUrl = process.env.NEXT_PUBLIC_LEGACY_SITE_URL || "not set";
  
  // Quick connectivity test to the WooCommerce backend
  let wcStatus = "untested";
  let wcLatency = 0;
  let wcError = "";
  
  try {
    const storeOrigin = legacyUrl.replace(/\/$/, "") || wcApiUrl.replace(/\/wp-json\/wc\/v3\/?$/, "");
    const testUrl = `${storeOrigin}/wp-json/wc/store/v1/products?per_page=1&v=health`;
    
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(testUrl, { 
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "VeloriaVault/HealthCheck" }
    });
    clearTimeout(timeoutId);
    
    wcLatency = Date.now() - start;
    wcStatus = `${response.status} ${response.statusText}`;
    
    if (response.ok) {
      const data = await response.json();
      wcStatus += ` (${Array.isArray(data) ? data.length : 0} products)`;
    }
  } catch (error) {
    wcStatus = "error";
    wcError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json({ 
    status: "ok", 
    version: "1.0.2",
    timestamp: new Date().toISOString(),
    env: {
      WC_API_URL: wcApiUrl.replace(/ck_[a-z0-9]+/i, "ck_***").replace(/cs_[a-z0-9]+/i, "cs_***"),
      LEGACY_SITE_URL: legacyUrl,
    },
    woocommerce: {
      status: wcStatus,
      latencyMs: wcLatency,
      error: wcError || undefined,
    },
  });
}
