import { NextRequest, NextResponse } from "next/server";
import { uploadCustomerReviewMedia } from "@/lib/reviews";
import { detectImageType } from "@/lib/image-validate";
import { RateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

// 10 uploads per hour per IP.
const uploadLimiter = new RateLimiter(10, 60 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    if (!uploadLimiter.check(getClientIp(request)).success) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const productId = Number(formData.get("productId"));
    const file = formData.get("file") as File | null;

    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 },
      );
    }

    // Verify it is a real raster image by magic bytes (not just by extension or
    // a spoofable Content-Type). Blocks SVG/PHP and other script payloads.
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!detectImageType(head)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, GIF or WEBP images are allowed." },
        { status: 400 },
      );
    }

    const result = await uploadCustomerReviewMedia({
      productId,
      file,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error uploading review media:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload image",
      },
      { status: 500 },
    );
  }
}
