// Canonical public origin. Apex and *.vercel.app redirect here (see middleware),
// so every canonical / sitemap / JSON-LD URL must use it.
export const SITE_URL = "https://www.veloriavault.com";

export const LEGACY_SITE_URL =
  process.env.NEXT_PUBLIC_LEGACY_SITE_URL || "https://api.veloriavault.com";

export const OUTBOUND_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
