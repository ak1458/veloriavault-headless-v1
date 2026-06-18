import { NextRequest, NextResponse } from "next/server";
import { safeMediaPath } from "@/lib/media-path";

/**
 * Media proxy that fetches WordPress static files from the Hostinger server.
 *
 * Problem: api.veloriavault.com resolves to Hostinger IP 145.79.212.69 but
 * LiteSpeed only serves static files for the "api.veloriavault.com" vhost correctly
 * when queried with the exact IP and Server Name Indication (SNI).
 *
 * Solution: Connect to the IP directly with the correct SNI (api.veloriavault.com)
 * so LiteSpeed matches the correct vhost and serves the static files.
 */

// Force Node.js runtime (not Edge) so we get access to the full Node.js HTTPS module
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOSTINGER_IP = "145.79.212.69";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const safe = safeMediaPath(path);
  if (!safe) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const filePath = `/wp-content/${safe}`;

  try {
    // Use dynamic import to avoid build-time resolution issues
    const https = await import("https");

    const upstream = await new Promise<{
      status: number;
      contentType: string;
      body: ArrayBuffer;
    }>((resolve, reject) => {
      const req = https.get(
        {
          hostname: HOSTINGER_IP,
          port: 443,
          path: filePath,
          method: "GET",
          headers: {
            Host: "api.veloriavault.com",
            "User-Agent": "VeloriaVault-MediaProxy/1.1",
          },
          // SNI hostname — makes LiteSpeed match the api.veloriavault.com vhost
          servername: "api.veloriavault.com",
          rejectUnauthorized: false,
          timeout: 15000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            const combined = Buffer.concat(chunks);
            // Convert to ArrayBuffer (which is a valid BodyInit type)
            const ab = combined.buffer.slice(
              combined.byteOffset,
              combined.byteOffset + combined.byteLength,
            );
            resolve({
              status: res.statusCode || 500,
              contentType:
                (res.headers["content-type"] as string) ||
                "application/octet-stream",
              body: ab as ArrayBuffer,
            });
          });
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Timeout"));
      });
    });

    if (upstream.status !== 200) {
      console.error(`[Media Proxy] Upstream returned ${upstream.status} for ${filePath}`);
      return new NextResponse(`Media proxy: upstream returned ${upstream.status}`, {
        status: upstream.status,
        headers: { "X-Media-Proxy": "miss", "X-Upstream-Status": String(upstream.status) },
      });
    }

    // ArrayBuffer is a valid BodyInit type for NextResponse
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.contentType,
        "Cache-Control": "public, max-age=604800, s-maxage=604800, immutable",
        "Access-Control-Allow-Origin": "*",
        "X-Media-Proxy": "hit",
      },
    });
  } catch (error) {
    console.error("[Media Proxy] Error:", filePath, error);
    return new NextResponse(`Media proxy error: ${error}`, {
      status: 502,
      headers: { "X-Media-Proxy": "error" },
    });
  }
}
