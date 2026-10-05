"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import PremiumProductCard from "@/components/PremiumProductCard";
import type { WCProduct } from "@/lib/woocommerce";
import { Search } from "lucide-react";

interface CategoryTab {
  slug: string;
  label: string;
}

interface ShopPageClientProps {
  products: WCProduct[];
  categoryTabs: CategoryTab[];
  activeCategorySlug?: string;
  searchTerm?: string;
}

export default function ShopPageClient({
  products,
  categoryTabs,
  activeCategorySlug,
  searchTerm,
}: ShopPageClientProps) {
  const searchParams = useSearchParams();
  const activeCategory = activeCategorySlug || searchParams.get("category");
  const search = searchTerm || searchParams.get("search");

  const [localSearch, setLocalSearch] = useState(searchTerm || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(localSearch.trim())}`;
    } else {
      window.location.href = "/shop";
    }
  };

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory) {
      result = result.filter((p) =>
        p.categories.some((c) => c.slug === activeCategory)
      );
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, activeCategory, search]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner (Original Stable Design) */}
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
          <h1 className="text-4xl md:text-5xl font-serif mb-8 text-white uppercase tracking-tight">
            {activeCategory ? activeCategory.replace(/-/g, ' ') : "OUR COLLECTION"}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search and Filter Bar (Original Horizontal Tabs) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 border-b border-gray-100 pb-8">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-4 md:gap-8 overflow-x-auto scrollbar-hide">
            <Link
              href="/shop"
              className={`text-[10px] tracking-[0.2em] uppercase py-2 border-b-2 transition-all whitespace-nowrap ${
                !activeCategory ? "border-black text-black font-bold" : "border-transparent text-gray-400 hover:text-black"
              }`}
            >
              All Styles
            </Link>
            {categoryTabs.map((tab) => (
              <Link
                key={tab.slug}
                href={`/shop?category=${tab.slug}`}
                className={`text-[10px] tracking-[0.2em] uppercase py-2 border-b-2 transition-all whitespace-nowrap ${
                  activeCategory === tab.slug ? "border-black text-black font-bold" : "border-transparent text-gray-400 hover:text-black"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full px-4 py-2 pr-10 border border-gray-200 text-[11px] uppercase tracking-widest focus:outline-none focus:border-black transition-colors"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-black transition-colors"
                aria-label="Search"
              >
                <Search size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">
            Showing {filteredProducts.length} results
          </p>
        </div>

        {/* Products Grid (Original 2 mobile / 4 desktop) */}
        {filteredProducts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8"
          >
            <AnimatePresence>
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PremiumProductCard
                    product={product}
                    imageLoading={index < 4 ? "eager" : "lazy"}
                    showWishlist={true}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-32 border-2 border-dashed border-gray-100 rounded-2xl">
            <p className="text-gray-400 text-sm mb-6 uppercase tracking-widest">No products found in this style</p>
            <Link
              href="/shop"
              className="inline-flex items-center px-10 py-4 bg-black text-white text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#b59a5c] transition-all"
            >
              Reset Filters
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
