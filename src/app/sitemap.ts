import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getCategories, getParentProducts } from "@/lib/woocommerce";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const now = new Date();

  // Static pages (cart / wishlist / checkout are disallowed in robots.ts, so they stay out)
  const staticPages: MetadataRoute.Sitemap = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/shop", changeFrequency: "daily", priority: 0.9 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact-us", changeFrequency: "monthly", priority: 0.7 },
    { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms-conditions", changeFrequency: "yearly", priority: 0.3 },
    { path: "/shipping-policy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/refund-returns", changeFrequency: "yearly", priority: 0.3 },
    { path: "/warranty-policy", changeFrequency: "yearly", priority: 0.3 },
  ].map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: changeFrequency as "daily" | "monthly" | "yearly",
    priority,
  }));

  // Products & categories. Backend hiccups must never fail the build or the
  // sitemap, so each fetch degrades to an empty list.
  const [products, categories] = await Promise.all([
    getParentProducts().catch(() => []),
    getCategories().catch(() => []),
  ]);

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/product/${product.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/product-category/${category.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
