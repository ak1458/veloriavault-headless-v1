"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PremiumProductCard from "@/components/PremiumProductCard";
import type { WCProduct, WCCategory } from "@/lib/woocommerce";

const CATEGORY_TABS = [
  { slug: "tote-bag", label: "Tote" },
  { slug: "satchel-bag", label: "Satchel" },
  { slug: "sling-bag", label: "Sling" },
  { slug: "crossbody", label: "Crossbody" },
  { slug: "clutch", label: "Clutch" },
  { slug: "wallet", label: "Wallet" },
];

interface CategoryContentProps {
  categorySlug: string;
  initialCategories: WCCategory[];
  initialProducts: WCProduct[];
}

export default function CategoryContent({ 
  categorySlug, 
  initialCategories, 
  initialProducts 
}: CategoryContentProps) {
  // Filter categories
  const categories = useMemo(() => {
    return initialCategories
      .filter((c) => CATEGORY_TABS.some((t) => t.slug === c.slug))
      .sort((left, right) => {
        const leftIndex = CATEGORY_TABS.findIndex((t) => t.slug === left.slug);
        const rightIndex = CATEGORY_TABS.findIndex((t) => t.slug === right.slug);
        return leftIndex - rightIndex;
      });
  }, [initialCategories]);

  // Filter products by category
  const products = useMemo(() => {
    return initialProducts.filter((product) =>
      product.categories.some((category) => category.slug === categorySlug)
    );
  }, [initialProducts, categorySlug]);

  const categoryName = useMemo(() => {
    const cat = initialCategories.find((c) => c.slug === categorySlug);
    return cat?.name || categorySlug;
  }, [initialCategories, categorySlug]);

  const getCategoryLabel = (slug: string) => {
    const tab = CATEGORY_TABS.find((t) => t.slug === slug);
    return tab?.label || slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-white pb-20 lg:pb-0">
      {/* Hero Banner */}
      <div className="relative bg-[#1a1a1a] py-20 md:py-28">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "url('/wp-content/uploads/2026/01/Bag-8-3-scaled.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-white mb-4">
            {categoryName}
          </h1>
          <p className="text-gray-300 text-lg">
            Browse our {categoryName.toLowerCase()} collection
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          <Link
            href="/shop"
            className="px-4 py-2 text-xs font-medium tracking-wider uppercase transition-all duration-200 border bg-white text-gray-700 border-gray-200 hover:border-black"
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/product-category/${category.slug}`}
              className={`px-4 py-2 text-xs font-medium tracking-wider uppercase transition-all duration-200 border ${
                categorySlug === category.slug
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:border-black"
              }`}
            >
              {getCategoryLabel(category.slug)}
            </Link>
          ))}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            Showing {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
          >
            <AnimatePresence>
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.12), duration: 0.2 }}
                >
                  <PremiumProductCard
                    product={product}
                    imageLoading={index < 4 ? "eager" : "lazy"}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-4">No products found in this category</p>
            <Link
              href="/shop"
              className="inline-flex items-center px-6 py-3 bg-black text-white text-xs font-bold tracking-wider uppercase hover:bg-[#b59a5c] transition-colors"
            >
              View All Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
