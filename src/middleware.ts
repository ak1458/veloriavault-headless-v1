/**
 * Security Middleware
 * Adds security headers and blocks suspicious requests
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security headers configuration
const securityHeaders = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",
  
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  
  // XSS Protection
  "X-XSS-Protection": "1; mode=block",
  
  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",
  
  // Permissions policy (limit browser features)
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  
  // Content Security Policy is set in next.config.ts (async headers())
  // to avoid conflict. Do NOT duplicate it here — the middleware runs first
  // and would override the more permissive next.config.ts CSP.
  
  // Strict transport security (HTTPS only)
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

// Blocked paths (sensitive files)
const BLOCKED_PATHS = [
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.env.development",
  "/config.js",
  "/config.json",
  "/package.json",
  "/package-lock.json",
  "/yarn.lock",
  "/.git",
  "/.gitignore",
  "/Dockerfile",
  "/docker-compose.yml",
];

// Suspicious patterns (SQL injection, XSS attempts)
const SUSPICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /\bon(click|load|error|mouseover|focus|blur|submit|change|keyup|keydown)=/i,
  /select.*from/i,
  /union.*select/i,
  /drop.*table/i,
  /insert.*into/i,
  /delete.*from/i,
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";
  const host = request.headers.get("host") || "";

  // ========================================
  // DOMAIN REDIRECTION (CANONICAL & LOCKDOWN)
  // ========================================
  const isVercelDomain = host.includes(".vercel.app");
  const isRootDomain = host === "veloriavault.com";

  // Canonicalize the apex domain and the PRODUCTION *.vercel.app alias to www.
  // Preview deployments (VERCEL_ENV === "preview") are intentionally left
  // reachable so they can be QA'd before promotion; Vercel already keeps them
  // behind deployment protection and noindexed, so there is no SEO/leak risk.
  const isProdVercelAlias =
    isVercelDomain && process.env.VERCEL_ENV === "production";

  if (isRootDomain || isProdVercelAlias) {
    const destination = new URL(`https://www.veloriavault.com${pathname}${search}`);
    return NextResponse.redirect(destination, 308); // Permanent Redirect
  }
  
  // ========================================
  // BLOCK SENSITIVE FILES
  // ========================================
  if (BLOCKED_PATHS.some((path) => pathname.startsWith(path))) {
    console.warn(`[Security] Blocked access to sensitive file: ${pathname} from ${request.headers.get("x-forwarded-for") || "unknown"}`);
    return new NextResponse("Not Found", { status: 404 });
  }
  
  // ========================================
  // CHECK FOR SUSPICIOUS PATTERNS
  // ========================================
  const fullUrl = pathname + search;
  if (SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(fullUrl))) {
    console.warn(`[Security] Suspicious pattern detected in URL: ${fullUrl} from ${request.headers.get("x-forwarded-for") || "unknown"}`);
    return new NextResponse("Bad Request", { status: 400 });
  }
  
  // ========================================
  // BLOCK KNOWN BAD BOTS
  // ========================================
  const badBots = [
    "sqlmap",
    "nikto",
    "nessus",
    "nmap",
    "masscan",
    "zgrab",
    "gobuster",
    "dirbuster",
    "wfuzz",
    "burp",
    "metasploit",
    "acunetix",
    "netsparker",
  ];
  
  const lowerUserAgent = userAgent.toLowerCase();
  if (badBots.some((bot) => lowerUserAgent.includes(bot))) {
    console.warn(`[Security] Blocked bot: ${userAgent} from ${request.headers.get("x-forwarded-for") || "unknown"}`);
    return new NextResponse("Forbidden", { status: 403 });
  }
  
  // ========================================
  // ADD SECURITY HEADERS
  // ========================================
  const response = NextResponse.next();
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add custom headers for debugging (remove in production)
  // response.headers.set("X-Request-ID", crypto.randomUUID());
  
  return response;
}

// Apply middleware to all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
