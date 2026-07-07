import { rewriteLegacyHtml } from "@/lib/legacy-html";
import { LEGACY_SITE_URL, OUTBOUND_USER_AGENT } from "@/lib/site";
import {
  getProductReviews,
  type WCProduct,
  type WCReview,
  type WCReviewMedia,
} from "@/lib/woocommerce";

const REVIEW_AJAX_URL = `${LEGACY_SITE_URL.replace(/\/$/, "")}/wp-admin/admin-ajax.php`;
const REVIEW_POST_URL = `${LEGACY_SITE_URL.replace(/\/$/, "")}/wp-comments-post.php`;

const IMAGE_EXTENSION_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;
const VIDEO_EXTENSION_PATTERN = /\.(avi|mov|mp4|mpeg|mpg|ogg|webm)$/i;

export interface ReviewMediaToken {
  id: number;
  key: string;
}

export interface ProductReviewBundle {
  reviews: WCReview[];
  averageRating: number;
  reviewCount: number;
  histogram: Record<1 | 2 | 3 | 4 | 5, number>;
  media: WCReviewMedia[];
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeLegacyUrl(value: string) {
  const decoded = decodeHtmlEntities(value.trim());

  try {
    return new URL(decoded, LEGACY_SITE_URL).toString();
  } catch {
    return decoded;
  }
}

function detectMediaType(url: string): "image" | "video" | null {
  if (IMAGE_EXTENSION_PATTERN.test(url)) {
    return "image";
  }

  if (VIDEO_EXTENSION_PATTERN.test(url)) {
    return "video";
  }

  return null;
}

function formatReviewDate(review: WCReview) {
  if (review.formatted_date_created) {
    return review.formatted_date_created;
  }

  const date = new Date(review.date_created || review.date_created_gmt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildHistogram(reviews: WCReview[]): ProductReviewBundle["histogram"] {
  const histogram: ProductReviewBundle["histogram"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  reviews.forEach((review) => {
    const rating = Math.max(1, Math.min(5, Math.round(review.rating || 0))) as
      | 1
      | 2
      | 3
      | 4
      | 5;

    histogram[rating] += 1;
  });

  return histogram;
}

function extractReviewBlocks(html: string) {
  const blocks: Array<{ reviewId: number; html: string }> = [];
  const pattern =
    /<li\b[^>]*id=["']li-comment-(\d+)["'][^>]*>([\s\S]*?)(?=<li\b[^>]*id=["']li-comment-|\s*<\/ol>)/gi;

  for (const match of html.matchAll(pattern)) {
    const reviewId = Number(match[1]);
    const blockHtml = match[2];

    if (Number.isFinite(reviewId) && blockHtml) {
      blocks.push({ reviewId, html: blockHtml });
    }
  }

  return blocks;
}

function extractReviewMediaMap(html: string) {
  const mediaMap = new Map<number, WCReviewMedia[]>();

  extractReviewBlocks(html).forEach(({ reviewId, html: blockHtml }) => {
    const media: WCReviewMedia[] = [];
    const seen = new Set<string>();

    for (const anchorMatch of blockHtml.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const fullUrl = normalizeLegacyUrl(anchorMatch[1]);
      const type = detectMediaType(fullUrl);

      if (!type || seen.has(fullUrl)) {
        continue;
      }

      const thumbnailMatch = anchorMatch[2].match(/<img[^>]+src=["']([^"']+)["']/i);
      const thumbnail = thumbnailMatch ? normalizeLegacyUrl(thumbnailMatch[1]) : fullUrl;

      media.push({
        id: `${reviewId}-${media.length + 1}`,
        reviewId,
        type,
        url: fullUrl,
        thumbnail,
        alt: `Customer review media ${media.length + 1}`,
      });
      seen.add(fullUrl);
    }

    for (const sourceMatch of blockHtml.matchAll(/<source[^>]+src=["']([^"']+)["']/gi)) {
      const fullUrl = normalizeLegacyUrl(sourceMatch[1]);
      const type = detectMediaType(fullUrl);

      if (!type || seen.has(fullUrl)) {
        continue;
      }

      media.push({
        id: `${reviewId}-${media.length + 1}`,
        reviewId,
        type,
        url: fullUrl,
        thumbnail: fullUrl,
        alt: `Customer review media ${media.length + 1}`,
      });
      seen.add(fullUrl);
    }

    mediaMap.set(reviewId, media);
  });

  return mediaMap;
}

async function fetchLegacyProductHtml(product: WCProduct) {
  const sourceUrl = product.permalink
    ? normalizeLegacyUrl(product.permalink)
    : `${LEGACY_SITE_URL.replace(/\/$/, "")}/product/${product.slug}/`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout (non-critical fetch)

    const response = await fetch(sourceUrl, {
      next: {
        revalidate: 300,
      },
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": OUTBOUND_USER_AGENT,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return "";
    }

    const html = await response.text();
    return rewriteLegacyHtml(html);
  } catch (error) {
    console.error("[fetchLegacyProductHtml] Error or Timeout:", error);
    return "";
  }
}

function flattenReviewMedia(reviews: WCReview[]) {
  return reviews
    .flatMap((review) => review.media ?? [])
    .sort((left, right) => {
      const leftDate = new Date(left.createdAt || 0).getTime();
      const rightDate = new Date(right.createdAt || 0).getTime();

      return rightDate - leftDate;
    });
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function postReviewAjax(params: URLSearchParams) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(REVIEW_AJAX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": OUTBOUND_USER_AGENT,
      },
      body: params.toString(),
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const text = await response.text();
    return safeJsonParse<{ code?: number; description?: string; button?: string }>(text);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("[postReviewAjax] Error or Timeout:", error);
    return { code: 500, description: "Connection timed out to review server." };
  }
}

export async function getProductReviewBundle(product: WCProduct): Promise<ProductReviewBundle> {
  const [reviews, legacyHtml] = await Promise.all([
    getProductReviews({ product: product.id, per_page: 100 }),
    fetchLegacyProductHtml(product).catch(() => ""),
  ]);

  const mediaMap = extractReviewMediaMap(legacyHtml);

  const enrichedReviews = reviews.map((review) => {
    const reviewMedia = (mediaMap.get(review.id) ?? []).map((media) => ({
      ...media,
      reviewer: review.reviewer,
      createdAt: review.date_created || review.date_created_gmt,
    }));

    return {
      ...review,
      media: reviewMedia,
      media_count: reviewMedia.length,
      reviewer_display_name: review.reviewer,
      date_label: formatReviewDate(review),
    };
  });

  const reviewCount = enrichedReviews.length || product.rating_count || 0;
  const averageRating = reviewCount
    ? Number(
        (
          enrichedReviews.reduce((sum, review) => sum + (review.rating || 0), 0) /
          reviewCount
        ).toFixed(2),
      )
    : Number(product.average_rating || 0);

  return {
    reviews: enrichedReviews,
    averageRating,
    reviewCount,
    histogram: buildHistogram(enrichedReviews),
    media: flattenReviewMedia(enrichedReviews),
  };
}

export async function uploadCustomerReviewMedia(options: {
  productId: number;
  file: File;
}) {
  const formData = new FormData();
  formData.append("action", "cr_upload_media");
  formData.append("cr_item", String(options.productId));
  formData.append("cr_file", options.file);

  const response = await fetch(REVIEW_AJAX_URL, {
    method: "POST",
    headers: {
      "User-Agent": OUTBOUND_USER_AGENT,
    },
    body: formData,
    cache: "no-store",
  });

  const text = await response.text();
  const parsed = safeJsonParse<{
    code?: number;
    message?: string;
    attachment?: { id?: number; key?: string };
  }>(text);

  if (!parsed || parsed.code !== 200 || !parsed.attachment?.id || !parsed.attachment?.key) {
    throw new Error(parsed?.message || "Image upload failed.");
  }

  return {
    token: {
      id: parsed.attachment.id,
      key: parsed.attachment.key,
    } satisfies ReviewMediaToken,
  };
}

export async function deleteCustomerReviewMedia(token: ReviewMediaToken) {
  const params = new URLSearchParams();
  params.set("action", "cr_delete_media");
  params.set("image", JSON.stringify(token));

  const response = await fetch(REVIEW_AJAX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": OUTBOUND_USER_AGENT,
    },
    body: params.toString(),
    cache: "no-store",
  });

  const text = await response.text();
  const parsed = safeJsonParse<{ code?: number; message?: string }>(text);

  if (!parsed || parsed.code !== 200) {
    throw new Error(parsed?.message || "Could not remove the uploaded image.");
  }

  return { success: true };
}

export async function submitCustomerReview(options: {
  productId: number;
  rating: number;
  review: string;
  name: string;
  email: string;
  mediaTokens: ReviewMediaToken[];
}) {
  const ajaxParams = new URLSearchParams();
  ajaxParams.set("action", "cr_submit_review");
  ajaxParams.set("id", String(options.productId));
  ajaxParams.set("rating", String(options.rating));
  ajaxParams.set("review", options.review.trim());
  ajaxParams.set("name", options.name.trim());
  ajaxParams.set("email", options.email.trim());

  options.mediaTokens.forEach((token) => {
    ajaxParams.append("cr-upload-images-ids[]", JSON.stringify(token));
  });

  const ajaxResponse = await postReviewAjax(ajaxParams);

  if (ajaxResponse?.code === 0) {
    return {
      success: true,
      pendingApproval: true,
      message: ajaxResponse.description || "Your review was submitted for approval.",
    };
  }

  const commentParams = new URLSearchParams();
  commentParams.set("rating", String(options.rating));
  commentParams.set("comment", options.review.trim());
  commentParams.set("author", options.name.trim());
  commentParams.set("email", options.email.trim());
  commentParams.set("comment_post_ID", String(options.productId));
  commentParams.set("comment_parent", "0");
  commentParams.set("submit", "Submit");

  options.mediaTokens.forEach((token) => {
    commentParams.append("cr-upload-images-ids[]", JSON.stringify(token));
  });

  const fallbackResponse = await fetch(REVIEW_POST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": OUTBOUND_USER_AGENT,
    },
    body: commentParams.toString(),
    redirect: "manual",
    cache: "no-store",
  });

  if ([301, 302, 303, 307, 308].includes(fallbackResponse.status)) {
    return {
      success: true,
      pendingApproval: true,
      message: "Your review was submitted and is waiting for WooCommerce approval.",
    };
  }

  const fallbackText = await fallbackResponse.text();

  if (/awaiting approval/i.test(fallbackText)) {
    return {
      success: true,
      pendingApproval: true,
      message: "Your review was submitted and is waiting for WooCommerce approval.",
    };
  }

  throw new Error(
    ajaxResponse?.description ||
      "The WordPress review form is currently rejecting new submissions.",
  );
}
