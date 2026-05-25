import { cache } from "react";
import { LEGACY_SITE_URL } from "@/lib/site";

export interface WCImage {
  id: number;
  src: string;
  alt: string;
  name?: string;
}

export interface WCCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  image: WCImage | null;
}

export interface WCAttributeTerm {
  id?: number;
  name: string;
  slug: string;
}

export interface WCAttribute {
  id: number;
  name: string;
  slug: string;
  option: string;
  options?: string[];
  /**
   * Available terms for this attribute, including their slugs. Populated for
   * parent (variable) products from Store API `attributes[].terms`. Used to
   * render color swatches that link to specific variations.
   */
  terms?: WCAttributeTerm[];
  variation?: boolean;
  visible?: boolean;
}

export interface WCMetaData {
  id: number;
  key: string;
  value: unknown;
}

export interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  parent_id: number;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  image?: WCImage;
  images: WCImage[];
  categories: WCCategory[];
  average_rating: string;
  rating_count: number;
  stock_status: string;
  stock_quantity?: number | null;
  sku: string;
  related_ids: number[];
  attributes: WCAttribute[];
  variations: number[];
  menu_order: number;
  price_html?: string;
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  meta_data: WCMetaData[];
}

export interface WCReview {
  id: number;
  date_created: string;
  date_created_gmt: string;
  product_id: number;
  product_name?: string;
  product_permalink?: string;
  product_image?: WCImage;
  formatted_date_created?: string;
  status: string;
  reviewer: string;
  reviewer_email: string;
  review: string;
  rating: number;
  verified: boolean;
  reviewer_avatar_urls: {
    [key: string]: string;
  };
  reviewer_display_name?: string;
  date_label?: string;
  media_count?: number;
  media?: WCReviewMedia[];
}

export interface WCReviewMedia {
  id: string;
  reviewId: number;
  type: "image" | "video";
  url: string;
  thumbnail: string;
  alt: string;
  reviewer?: string;
  createdAt?: string;
}

interface WCFetchOptions {
  revalidate?: number | false;
  cacheBustVersion?: string | false;
}

interface StorePriceInfo {
  price?: string;
  regular_price?: string;
  sale_price?: string;
  currency_minor_unit?: number;
}

interface StoreImage {
  id?: number;
  src?: string;
  thumbnail?: string;
  alt?: string;
  name?: string;
}

interface StoreCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
  image?: StoreImage | null;
  permalink?: string;
}

interface StoreAttributeTerm {
  id?: number;
  name: string;
  slug: string;
}

interface StoreAttribute {
  id?: number;
  name: string;
  taxonomy?: string;
  has_variations?: boolean;
  terms?: StoreAttributeTerm[];
}

interface StoreProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  parent?: number;
  variation?: string;
  description?: string;
  short_description?: string;
  on_sale?: boolean;
  prices?: StorePriceInfo;
  price_html?: string;
  average_rating?: string;
  review_count?: number;
  images?: StoreImage[];
  categories?: StoreCategory[];
  attributes?: StoreAttribute[];
  variations?: number[];
  sku?: string;
  is_in_stock?: boolean;
  is_on_backorder?: boolean;
  low_stock_remaining?: number | null;
}

interface StoreReview {
  id: number;
  date_created: string;
  formatted_date_created?: string;
  date_created_gmt: string;
  product_id: number;
  product_name?: string;
  product_permalink?: string;
  product_image?: StoreImage;
  review?: string;
  reviewer?: string;
  rating?: number;
  verified?: boolean;
  reviewer_avatar_urls?: Record<string, string>;
}

const WC_API_URL = process.env.WC_API_URL?.trim();
const CONSUMER_KEY = process.env.WC_CONSUMER_KEY?.trim();
const CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET?.trim();
const DEFAULT_REVALIDATE_SECONDS = 300;

const STORE_API_ORIGIN =
  process.env.NEXT_PUBLIC_STORE_API_URL?.trim()?.replace(/\/wp-json\/wc\/store\/v1\/?$/, "") ||
  process.env.NEXT_PUBLIC_LEGACY_SITE_URL?.trim()?.replace(/\/$/, "") ||
  WC_API_URL?.replace(/\/wp-json\/wc\/v3\/?$/, "").replace("://wp.", "://") ||
  "https://api.veloriavault.com";

const STORE_API_URL = `${STORE_API_ORIGIN.replace(/\/$/, "")}/wp-json/wc/store/v1`;

function rewriteMediaUrl(url: string | undefined | null): string {
  if (!url) {
    return "";
  }

  if (url.startsWith("/wp-content") || url.startsWith("/wp-includes")) {
    return url;
  }

  try {
    const parsed = new URL(url, STORE_API_ORIGIN);

    if (
      parsed.pathname.startsWith("/wp-content") ||
      parsed.pathname.startsWith("/wp-includes")
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return url;
  }

  return url;
}

function rewriteAllMediaUrls(data: unknown): unknown {
  if (typeof data === "string") {
    return rewriteMediaUrl(data);
  }

  if (Array.isArray(data)) {
    return data.map(rewriteAllMediaUrls);
  }

  if (data && typeof data === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (
        typeof value === "string" &&
        ["src", "thumbnail", "href", "data_src", "data_thumb", "data_large_image", "image"].includes(key)
      ) {
        result[key] = rewriteMediaUrl(value);
      } else if (typeof value === "object" || Array.isArray(value)) {
        result[key] = rewriteAllMediaUrls(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  return data;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      // Vercel Hobby plan has a 10s function timeout.
      // Keep per-request timeout well under that to leave room for retries.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per request
      
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok || response.status < 500) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      console.warn(`[fetchWithRetry] Attempt ${i + 1}/${retries} failed for ${url}:`, error instanceof Error ? error.message : error);
    }
    if (i < retries - 1) {
      // Short backoff to stay within function time limits
      await new Promise((res) => setTimeout(res, 500));
    }
  }
  throw lastError;
}

async function storeFetch<T>(
  endpoint: string,
  params: Record<string, string | number | boolean> = {},
  options: WCFetchOptions = {},
): Promise<T> {
  const url = new URL(`${STORE_API_URL}${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  });

  const cacheBustVersion = options.cacheBustVersion ?? "4";
  if (cacheBustVersion) {
    url.searchParams.set("v", cacheBustVersion);
  }

  try {
    const response = await fetchWithRetry(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "VeloriaVault/Next.js (Vercel Node.js Fetcher)",
      },
      ...(options.revalidate === false
        ? { cache: "no-store" as const }
        : {
            next: {
              revalidate: options.revalidate ?? DEFAULT_REVALIDATE_SECONDS,
            },
          }),
    });

    if (!response.ok) {
      if (endpoint.includes("/products")) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
      const fallback = endpoint.includes("/reviews") || endpoint.includes("/categories")
        ? []
        : {};
      return fallback as T;
    }

    const data = await response.json();
    return rewriteAllMediaUrls(data) as T;
  } catch (error) {
    console.error("[storeFetch] Error:", endpoint, error);
    if (endpoint.includes("/products")) {
      throw error; // Let the Next.js Error Boundary handle it instead of showing 0 products
    }
    const fallback = endpoint.includes("/reviews") || endpoint.includes("/categories")
      ? []
      : {};
    return fallback as T;
  }
}

async function storeFetchCollection<T>(
  endpoint: string,
  params: Record<string, string | number | boolean> = {},
  options: WCFetchOptions = {},
): Promise<T[]> {
  const perPage = Number(params.per_page ?? 100);
  const initialPage = Number(params.page ?? 1);
  const results: T[] = [];

  let page = initialPage;

  while (true) {
    const pageItems = await storeFetch<T[]>(
      endpoint,
      {
        ...params,
        per_page: perPage,
        page,
      },
      options,
    );

    if (!Array.isArray(pageItems) || pageItems.length === 0) {
      break;
    }

    results.push(...pageItems);

    if (pageItems.length < perPage || params.page) {
      break;
    }

    page += 1;
  }

  return results;
}

async function adminFetch<T>(
  endpoint: string,
  params: Record<string, string | number | boolean> = {},
  options: WCFetchOptions = {},
): Promise<T> {
  if (!WC_API_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
    const fallback = endpoint.includes("/coupons") ? [] : {};
    return fallback as T;
  }

  const url = new URL(`${WC_API_URL}${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64")}`,
        "User-Agent": "VeloriaVault/Next.js (Vercel Admin Fetcher)",
      },
      ...(options.revalidate === false
        ? { cache: "no-store" as const }
        : {
            next: {
              revalidate: options.revalidate ?? DEFAULT_REVALIDATE_SECONDS,
            },
          }),
    });

    if (!response.ok) {
      const fallback = endpoint.includes("/coupons") ? [] : {};
      return fallback as T;
    }

    const data = await response.json();
    return rewriteAllMediaUrls(data) as T;
  } catch (error) {
    console.error("[adminFetch] Error:", endpoint, error);
    const fallback = endpoint.includes("/coupons") ? [] : {};
    return fallback as T;
  }
}

function fallbackSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatMinorUnitPrice(value: string | undefined, minorUnit = 2): string {
  const parsed = Number.parseInt(value || "0", 10);
  if (!Number.isFinite(parsed)) {
    return "0";
  }

  return (parsed / 10 ** minorUnit).toFixed(minorUnit);
}

function mapStoreImage(image: StoreImage | undefined | null, fallbackAlt = ""): WCImage | null {
  if (!image?.src) {
    return null;
  }

  return {
    id: image.id ?? 0,
    src: rewriteMediaUrl(image.src),
    alt: image.alt || fallbackAlt,
    name: image.name,
  };
}

function mapStoreCategory(category: StoreCategory): WCCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description || "",
    count: category.count ?? 0,
    image: mapStoreImage(category.image, category.name),
  };
}

function parseVariationAttributes(variation: string | undefined): WCAttribute[] {
  if (!variation) {
    return [];
  }

  const attributes: WCAttribute[] = [];

  variation.split(/\s*,\s*/).forEach((segment) => {
    const [rawName, ...optionParts] = segment.split(":");
    const name = rawName?.trim();
    const option = optionParts.join(":").trim();

    if (!name || !option) {
      return;
    }

    const normalizedName = name.toLowerCase();
    const slug = normalizedName === "color" ? "pa_color" : fallbackSlug(name);

    attributes.push({
      id: 0,
      name,
      slug,
      option,
      options: [option],
      variation: true,
      visible: true,
    });
  });

  return attributes;
}

function mapStoreAttributes(product: StoreProduct): WCAttribute[] {
  const variationAttributes = parseVariationAttributes(product.variation);
  if (variationAttributes.length > 0) {
    return variationAttributes;
  }

  return (product.attributes ?? []).map((attribute) => ({
    id: attribute.id ?? 0,
    name: attribute.name,
    slug: attribute.taxonomy || fallbackSlug(attribute.name),
    option: "",
    options: attribute.terms?.map((term) => term.name) ?? [],
    terms:
      attribute.terms?.map((term) => ({
        id: term.id,
        name: term.name,
        slug: term.slug,
      })) ?? [],
    variation: attribute.has_variations ?? false,
    visible: true,
  }));
}

function buildDisplayName(product: StoreProduct): string {
  const variationAttributes = parseVariationAttributes(product.variation);
  if (variationAttributes.length === 0) {
    return product.name;
  }

  const suffix = variationAttributes.map((attribute) => attribute.option).join(" / ");
  return `${product.name} - ${suffix}`;
}

function mapStoreProduct(product: StoreProduct): WCProduct {
  const images = (product.images ?? [])
    .map((image) => mapStoreImage(image, product.name))
    .filter((image): image is WCImage => Boolean(image));

  const minorUnit = product.prices?.currency_minor_unit ?? 2;

  return {
    id: product.id,
    name: buildDisplayName(product),
    slug: product.slug,
    permalink: product.permalink || "",
    type: product.type || (product.parent ? "variation" : "variable"),
    parent_id: product.parent ?? 0,
    description: product.description || "",
    short_description: product.short_description || "",
    price: formatMinorUnitPrice(product.prices?.price, minorUnit),
    regular_price: formatMinorUnitPrice(product.prices?.regular_price, minorUnit),
    sale_price: formatMinorUnitPrice(product.prices?.sale_price, minorUnit),
    on_sale: product.on_sale ?? false,
    image: images[0],
    images,
    categories: (product.categories ?? []).map(mapStoreCategory),
    average_rating: product.average_rating || "0",
    rating_count: product.review_count ?? 0,
    stock_status: product.is_in_stock
      ? product.is_on_backorder
        ? "onbackorder"
        : "instock"
      : "outofstock",
    stock_quantity: product.low_stock_remaining ?? null,
    sku: product.sku || "",
    related_ids: [],
    attributes: mapStoreAttributes(product),
    variations: product.variations ?? [],
    menu_order: 0,
    price_html: product.price_html,
    meta_data: [],
  };
}

function mapStoreReview(review: StoreReview): WCReview {
  return {
    id: review.id,
    date_created: review.date_created,
    formatted_date_created: review.formatted_date_created,
    date_created_gmt: review.date_created_gmt,
    product_id: review.product_id,
    product_name: review.product_name,
    product_permalink: review.product_permalink,
    product_image: mapStoreImage(review.product_image, review.product_name || "") || undefined,
    status: "approved",
    reviewer: review.reviewer || "Veloria Customer",
    reviewer_email: "",
    review: review.review || "",
    rating: review.rating ?? 0,
    verified: review.verified ?? false,
    reviewer_avatar_urls: review.reviewer_avatar_urls || {},
  };
}

interface AdminApiImage {
  id?: number;
  src?: string;
  alt?: string;
  name?: string;
}

interface AdminApiCategory {
  id: number;
  name: string;
  slug: string;
}

interface AdminApiAttribute {
  id?: number;
  name: string;
  options?: string[];
  variation?: boolean;
  visible?: boolean;
}

interface AdminApiProduct {
  id: number;
  name: string;
  slug: string;
  permalink?: string;
  type?: string;
  parent_id?: number;
  description?: string;
  short_description?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  on_sale?: boolean;
  images?: AdminApiImage[];
  categories?: AdminApiCategory[];
  average_rating?: string;
  rating_count?: number;
  stock_status?: string;
  stock_quantity?: number | null;
  sku?: string;
  related_ids?: number[];
  attributes?: AdminApiAttribute[];
  variations?: number[];
  menu_order?: number;
  price_html?: string;
  meta_data?: WCMetaData[];
}

function mapAdminProduct(product: AdminApiProduct): WCProduct {
  // Admin API (v3) uses simple strings for prices, Store API (v1) uses a nested object.
  // We normalize everything to WCProduct format.
  const images = (product.images ?? []).map((img) => ({
    id: img.id ?? 0,
    src: rewriteMediaUrl(img.src),
    alt: img.alt || product.name,
    name: img.name,
  }));

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    permalink: product.permalink || "",
    type: product.type || "simple",
    parent_id: product.parent_id ?? 0,
    description: product.description || "",
    short_description: product.short_description || "",
    price: product.price || "0",
    regular_price: product.regular_price || product.price || "0",
    sale_price: product.sale_price || "",
    on_sale: product.on_sale ?? false,
    image: images[0],
    images,
    categories: (product.categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: "",
      count: 0,
      image: null,
    })),
    average_rating: product.average_rating || "0",
    rating_count: product.rating_count ?? 0,
    stock_status: product.stock_status || "instock",
    stock_quantity: product.stock_quantity ?? null,
    sku: product.sku || "",
    related_ids: product.related_ids || [],
    attributes: (product.attributes ?? []).map((a) => ({
      id: a.id ?? 0,
      name: a.name,
      slug: a.name.toLowerCase(),
      option: a.options?.[0] || "",
      options: a.options || [],
      variation: a.variation ?? false,
      visible: a.visible ?? true,
    })),
    variations: product.variations || [],
    menu_order: product.menu_order || 0,
    price_html: product.price_html,
    meta_data: product.meta_data || [],
  };
}


const PRODUCT_SLUG_STOP_WORDS = new Set([
  "bag",
  "bags",
  "tote",
  "satchel",
  "sling",
  "wallet",
  "clutch",
  "crossbody",
  "hobo",
  "shoulder",
]);

function extractProductSlugFromPermalink(permalink?: string | null): string | null {
  if (!permalink) {
    return null;
  }

  try {
    const url = new URL(permalink, LEGACY_SITE_URL);
    const pathParts = url.pathname
      .split("/")
      .filter(Boolean)
      .map((part) => part.toLowerCase());
    const productIndex = pathParts.indexOf("product");
    const slug = pathParts[productIndex + 1];

    return slug ? fallbackSlug(slug) : null;
  } catch {
    return null;
  }
}

function buildSlugAliases(value: string): string[] {
  const normalizedValue = fallbackSlug(value);
  const aliases = new Set<string>([normalizedValue]);
  const trimmedTokens = normalizedValue
    .split("-")
    .filter(Boolean)
    .filter((token) => !PRODUCT_SLUG_STOP_WORDS.has(token));

  if (trimmedTokens.length) {
    aliases.add(trimmedTokens.join("-"));
  }

  return Array.from(aliases).filter(Boolean);
}

function findMatchedProduct(products: WCProduct[], requestedSlug: string): WCProduct | null {
  const aliases = new Set(buildSlugAliases(requestedSlug));
  const exactMatchers = [
    (product: WCProduct) => {
      const permalinkSlug = extractProductSlugFromPermalink(product.permalink);
      return permalinkSlug ? aliases.has(permalinkSlug) : false;
    },
    (product: WCProduct) => aliases.has(fallbackSlug(product.slug)),
    (product: WCProduct) => aliases.has(fallbackSlug(product.name)),
  ];

  for (const matcher of exactMatchers) {
    const parentMatch =
      products.find(
        (product) =>
          product.parent_id === 0 &&
          product.type !== "variation" &&
          matcher(product),
      ) ?? null;

    if (parentMatch) {
      return parentMatch;
    }

    const anyMatch = products.find((product) => matcher(product)) ?? null;
    if (anyMatch) {
      return anyMatch;
    }
  }

  // Last resort: Fuzzy matching if no exact alias matches.
  // This helps find 'freya-cherry' when 'freya' is requested.
  const normalizedRequested = requestedSlug.toLowerCase();
  return (
    products.find((product) => {
      const slug = fallbackSlug(product.slug);
      const name = fallbackSlug(product.name);
      return slug.includes(normalizedRequested) || name.includes(normalizedRequested);
    }) ?? null
  );
}

export async function getProducts(options: {
  per_page?: number;
  page?: number;
  category?: number;
  search?: string;
  slug?: string;
  orderby?: string;
  order?: string;
  include?: number[];
  type?: string;
  fields?: string[];
} = {}): Promise<WCProduct[]> {
  const {
    per_page = 20,
    page,
    include,
    fields: _fields,
    category,
    search,
    slug,
    orderby,
    order,
    type,
  } = options;

  void _fields;

  if (include?.length) {
    return getProductsByIds(include);
  }

  const storeProducts = await storeFetch<StoreProduct[]>("/products", {
    per_page,
    page: page || 1,
    search: search || "",
    slug: slug || "",
    type: type === "variation" ? "variation" : "",
    orderby: orderby || "",
    order: order || "",
    ...(category ? { category } : {}),
  });

  let products = storeProducts.map(mapStoreProduct);

  if (category) {
    products = products.filter((product) =>
      product.categories.some((productCategory) => productCategory.id === category),
    );
  }

  return products;
}

export async function getProductById(id: number): Promise<WCProduct | null> {
  try {
    const product = await storeFetch<StoreProduct>(`/products/${id}`);

    if (!product || typeof product !== "object" || !("id" in product)) {
      // Fallback to Admin API
      const adminProduct = await adminFetch<AdminApiProduct | Record<string, never>>(
        `/products/${id}`,
      );
      if (
        adminProduct &&
        typeof adminProduct === "object" &&
        "id" in adminProduct &&
        adminProduct.id
      ) {
        return mapAdminProduct(adminProduct as AdminApiProduct);
      }
      return null;
    }

    return mapStoreProduct(product);
  } catch (error) {
    console.error("Error fetching product by id:", error);
    return null;
  }
}

// Wrapped with React cache() to deduplicate calls within the same request.
// generateMetadata() and the page component both call this — cache() ensures
// only ONE actual API call is made per request, not two.
export const getProductBySlug = cache(async function getProductBySlug(slug: string): Promise<WCProduct | null> {
  try {
    const normalizedSlug = fallbackSlug(slug);

    const hydrateMatchedProduct = async (
      matchedProduct: WCProduct | null,
    ): Promise<WCProduct | null> => {
      if (!matchedProduct) {
        return null;
      }

      if (matchedProduct.parent_id > 0) {
        return getProductById(matchedProduct.parent_id);
      }

      return matchedProduct;
    };

    // Fast path 1: Try finding the product directly by its slug using the Store API.
    const directMatches = await getProducts({ slug: normalizedSlug, per_page: 10 });
    const directMatch = await hydrateMatchedProduct(
      findMatchedProduct(directMatches, normalizedSlug),
    );

    if (directMatch) {
      return directMatch;
    }

    // Fast path 2: Try the Admin API (WC v3) which supports exact slug filtering natively.
    // We use it to find the ID, then fetch via Store API for consistency.
    try {
      const adminMatches = await adminFetch<Array<{ id: number }>>("/products", {
        slug: normalizedSlug,
        per_page: 1,
        _fields: "id",
      });
      if (Array.isArray(adminMatches) && adminMatches.length > 0 && adminMatches[0].id) {
        return getProductById(adminMatches[0].id);
      }
    } catch (error) {
      console.warn("[getProductBySlug] Admin API ID lookup failed:", error);
    }

    // Fallback: Use a search term query to find the product.
    // We do this if the exact slug match failed, regardless of hyphens.
    const searchTerms = normalizedSlug.replace(/-/g, " ");
    const searchMatches = await getProducts({
      search: searchTerms,
      per_page: 60, // Wide search to find the best match
    });
    
    const matchedProduct = await hydrateMatchedProduct(
      findMatchedProduct(searchMatches, normalizedSlug),
    );

    if (matchedProduct) {
      return matchedProduct;
    }

    return null;
  } catch (error) {
    console.error("Error fetching product by slug:", error);
    return null;
  }
});

export async function getProductVariations(
  productId: number,
  _productPermalink?: string,
): Promise<WCProduct[]> {
  try {
    void _productPermalink;
    const variations = await storeFetchCollection<StoreProduct>("/products", {
      parent: productId,
      per_page: 100,
    });

    return variations
      .map(mapStoreProduct)
      .filter((variation) => variation.parent_id === productId);
  } catch (error) {
    console.error("Error fetching product variations:", error);
    return [];
  }
}

export async function getCategories(): Promise<WCCategory[]> {
  const categories = await storeFetchCollection<StoreCategory>(
    "/products/categories",
    {
      per_page: 100,
    },
  );

  return categories
    .filter((category) => (category.count ?? 0) > 0)
    .map(mapStoreCategory);
}

export async function getProductReviews(params: {
  product?: number;
  per_page?: number;
  page?: number;
} = {}): Promise<WCReview[]> {
  try {
    const reviews = await storeFetch<StoreReview[]>("/products/reviews", {
      per_page: params.per_page || 10,
      page: params.page || 1,
      product_id: params.product || "",
    });

    let mappedReviews = Array.isArray(reviews) ? reviews.map(mapStoreReview) : [];

    // Strict Validation: Ensure reviews exactly map to the requested product_id to prevent mismatch
    if (params.product) {
      mappedReviews = mappedReviews.filter(
        (review) => review.product_id === params.product
      );
    }

    return mappedReviews;
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    return [];
  }
}

export async function getVariationProducts(options: {
  categorySlug?: string;
  search?: string;
} = {}): Promise<WCProduct[]> {
  const storeProducts = await storeFetchCollection<StoreProduct>("/products", {
    type: "variation",
    per_page: 100,
    search: options.search || "",
  });

  let products = storeProducts.map(mapStoreProduct);

  if (options.categorySlug) {
    products = products.filter((product) =>
      product.categories.some((category) => category.slug === options.categorySlug),
    );
  }

  return products;
}

export async function getParentProducts(options: {
  per_page?: number;
  categorySlug?: string;
  search?: string;
} = {}): Promise<WCProduct[]> {
  // The WooCommerce Store API list endpoint excludes individual variations
  // by default and returns the parent (variable + simple) products in a
  // single request. This is much faster than fetching all variations and
  // then re-hydrating each parent individually.
  const storeProducts = await storeFetchCollection<StoreProduct>("/products", {
    per_page: options.per_page ?? 100,
    search: options.search ?? "",
  });

  // Defensive filter — keep only top-level parent/simple products. Variations
  // would have parent > 0; we never want them in listings.
  let products = storeProducts
    .filter((product) => !product.parent || product.parent === 0)
    .filter((product) => product.type !== "variation")
    .map(mapStoreProduct);

  if (options.categorySlug) {
    products = products.filter((product) =>
      product.categories.some((category) => category.slug === options.categorySlug),
    );
  }

  return products;
}

export async function getProductsByIds(ids: number[]): Promise<WCProduct[]> {
  if (!ids.length) {
    return [];
  }

  // Strategy 1: Parallel individual fetches via Store API (fastest path).
  // NOTE: The Store API list endpoint with `include` does NOT return
  // variable/parent products — only simple and variation types appear
  // in list results. Individual `/products/{id}` works for all types,
  // so we skip the batch include call entirely to save time on Vercel.
  const settledProducts = await Promise.allSettled(ids.map((id) => getProductById(id)));

  const results = ids
    .map((_, i) => {
      const settled = settledProducts[i];
      if (settled?.status === "fulfilled" && settled.value) {
        return settled.value;
      }
      return null;
    })
    .filter((product): product is WCProduct => Boolean(product));

  if (results.length > 0) {
    return results;
  }

  // Strategy 2: If individual Store API fetches all failed, try the Admin API
  try {
    const adminPromises = ids.map((id) =>
      adminFetch<AdminApiProduct | Record<string, never>>(`/products/${id}`).catch(
        () => null,
      ),
    );
    const adminResults = await Promise.all(adminPromises);
    const mapped = adminResults
      .filter(
        (entry): entry is AdminApiProduct =>
          Boolean(entry && typeof entry === "object" && "id" in entry && entry.id),
      )
      .map(mapAdminProduct);
    if (mapped.length > 0) return mapped;
  } catch {
    // Fall through
  }

  return [];
}

export async function getRelatedProducts(
  product: WCProduct,
  existingProducts?: WCProduct[],
): Promise<WCProduct[]> {
  // Use pre-fetched products if available, otherwise fetch only from same category
  let candidates: WCProduct[];
  if (existingProducts && existingProducts.length > 0) {
    candidates = existingProducts;
  } else {
    // Only fetch products from the same category instead of the entire store
    const categorySlug = product.categories[0]?.slug;
    candidates = categorySlug
      ? await getVariationProducts({ categorySlug })
      : [];
  }

  return candidates
    .filter(
      (candidate) =>
        candidate.parent_id !== product.id &&
        candidate.id !== product.id &&
        candidate.parent_id !== product.parent_id,
    )
    .filter((candidate) =>
      candidate.categories.some((category) =>
        product.categories.some((productCategory) => productCategory.id === category.id),
      ),
    )
    .slice(0, 4);
}

export function getVariationQueryValue(
  product: Pick<WCProduct, "permalink" | "attributes">,
  attributeSlug = "pa_color",
): string | null {
  if (product.permalink) {
    try {
      const url = new URL(product.permalink);
      return url.searchParams.get(`attribute_${attributeSlug}`);
    } catch {
      return null;
    }
  }

  const attribute = product.attributes.find((item) => item.slug === attributeSlug);
  return attribute?.option ? fallbackSlug(attribute.option) : null;
}

export function getRelativeProductLink(product: WCProduct, parentSlug?: string): string {
  if (product.permalink) {
    try {
      const url = new URL(product.permalink);
      return `${url.pathname}${url.search}`;
    } catch {
      // Ignore invalid URLs and use the fallback below.
    }
  }

  const slug =
    extractProductSlugFromPermalink(product.permalink) ??
    parentSlug ??
    product.slug;
  const colorValue = getVariationQueryValue(product);

  return colorValue ? `/product/${slug}?attribute_pa_color=${colorValue}` : `/product/${slug}`;
}

export interface WCCoupon {
  id: number;
  code: string;
  amount: string;
  discount_type: "percent" | "fixed_cart" | "fixed_product";
  description: string;
  date_expires: string | null;
  usage_limit: number | null;
  usage_count: number;
  minimum_amount: string;
  maximum_amount: string;
  product_ids: number[];
  excluded_product_ids: number[];
  customer_emails: string[];
}

export async function getCouponByCode(code: string): Promise<WCCoupon | null> {
  try {
    const coupons = await adminFetch<WCCoupon[]>("/coupons", { code }, { revalidate: false });
    return Array.isArray(coupons) && coupons.length > 0 ? coupons[0] : null;
  } catch (error) {
    console.error("Error fetching coupon by code:", error);
    return null;
  }
}
