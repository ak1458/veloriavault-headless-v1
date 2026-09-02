"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Heart,
  LayoutGrid,
  Maximize2,
  Minus,
  Plus,
  Star,
  X,
} from "lucide-react";
import {
  getRelativeProductLink,
  getVariationQueryValue,
  type WCProduct,
} from "@/lib/woocommerce";
import type { ProductReviewBundle } from "@/lib/reviews";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import ProductOffers from "@/components/ProductOffers";
import ProductAccordion from "@/components/ProductAccordion";
import ProductTrustBadges from "@/components/ProductTrustBadges";
import ProductReviewSection from "@/components/ProductReviewSection";
import ScratchCoupon from "@/components/ScratchCoupon";

interface ProductDetailsProps {
  product: WCProduct;
  variations: WCProduct[];
  reviewBundle?: ProductReviewBundle;
}

interface VariationOption {
  id: number;
  color: string;
  queryValue: string;
  swatchImage: string;
  product: WCProduct;
}

interface GalleryImage {
  id: number;
  src: string;
  alt: string;
}

const DESKTOP_VISIBLE_THUMBS = 3;

function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html);
}

function toQueryValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildVariationOptions(
  variations: WCProduct[],
  fallbackImage: string,
): VariationOption[] {
  return variations
    .map((variation) => {
      const colorAttr = variation.attributes.find(
        (attribute) =>
          attribute.slug === "pa_color" ||
          attribute.name.toLowerCase().includes("color"),
      );

      if (!colorAttr?.option) {
        return null;
      }

      return {
        id: variation.id,
        color: colorAttr.option,
        queryValue:
          getVariationQueryValue(variation) ?? toQueryValue(colorAttr.option),
        swatchImage:
          variation.image?.src ?? variation.images?.[0]?.src ?? fallbackImage,
        product: variation,
      };
    })
    .filter((option): option is VariationOption => Boolean(option));
}

function getGalleryImages(
  product: WCProduct,
  selectedVariation: WCProduct | null,
): GalleryImage[] {
  const baseImages = (product.images ?? [])
    .filter((image) => Boolean(image?.src))
    .map((image, index) => ({
      id: image.id || index,
      src: image.src,
      alt: image.alt || `${product.name} ${index + 1}`,
    }));

  if (!selectedVariation) {
    return baseImages;
  }

  const variationImages = (selectedVariation.images ?? [])
    .filter((image) => Boolean(image?.src))
    .map((image, index) => ({
      id: image.id || selectedVariation.id * 100 + index + 1,
      src: image.src,
      alt: image.alt || `${selectedVariation.name || product.name} ${index + 1}`,
    }));

  if (variationImages.length > 0) {
    return variationImages;
  }

  const featuredImageSrc = selectedVariation.image?.src;

  if (!featuredImageSrc) {
    return baseImages;
  }

  return [
    {
      id: selectedVariation.image?.id || selectedVariation.id,
      src: featuredImageSrc,
      alt: selectedVariation.image?.alt || selectedVariation.name || product.name,
    },
  ];
}

function getColorName(product: WCProduct | null) {
  return (
    product?.attributes.find(
      (attribute) =>
        attribute.slug === "pa_color" ||
        attribute.name.toLowerCase().includes("color"),
    )?.option ?? ""
  );
}

function formatPrice(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProductDetails({
  product,
  variations,
  reviewBundle,
}: ProductDetailsProps) {
  const searchParams = useSearchParams();
  const selectedColorParam = searchParams.get("attribute_pa_color");

  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const wishlistItems = useWishlistStore((state) => state.items);

  const [manualVariationId, setManualVariationId] = useState<
    number | "cleared" | null
  >(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [thumbsIndex, setThumbsIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const mobileGalleryRef = useRef<HTMLDivElement | null>(null);

  const categoryName = product.categories?.[0]?.name || "Bags";
  const categorySlug = product.categories?.[0]?.slug || "";
  const categoryHref = categorySlug ? `/product-category/${categorySlug}` : "/shop";
  const fallbackImage = product.images?.[0]?.src ?? "";

  const variationOptions = useMemo(
    () => buildVariationOptions(variations, fallbackImage),
    [variations, fallbackImage],
  );

  const defaultVariationId = useMemo(() => {
    const leadImageSrc = product.images?.[0]?.src;

    if (!leadImageSrc) {
      return null;
    }

    return (
      variationOptions.find((option) => option.swatchImage === leadImageSrc)?.id ??
      null
    );
  }, [product.images, variationOptions]);

  const urlVariationId = useMemo(() => {
    if (!selectedColorParam) {
      return null;
    }

    return (
      variationOptions.find((option) => option.queryValue === selectedColorParam)
        ?.id ?? null
    );
  }, [selectedColorParam, variationOptions]);

  const selectedVariationId =
    manualVariationId === "cleared"
      ? null
      : manualVariationId ?? urlVariationId ?? defaultVariationId;

  const selectedVariation = useMemo(
    () =>
      variationOptions.find((option) => option.id === selectedVariationId)
        ?.product ?? null,
    [selectedVariationId, variationOptions],
  );

  const galleryImages = useMemo(
    () => getGalleryImages(product, selectedVariation),
    [product, selectedVariation],
  );

  const displayProduct = selectedVariation ?? product;
  const activeImageIndex = galleryImages.length
    ? Math.min(selectedImage, galleryImages.length - 1)
    : 0;
  const currentImage = galleryImages[activeImageIndex] ?? galleryImages[0] ?? null;
  const price = Number(displayProduct.price || displayProduct.regular_price || 0);
  const regularPrice = Number(displayProduct.regular_price || 0);
  const showRegularPrice =
    displayProduct.on_sale && regularPrice > 0 && regularPrice > price;
  const isInStock = displayProduct.stock_status !== "outofstock";
  const currentColor = getColorName(selectedVariation) || getColorName(product);
  const displayProductLink = getRelativeProductLink(
    selectedVariation ?? product,
    product.slug,
  );
  const wishlisted = wishlistItems.some((item) => item.id === displayProduct.id);
  // Use actual review data - no fake defaults
  const reviewCount = product.rating_count || 0;
  const ratingValue = product.average_rating ? Math.round(Number(product.average_rating)) : 0;
  useEffect(() => {
    if (!isZoomOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsZoomOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isZoomOpen]);

  const maxThumbIndex = Math.max(
    0,
    galleryImages.length - DESKTOP_VISIBLE_THUMBS,
  );
  const resolvedThumbsIndex = Math.min(
    maxThumbIndex,
    Math.max(
      0,
      activeImageIndex < thumbsIndex
        ? activeImageIndex
        : activeImageIndex >= thumbsIndex + DESKTOP_VISIBLE_THUMBS
          ? activeImageIndex - DESKTOP_VISIBLE_THUMBS + 1
          : thumbsIndex,
    ),
  );

  const scrollMobileGalleryTo = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const container = mobileGalleryRef.current;

      if (!container) {
        return;
      }

      container.scrollTo({
        left: container.clientWidth * index,
        behavior,
      });
    },
    [],
  );

  const selectImage = useCallback(
    (index: number, syncMobile = false) => {
      const boundedIndex = Math.max(0, Math.min(index, galleryImages.length - 1));
      setSelectedImage(boundedIndex);

      if (syncMobile) {
        scrollMobileGalleryTo(boundedIndex);
      }
    },
    [galleryImages.length, scrollMobileGalleryTo],
  );

  const handlePrevImage = useCallback(
    (syncMobile = false) => {
      if (!galleryImages.length) {
        return;
      }

      const nextIndex =
        activeImageIndex === 0 ? galleryImages.length - 1 : activeImageIndex - 1;
      selectImage(nextIndex, syncMobile);
    },
    [activeImageIndex, galleryImages.length, selectImage],
  );

  const handleNextImage = useCallback(
    (syncMobile = false) => {
      if (!galleryImages.length) {
        return;
      }

      const nextIndex =
        activeImageIndex === galleryImages.length - 1 ? 0 : activeImageIndex + 1;
      selectImage(nextIndex, syncMobile);
    },
    [activeImageIndex, galleryImages.length, selectImage],
  );

  const handleVariationSelect = useCallback(
    (option: VariationOption) => {
      setManualVariationId(
        selectedVariationId === option.id ? "cleared" : option.id,
      );
      setSelectedImage(0);
      setThumbsIndex(0);
      if (mobileGalleryRef.current) {
        mobileGalleryRef.current.scrollTo({ left: 0, behavior: "auto" });
      }
    },
    [selectedVariationId],
  );

  const handleMobileGalleryScroll = useCallback(() => {
    const container = mobileGalleryRef.current;

    if (!container || container.clientWidth === 0) {
      return;
    }

    const nextIndex = Math.round(container.scrollLeft / container.clientWidth);
    if (nextIndex !== activeImageIndex) {
      setSelectedImage(nextIndex);
    }
  }, [activeImageIndex]);

  const handleAddToCart = useCallback(() => {
    addItem(
      {
        id: displayProduct.id,
        name: displayProduct.name,
        slug: displayProduct.slug,
        href: displayProductLink,
        price,
        image: currentImage?.src || fallbackImage,
        category: categoryName,
      },
      quantity,
    );
    openCart();
  }, [
    addItem,
    categoryName,
    currentImage?.src,
    displayProduct.id,
    displayProductLink,
    displayProduct.name,
    displayProduct.slug,
    fallbackImage,
    openCart,
    price,
    quantity,
  ]);

  const handleWishlistToggle = useCallback(() => {
    toggleWishlist({
      id: displayProduct.id,
      name: displayProduct.name,
      slug: displayProduct.slug,
      href: displayProductLink,
      price,
      originalPrice: showRegularPrice ? regularPrice : undefined,
      image: currentImage?.src || fallbackImage,
      category: categoryName,
    });
  }, [
    categoryName,
    currentImage?.src,
    displayProduct.id,
    displayProductLink,
    displayProduct.name,
    displayProduct.slug,
    fallbackImage,
    price,
    regularPrice,
    showRegularPrice,
    toggleWishlist,
  ]);

  const handleCopyLink = useCallback(async () => {
    const urlToCopy =
      typeof window !== "undefined"
        ? window.location.href
        : product.permalink || displayProductLink;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(urlToCopy);
      setIsLinkCopied(true);
      window.setTimeout(() => setIsLinkCopied(false), 2000);
    } catch {
      setIsLinkCopied(false);
    }
  }, [displayProductLink, product.permalink]);

  return (
    <div className="bg-[#fbfaf7] pb-24 lg:pb-14">
      <section className="mx-auto max-w-[1320px] px-3 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] xl:gap-10">
          <div className="min-w-0">
            <div className="hidden lg:grid lg:grid-cols-[108px_minmax(0,1fr)] lg:gap-4">
              {galleryImages.length > 1 && (
                <div className="flex flex-col items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setThumbsIndex(Math.max(0, resolvedThumbsIndex - 1))
                    }
                    disabled={resolvedThumbsIndex === 0}
                    className="text-[#9b917f] transition hover:text-[#241d14] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Previous thumbnails"
                  >
                    <ChevronUp size={18} />
                  </button>

                  <div className="flex w-full flex-col gap-3">
                    {galleryImages
                      .slice(
                        resolvedThumbsIndex,
                        resolvedThumbsIndex + DESKTOP_VISIBLE_THUMBS,
                      )
                      .map((image, index) => {
                        const imageIndex = resolvedThumbsIndex + index;
                        const isActive = imageIndex === activeImageIndex;

                        return (
                          <button
                            key={`${image.id}-${imageIndex}`}
                            type="button"
                            onClick={() => selectImage(imageIndex)}
                            className={`relative aspect-square overflow-hidden border border-[#e9e2d5] transition ${
                              isActive
                                ? "opacity-100 shadow-[0_0_0_1px_#b7924e_inset]"
                                : "opacity-40 hover:opacity-100"
                            }`}
                            aria-label={`Show image ${imageIndex + 1}`}
                          >
                            <Image
                              src={image.src}
                              alt={image.alt}
                              fill
                              sizes="108px"
                              className="object-cover"
                            />
                          </button>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setThumbsIndex(
                        Math.min(maxThumbIndex, resolvedThumbsIndex + 1),
                      )
                    }
                    disabled={resolvedThumbsIndex >= maxThumbIndex}
                    className="text-[#9b917f] transition hover:text-[#241d14] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="More thumbnails"
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>
              )}

              <div className="relative aspect-square overflow-hidden">
                {currentImage ? (
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="relative block h-full w-full cursor-zoom-in"
                    aria-label="Open image preview"
                  >
                    <Image
                      src={currentImage.src}
                      alt={currentImage.alt}
                      fill
                      priority
                      sizes="(min-width: 1280px) 760px, (min-width: 1024px) 58vw, 100vw"
                      className="object-contain"
                    />
                    <span className="absolute bottom-4 left-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#6f6143] shadow-[0_12px_25px_rgba(0,0,0,0.08)]">
                      <Maximize2 size={18} />
                    </span>
                  </button>
                ) : (
                  <div className="aspect-square bg-[#f1ece3]" />
                )}
              </div>
            </div>

            <div className="lg:hidden">
              <div className="relative -mx-1 overflow-hidden sm:mx-0">
                <div
                  ref={mobileGalleryRef}
                  onScroll={handleMobileGalleryScroll}
                  className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
                >
                  {galleryImages.map((image, index) => (
                    <div
                      key={`${image.id}-${index}`}
                      className="relative aspect-[1.08/1] min-w-full snap-center overflow-hidden"
                    >
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        priority={index === 0}
                        sizes="100vw"
                        className="object-contain"
                      />
                    </div>
                  ))}
                </div>

                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePrevImage(true)}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-[#746a5a] shadow-[0_10px_25px_rgba(0,0,0,0.08)]"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNextImage(true)}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-[#746a5a] shadow-[0_10px_25px_rgba(0,0,0,0.08)]"
                      aria-label="Next image"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setIsZoomOpen(true)}
                  className="absolute bottom-4 left-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#6f6143] shadow-[0_12px_25px_rgba(0,0,0,0.08)]"
                  aria-label="Open image preview"
                >
                  <Maximize2 size={18} />
                </button>
              </div>

              {galleryImages.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image.id}-thumb-${index}`}
                      type="button"
                      onClick={() => selectImage(index, true)}
                      className={`relative h-[82px] w-[82px] shrink-0 overflow-hidden border border-[#e8e0d3] transition ${
                        activeImageIndex === index
                          ? "opacity-100 shadow-[0_0_0_1px_#b7924e_inset]"
                          : "opacity-45"
                      }`}
                      aria-label={`Show image ${index + 1}`}
                    >
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <nav
                aria-label="Breadcrumb"
                className="flex flex-wrap items-center gap-2 text-[12px] text-[#8e8578] sm:text-[14px]"
              >
                <Link href="/" className="transition hover:text-[#211a12]">
                  Home
                </Link>
                <span>/</span>
                <Link href={categoryHref} className="transition hover:text-[#211a12]">
                  {categoryName}
                </Link>
                <span className="hidden sm:inline">/</span>
                <span className="hidden font-medium text-[#211a12] sm:inline">
                  {product.name}
                </span>
              </nav>

              <div className="flex items-center gap-4 text-[#8d6f3b]">
                <Link
                  href={categoryHref}
                  aria-label="Back to category"
                  className="transition hover:text-[#211a12]"
                >
                  <LayoutGrid size={15} />
                </Link>
                <Link
                  href={categoryHref}
                  aria-label="View next product"
                  className="transition hover:text-[#211a12]"
                >
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>

            <h1 className="font-serif text-[1.95rem] leading-none text-[#1f1a13] sm:text-[2.6rem] lg:text-[3.35rem]">
              {product.name}
            </h1>

            {reviewCount > 0 && (
              <div className="mt-5 flex items-center gap-3">
                <div className="flex items-center gap-0.5 text-[#e0b31c]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      size={15}
                      fill={index < ratingValue ? "currentColor" : "none"}
                      className={index < ratingValue ? "" : "text-[#d9cfbf]"}
                    />
                  ))}
                </div>
                <span className="text-[15px] text-[#766e62]">
                  ({reviewCount} customer reviews)
                </span>
              </div>
            )}

            <div className="mt-5 text-[1.75rem] font-medium leading-none text-[#bc9a54] sm:text-[2.2rem] lg:text-[2.45rem]">
              ₹{formatPrice(price)}
            </div>

            <div className="mt-6 max-w-[34rem] text-[15px] leading-[1.85] text-[#5c564d] [&_em]:font-serif [&_p]:m-0]">
              {product.short_description ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(product.short_description),
                  }}
                />
              ) : product.description ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(product.description.substring(0, 300) + (product.description.length > 300 ? '...' : '')),
                  }}
                />
              ) : null}
            </div>

            {variationOptions.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 flex items-center gap-2 text-[15px]">
                  <span className="font-semibold text-[#1f1a13]">color:</span>
                  <span className="text-[#766e62]">
                    {currentColor || variationOptions[0]?.color}
                  </span>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  {variationOptions.map((option) => {
                    const isActive = selectedVariation?.id === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleVariationSelect(option)}
                        className="group flex flex-col items-center gap-2"
                        aria-label={`Select ${option.color}`}
                      >
                        <span
                          className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#ddd4c7] transition sm:h-10 sm:w-10 ${
                            isActive
                              ? "shadow-[0_0_0_1px_#211a12_inset]"
                              : "opacity-70 hover:opacity-100"
                          }`}
                        >
                          <Image
                            src={option.swatchImage}
                            alt={option.color}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </span>
                        <span
                          className={`h-[2px] w-6 bg-[#211a12] transition ${
                            isActive
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-40"
                          }`}
                        />
                      </button>
                    );
                  })}

                  {selectedVariation && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualVariationId("cleared");
                        setSelectedImage(0);
                        setThumbsIndex(0);
                        if (mobileGalleryRef.current) {
                          mobileGalleryRef.current.scrollTo({
                            left: 0,
                            behavior: "auto",
                          });
                        }
                      }}
                      className="pb-1 text-[14px] text-[#8b8376] transition hover:text-[#211a12]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-7 flex items-center gap-2 text-[15px]">
              <Check
                size={18}
                strokeWidth={2.5}
                className={isInStock ? "text-[#b7924e]" : "text-red-500"}
              />
              <span className="font-medium text-[#1f1a13]">
                {isInStock ? "In stock" : "Out of stock"}
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-stretch">
              <div className="flex h-[52px] w-full max-w-[180px] items-center border border-[#ded5c9] bg-white sm:w-[132px]">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="flex h-full w-11 items-center justify-center text-[#4e483f] transition hover:bg-[#f6f1e7]"
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} />
                </button>

                <span className="flex-1 text-center text-[16px] text-[#1f1a13]">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() => setQuantity((current) => current + 1)}
                  className="flex h-full w-11 items-center justify-center text-[#4e483f] transition hover:bg-[#f6f1e7]"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isInStock}
                className="h-[52px] w-full bg-[#b89a57] px-8 text-[14px] font-medium uppercase tracking-[0.02em] text-white transition hover:bg-[#a98a48] disabled:cursor-not-allowed disabled:bg-[#d7c69f] sm:min-w-[190px] sm:w-auto"
              >
                Add to cart
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-[#e6dfd2] pb-6 text-[15px] text-[#29231b]">
              <button
                type="button"
                onClick={handleWishlistToggle}
                className={`flex items-center gap-2 transition ${
                  wishlisted ? "text-[#b25b5b]" : "hover:text-[#b25b5b]"
                }`}
              >
                <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
                <span>Add to wishlist</span>
              </button>
            </div>

            <div className="mt-6 space-y-4 text-[15px] leading-6 text-[#5f584f]">
              <p>
                <span className="font-semibold text-[#1f1a13]">Category:</span>{" "}
                <Link href={categoryHref} className="transition hover:text-[#b18d48]">
                  {categoryName}
                </Link>
              </p>

              <p>
                <span className="font-semibold text-[#1f1a13]">Tag:</span>{" "}
                {product.name}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <span className="font-semibold text-[#1f1a13]">Share:</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 text-[#5e564b] transition hover:text-[#b18d48]"
                >
                  <Copy size={15} />
                  <span>{isLinkCopied ? "Link copied" : "Copy link"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lower-page modules ── */}
      <ProductOffers />

      <div className="mt-8">
        <ProductAccordion description={product.description} />
      </div>

      <ProductTrustBadges />

      {reviewBundle && (
        <ProductReviewSection
          productId={product.id}
          productName={product.name}
          bundle={reviewBundle}
        />
      )}

      {/* [PAUSED] <ScratchCoupon /> - Uncomment when running gamified scratch promotions */}

      {isZoomOpen && currentImage && (
        <div className="fixed inset-0 z-[70] bg-[rgba(18,15,11,0.94)] px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex h-full flex-col">
            <div className="mb-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/18"
                aria-label="Close preview"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative flex-1">
              <Image
                src={currentImage.src}
                alt={currentImage.alt}
                fill
                sizes="100vw"
                className="object-contain"
              />

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePrevImage()}
                    className="absolute left-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/18"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNextImage()}
                    className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/18"
                    aria-label="Next image"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="mt-6 flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image.id}-zoom-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`relative h-24 w-24 shrink-0 overflow-hidden border transition ${
                      activeImageIndex === index
                        ? "border-[#b7924e] opacity-100"
                        : "border-white/20 opacity-45"
                    }`}
                    aria-label={`Preview image ${index + 1}`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
