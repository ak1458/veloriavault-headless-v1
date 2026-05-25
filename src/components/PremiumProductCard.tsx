"use client";

import Link from "next/link";
import Image from "next/image";
import { useWishlistStore } from "@/store/wishlist";
import { useCartStore } from "@/store/cart";
import { getRelativeProductLink, type WCProduct } from "@/lib/woocommerce";
import { getProductColorSwatches } from "@/lib/swatches";
import { Heart, Star } from "lucide-react";

interface PremiumProductCardProps {
  product: WCProduct;
  imageLoading?: "lazy" | "eager";
  showWishlist?: boolean;
}

export default function PremiumProductCard({
  product,
  imageLoading = "lazy",
  showWishlist = true,
}: PremiumProductCardProps) {
  const { isInWishlist, toggleItem } = useWishlistStore();
  const { addItem, openCart } = useCartStore();

  const wishlisted = isInWishlist(product.id);
  const productLink = getRelativeProductLink(product);
  const price = Number(product.price || product.regular_price || 0);
  const regularPrice = Number(product.regular_price || 0);
  const onSale = product.on_sale && price < regularPrice;
  
  const image = product.images[0]?.src || "/images/bag-placeholder.svg";
  const categoryName = product.categories[0]?.name || "Luxury Bag";
  const swatches = getProductColorSwatches(product);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    toggleItem({ id: product.id, name: product.name, slug: product.slug, href: productLink, price, image, category: categoryName });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    addItem({ id: product.id, name: product.name, slug: product.slug, href: productLink, price, image, category: categoryName });
    openCart();
  };

  return (
    <div className="group flex flex-col h-full bg-white transition-all duration-300">
      {/* Image Container - Original rounded-xl design */}
      <Link href={productLink} className="block relative aspect-square overflow-hidden rounded-xl bg-[#e5e2dd]">
        
        {/* Wishlist Icon (Top Right) */}
        {showWishlist && (
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
              wishlisted ? "bg-[#b59a5c] text-white" : "bg-white/90 text-gray-400 hover:text-red-500"
            }`}
            aria-label="Add to Wishlist"
          >
            <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
          </button>
        )}

        {/* Sale Badge */}
        {onSale && (
          <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-black text-white text-[9px] font-bold tracking-[0.2em] rounded bg-opacity-90">
            SALE
          </div>
        )}

        {/* Product Image (Original Scale & Transition) */}
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          priority={imageLoading === "eager"}
        />
        
        {/* Hover Overlay Button (Quick Add) */}
        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300 pointer-events-none">
          <button 
             onClick={handleAddToCart}
             className="w-full bg-white text-black py-3 rounded-lg text-[10px] font-bold tracking-widest uppercase shadow-xl pointer-events-auto hover:bg-[#b59a5c] hover:text-white transition-colors"
          >
             Quick Add
          </button>
        </div>
      </Link>

      {/* Product Info - Original Centered Styling */}
      <div className="pt-5 text-center flex flex-col items-center flex-grow">
        <h3 className="text-sm font-serif text-gray-900 mb-1 leading-tight group-hover:text-[#b59a5c] transition-colors">
          <Link href={productLink}>{product.name}</Link>
        </h3>
        
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">{categoryName}</p>
        
        {/* Star Rating */}
        <div className="flex items-center justify-center gap-0.5 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={10} className="text-[#b59a5c] fill-[#b59a5c]" />
          ))}
        </div>

        {/* Color Swatches */}
        {swatches.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mb-3" aria-label="Available colors">
            {swatches.slice(0, 6).map((swatch) => (
              <Link
                key={swatch.slug}
                href={swatch.href}
                onClick={(e) => e.stopPropagation()}
                aria-label={swatch.name}
                title={swatch.name}
                className="block w-4 h-4 rounded-full border border-gray-300 hover:scale-110 hover:border-[#b59a5c] transition-transform"
                style={{ backgroundColor: swatch.hex }}
              >
                <span className="sr-only">{swatch.label}</span>
              </Link>
            ))}
            {swatches.length > 6 && (
              <span className="text-[10px] text-gray-400 ml-1">+{swatches.length - 6}</span>
            )}
          </div>
        )}
        
        {/* Price Section */}
        <div className="flex items-center justify-center gap-3 mb-4">
          {onSale && (
            <span className="text-[11px] text-gray-300 line-through tracking-tighter decoration-[#b59a5c]">
              &#8377;{regularPrice.toLocaleString("en-IN")}
            </span>
          )}
          <span className="text-sm font-bold text-gray-900 tracking-tight">
            &#8377;{price.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Original Main Button */}
        <button
          onClick={handleAddToCart}
          className="mt-auto w-full py-3 bg-black text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded hover:bg-[#b59a5c] transition-all shadow-md shadow-black/5"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
