import ShopContent from "./ShopContent";
import { getCategories, getParentProducts } from "@/lib/woocommerce";
import type { Metadata } from "next";

export const revalidate = 300; // ISR: refresh every 5 minutes

export const metadata: Metadata = {
  title: "Shop | Veloria Vault",
  description: "Browse Veloria Vault's collection of luxury leather handbags, totes, satchels, and accessories.",
  alternates: {
    canonical: "/shop",
  },
  openGraph: {
    title: "Shop | Veloria Vault",
    description: "Browse our collection of luxury leather handbags, totes, satchels, and accessories.",
    url: "/shop",
    images: [
      {
        url: "/images/covers/shop.png",
        width: 1200,
        height: 630,
        alt: "Shop Veloria Vault",
      },
    ],
  },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const params = await searchParams;
  const [categories, allProducts] = await Promise.all([
    getCategories(),
    getParentProducts(),
  ]);

  return (
    <ShopContent 
      initialCategories={categories} 
      initialProducts={allProducts}
      initialCategorySlug={params.category}
      initialSearchTerm={params.search}
    />
  );
}
