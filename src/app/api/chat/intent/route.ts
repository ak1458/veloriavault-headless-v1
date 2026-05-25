/**
 * ============================================================
 * CHAT INTENT API — /api/chat/intent
 * ============================================================
 *
 * Parses user messages and returns:
 * - Matched products from the WooCommerce catalog
 * - Quick-reply suggestions
 * - Contextual assistant responses
 *
 * Phase 1: Keyword-based NLP (deterministic, fast, zero cost)
 * Phase 2: Swap in LLM (OpenAI/Gemini) for advanced intent parsing
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getProducts, getCategories, getVariationProducts, type WCProduct } from "@/lib/woocommerce";
import { CATEGORY_TABS } from "@/lib/catalog";

// ── Keyword Maps ──────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "tote-bag": ["tote", "totes", "tote bag", "tote bags", "big bag", "large bag", "carry all"],
  "satchel-bag": ["satchel", "satchels", "satchel bag", "office bag", "work bag", "laptop bag", "professional"],
  "sling-bag": ["sling", "sling bag", "sling bags", "casual bag", "small bag"],
  crossbody: ["crossbody", "cross body", "cross-body", "crossbodies", "shoulder bag"],
  clutch: ["clutch", "clutches", "evening bag", "party bag", "party clutch", "envelope"],
  wallet: ["wallet", "wallets", "purse", "card holder", "billfold", "money"],
};

const INTENT_KEYWORDS = {
  greeting: ["hi", "hello", "hey", "hii", "hola", "sup", "good morning", "good evening", "good afternoon"],
  gift: ["gift", "gifting", "present", "for her", "for my sister", "for my mom", "for wife", "for girlfriend", "birthday", "anniversary"],
  budget: ["under", "below", "budget", "affordable", "cheap", "within", "max", "less than", "upto", "up to"],
  premium: ["premium", "luxury", "expensive", "high end", "best", "top", "finest", "exclusive"],
  sale: ["sale", "discount", "offer", "deal", "bargain", "clearance", "on sale"],
  newArrivals: ["new", "latest", "newest", "recent", "just arrived", "fresh", "trending"],
  help: ["help", "support", "contact", "customer care", "phone", "call", "email", "return", "refund", "exchange", "track", "tracking", "order status"],
  color: ["black", "brown", "tan", "cherry", "maroon", "green", "olive", "beige", "cream", "pink", "red", "blue", "navy", "white", "grey", "gray"],
  thanks: ["thanks", "thank you", "thankyou", "thx", "ty", "great", "awesome", "perfect", "nice"],
  bye: ["bye", "goodbye", "good bye", "see you", "later", "quit", "exit"],
};

// ── Intent Parser ─────────────────────────────────────────────

interface ParsedIntent {
  type: "product_search" | "greeting" | "gift" | "help" | "thanks" | "bye" | "general";
  category?: string;
  maxPrice?: number;
  minPrice?: number;
  color?: string;
  searchTerms?: string;
  isPremium?: boolean;
  isSale?: boolean;
  isNewArrivals?: boolean;
}

function parseIntent(message: string): ParsedIntent {
  const lower = message.toLowerCase().trim();
  const words = lower.split(/\s+/);

  // Check greetings first
  if (INTENT_KEYWORDS.greeting.some((k) => lower.startsWith(k) || lower === k)) {
    return { type: "greeting" };
  }

  // Check thanks
  if (INTENT_KEYWORDS.thanks.some((k) => lower.includes(k))) {
    return { type: "thanks" };
  }

  // Check bye
  if (INTENT_KEYWORDS.bye.some((k) => lower.includes(k))) {
    return { type: "bye" };
  }

  // Check help/support
  if (INTENT_KEYWORDS.help.some((k) => lower.includes(k))) {
    return { type: "help" };
  }

  // Build product search intent
  const intent: ParsedIntent = { type: "product_search" };

  // Detect category
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      intent.category = slug;
      break;
    }
  }

  // Detect budget constraint
  const budgetMatch = lower.match(/(?:under|below|within|upto|up to|less than|max|budget)\s*₹?\s*(\d+)/);
  if (budgetMatch) {
    intent.maxPrice = parseInt(budgetMatch[1], 10);
  }

  // Detect "around X" or specific price range
  const aroundMatch = lower.match(/(?:around|about|approximately|~)\s*₹?\s*(\d+)/);
  if (aroundMatch) {
    const price = parseInt(aroundMatch[1], 10);
    intent.minPrice = Math.floor(price * 0.7);
    intent.maxPrice = Math.ceil(price * 1.3);
  }

  // Detect color preference
  for (const color of INTENT_KEYWORDS.color) {
    if (words.includes(color)) {
      intent.color = color;
      break;
    }
  }

  // Detect premium preference
  if (INTENT_KEYWORDS.premium.some((k) => lower.includes(k))) {
    intent.isPremium = true;
  }

  // Detect sale preference
  if (INTENT_KEYWORDS.sale.some((k) => lower.includes(k))) {
    intent.isSale = true;
  }

  // Detect new arrivals
  if (INTENT_KEYWORDS.newArrivals.some((k) => lower.includes(k))) {
    intent.isNewArrivals = true;
  }

  // Gift intent (also triggers product search)
  if (INTENT_KEYWORDS.gift.some((k) => lower.includes(k))) {
    intent.type = "gift";
  }

  // If no category was matched, use the remaining text as search terms
  if (!intent.category && intent.type === "product_search") {
    // Remove noise words to create search terms
    const noiseWords = new Set([
      "i", "me", "my", "want", "need", "looking", "for", "a", "an", "the",
      "show", "find", "get", "buy", "can", "you", "please", "something",
      "some", "good", "nice", "bag", "bags", "in", "with", "and", "or",
    ]);
    const meaningful = words.filter((w) => !noiseWords.has(w) && w.length > 2);
    if (meaningful.length > 0) {
      intent.searchTerms = meaningful.join(" ");
    }
  }

  return intent;
}

// ── Product Ranking ───────────────────────────────────────────

function rankProducts(
  products: WCProduct[],
  intent: ParsedIntent
): WCProduct[] {
  let filtered = [...products];

  // Filter by price range
  if (intent.maxPrice) {
    filtered = filtered.filter((p) => parseFloat(p.price) <= intent.maxPrice!);
  }
  if (intent.minPrice) {
    filtered = filtered.filter((p) => parseFloat(p.price) >= intent.minPrice!);
  }

  // Filter by color
  if (intent.color) {
    const colorLower = intent.color.toLowerCase();
    const colorFiltered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(colorLower) ||
        p.attributes.some(
          (a) =>
            a.option?.toLowerCase().includes(colorLower) ||
            a.options?.some((o) => o.toLowerCase().includes(colorLower))
        )
    );
    if (colorFiltered.length > 0) {
      filtered = colorFiltered;
    }
  }

  // Filter sale items
  if (intent.isSale) {
    const saleFiltered = filtered.filter((p) => p.on_sale);
    if (saleFiltered.length > 0) {
      filtered = saleFiltered;
    }
  }

  // Sort by relevance
  if (intent.isPremium) {
    filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  } else if (intent.maxPrice) {
    // Sort by best value (highest price under budget = best quality)
    filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  } else {
    // Default: Popular/best rated first
    filtered.sort(
      (a, b) =>
        parseFloat(b.average_rating) - parseFloat(a.average_rating) ||
        b.rating_count - a.rating_count
    );
  }

  return filtered.slice(0, 6);
}

// ── Response Builders ─────────────────────────────────────────

function buildGreeting(): { content: string; quickReplies: string[] } {
  const hour = new Date().getHours();
  let timeGreeting = "Hello";
  if (hour < 12) timeGreeting = "Good morning";
  else if (hour < 17) timeGreeting = "Good afternoon";
  else timeGreeting = "Good evening";

  return {
    content: `${timeGreeting}! ✨ Welcome to Veloria Vault. I'm your personal shopping assistant.\n\nI can help you find the perfect leather bag or wallet. What are you looking for today?`,
    quickReplies: [
      "💼 Find an Office Bag",
      "👜 Show Tote Bags",
      "🎁 Gift Ideas",
      "🔥 What's on Sale?",
      "💰 Wallets & Clutches",
    ],
  };
}

function buildGiftResponse(): { content: string; quickReplies: string[] } {
  return {
    content: `🎁 Great choice! Veloria bags make wonderful gifts. Let me help you find something special.\n\nWhat's the occasion, and do you have a budget in mind?`,
    quickReplies: [
      "Under ₹2000",
      "Under ₹3000",
      "Under ₹5000",
      "Premium Collection",
      "Show me everything",
    ],
  };
}

function buildHelpResponse(): { content: string; quickReplies: string[] } {
  return {
    content: `I'm here to help! 🤝\n\n📞 **Call us:** +91-7376326666\n📧 **Email:** care@veloriavault.com\n🕐 **Hours:** Mon-Sat, 10 AM - 7 PM\n\nOr tell me what you need help with:`,
    quickReplies: [
      "Track my order",
      "Return & Exchange",
      "Shipping info",
      "Browse Products",
    ],
  };
}

function buildThanksResponse(): { content: string } {
  const responses = [
    "You're welcome! 😊 Let me know if you need anything else.",
    "Happy to help! ✨ Feel free to ask me anything.",
    "My pleasure! 🎀 I'm here whenever you need me.",
  ];
  return { content: responses[Math.floor(Math.random() * responses.length)] };
}

function buildByeResponse(): { content: string } {
  return {
    content: "Goodbye! 👋 Thanks for visiting Veloria Vault. Come back anytime — I'll remember our chat! ✨",
  };
}

function buildProductResponse(
  products: WCProduct[],
  intent: ParsedIntent
): { content: string; quickReplies: string[] } {
  if (products.length === 0) {
    return {
      content: "I couldn't find products matching your criteria. Let me suggest some alternatives:",
      quickReplies: [
        "Show all bags",
        "Browse Totes",
        "Browse Satchels",
        "Browse Wallets",
        "What's on Sale?",
      ],
    };
  }

  let intro = "";
  if (intent.category) {
    const label = CATEGORY_TABS.find((t) => t.slug === intent.category)?.label || intent.category;
    intro = `Here are the best ${label} picks for you:`;
  } else if (intent.maxPrice) {
    intro = `Here are top picks under ₹${intent.maxPrice.toLocaleString("en-IN")}:`;
  } else if (intent.isPremium) {
    intro = "Here's our premium collection — the finest leather goods:";
  } else if (intent.isSale) {
    intro = "🔥 These are currently on sale — grab them before they're gone:";
  } else {
    intro = `Here are ${products.length} picks I think you'll love:`;
  }

  return {
    content: intro,
    quickReplies: [
      "Show more options",
      "Something different",
      "Under ₹2000",
      "Under ₹3000",
    ],
  };
}

// ── Main Handler ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId } = body as { message: string; sessionId?: string };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim().slice(0, 500); // Limit message length
    const intent = parseIntent(trimmedMessage);

    let responseContent = "";
    let quickReplies: string[] = [];
    let products: WCProduct[] = [];

    switch (intent.type) {
      case "greeting": {
        const greeting = buildGreeting();
        responseContent = greeting.content;
        quickReplies = greeting.quickReplies;
        break;
      }

      case "thanks": {
        const thanks = buildThanksResponse();
        responseContent = thanks.content;
        break;
      }

      case "bye": {
        const bye = buildByeResponse();
        responseContent = bye.content;
        break;
      }

      case "help": {
        const help = buildHelpResponse();
        responseContent = help.content;
        quickReplies = help.quickReplies;
        break;
      }

      case "gift": {
        if (intent.maxPrice || intent.category) {
          // They specified details — search products
          const allProducts = await fetchProductsForIntent(intent);
          products = rankProducts(allProducts, intent);
          const resp = buildProductResponse(products, intent);
          responseContent = `🎁 Great gift ideas!\n\n${resp.content}`;
          quickReplies = resp.quickReplies;
        } else {
          const gift = buildGiftResponse();
          responseContent = gift.content;
          quickReplies = gift.quickReplies;
        }
        break;
      }

      case "product_search":
      default: {
        const allProducts = await fetchProductsForIntent(intent);
        products = rankProducts(allProducts, intent);
        const resp = buildProductResponse(products, intent);
        responseContent = resp.content;
        quickReplies = resp.quickReplies;
        break;
      }
    }

    // Map products to chat-friendly format
    const chatProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      regularPrice: p.regular_price,
      salePrice: p.sale_price,
      onSale: p.on_sale,
      image: p.images?.[0]?.src || p.image?.src || "",
      category: p.categories?.[0]?.name || "",
      shortDescription: stripHtml(p.short_description).slice(0, 120),
      stockStatus: p.stock_status,
      href: `/product/${p.slug}`,
    }));

    return NextResponse.json({
      content: responseContent,
      products: chatProducts,
      quickReplies,
      intent: intent.type,
      sessionId: sessionId || undefined,
    });
  } catch (error) {
    console.error("[Chat Intent] Error:", error);
    return NextResponse.json(
      {
        content:
          "I'm having trouble right now. You can browse our collection at the Shop page, or try again in a moment.",
        products: [],
        quickReplies: ["Browse Shop", "Try again"],
        intent: "error",
      },
      { status: 200 } // Return 200 so the chatbot UI still works
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────

async function fetchProductsForIntent(intent: ParsedIntent): Promise<WCProduct[]> {
  // If category is specified, fetch variations in that category
  if (intent.category) {
    const categories = await getCategories();
    const matchedCategory = categories.find((c) => c.slug === intent.category);
    if (matchedCategory) {
      return getProducts({ category: matchedCategory.id, per_page: 30 });
    }
    // Fallback: search by category slug
    return getVariationProducts({ categorySlug: intent.category });
  }

  // If search terms, use search
  if (intent.searchTerms) {
    return getProducts({ search: intent.searchTerms, per_page: 30 });
  }

  // Default: fetch popular / all products
  return getProducts({ per_page: 30 });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();
}
