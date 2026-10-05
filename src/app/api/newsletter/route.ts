import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { sendNewsletterSignupEmail } from "@/lib/mailer";

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Per-instance dedupe only: serverless memory is wiped on every cold start, so
// the durable record is the notification email sent to the store inbox below.
// TODO: move to a real list (Mailchimp / Klaviyo / WooCommerce) when chosen.
const subscribers = new Set<string>();
const NEWSLETTER_INBOX = process.env.NEWSLETTER_INBOX || process.env.SUPPORT_EMAIL || "care@veloriavault.com";

/**
 * POST /api/newsletter
 * Subscribe an email to the newsletter
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 2 subscriptions per IP per hour
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(
      `newsletter:${clientIP}`,
      2,
      60 * 60 * 1000 // 1 hour
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: "Too many subscription attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Validate email
    const validated = subscribeSchema.parse(body);
    const normalizedEmail = validated.email.toLowerCase().trim();
    
    // Check if already subscribed
    if (subscribers.has(normalizedEmail)) {
      return NextResponse.json(
        { success: true, message: "You're already subscribed!" },
        { status: 200 }
      );
    }
    
    // Record durably first; if the email can't be sent, tell the customer so
    // the signup isn't silently lost.
    try {
      await sendNewsletterSignupEmail(NEWSLETTER_INBOX, normalizedEmail);
    } catch (e) {
      console.error("[Newsletter] Failed to record signup:", e instanceof Error ? e.message : e);
      return NextResponse.json(
        { success: false, error: "We couldn't subscribe you right now. Please try again later." },
        { status: 503 },
      );
    }

    subscribers.add(normalizedEmail);
    
    // TODO: Integrate with your email service (Mailchimp, ConvertKit, etc.)
    // Example for Mailchimp:
    // await addToMailchimp(normalizedEmail);
    
    console.log(`[Newsletter] New subscriber: ${normalizedEmail}`);
    console.log(`[Newsletter] Total subscribers: ${subscribers.size}`);
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Thank you for subscribing! You'll receive exclusive offers and updates." 
      },
      { status: 200 }
    );
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }
    
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/newsletter/count
 * Get subscriber count (for admin purposes)
 */
export async function GET(request: NextRequest) {
  // Simple auth check - you should implement proper admin auth
  const authHeader = request.headers.get("authorization");
  const adminKey = process.env.NEWSLETTER_ADMIN_KEY;
  if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    count: subscribers.size,
    subscribers: Array.from(subscribers),
  });
}
