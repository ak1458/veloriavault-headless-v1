/* eslint-disable @next/next/no-img-element */
 "use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWishlistStore } from "@/store/wishlist";
import { useCartStore } from "@/store/cart";
import { getRelativeProductLink, type WCProduct } from "@/lib/woocommerce";

interface ProductCardProps {
  product: WCProduct;
  imageLoading?: "lazy" | "eager";
}

export default function ProductCard({
  product,
  imageLoading = "lazy",
}: ProductCardProps) {
  const { isInWishlist, toggleItem } = useWishlistStore();
  const addItem = useCartStore((state) => state.addItem);
  const wishlisted = isInWishlist(product.id);
  const productLink = getRelativeProductLink(product);
  const price = Number(product.price || product.regular_price || 0);
  const image = product.images[0]?.src || "/images/bag-placeholder.svg";
  const hoverImage = product.images[1]?.src || image;
  const rating = parseFloat(product.average_rating) || 0;
  const categoryName = product.categories[0]?.name || "Bag";

  const handleWishlist = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      href: productLink,
      price,
      originalPrice: product.on_sale ? Number(product.regular_price || 0) : undefined,
      image,
      category: categoryName,
    });
  };

  // Variable (colour) products need a colour chosen on the product page;

  // adding the parent directly would create an order with no colour.

  const needsOptions = product.type === "variable";

  const router = useRouter();


  const handleAddToCart = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (needsOptions) {
      router.push(productLink);
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      href: productLink,
      price,
      image,
      category: categoryName,
    });
  };

  return (
    <div
      className="wd-product wd-hover-standard wd-col product-grid-item product status-publish instock has-post-thumbnail taxable shipping-taxable purchasable product-type-variation"
      data-id={product.id}
    >
      <div className="product-wrapper">
        <div className="product-element-top wd-quick-shop">
          <Link href={productLink} className="product-image-link" aria-label={product.name}>
            <img
              src={image}
              alt={product.name}
              loading={imageLoading}
              fetchPriority={imageLoading === "eager" ? "high" : undefined}
              decoding="async"
            />
          </Link>

          <div className="hover-img">
            <img src={hoverImage} alt={product.name} loading="lazy" decoding="async" />
          </div>

          <div className="wd-buttons wd-pos-r-t">
            <div className="wd-compare-btn product-compare-button wd-action-btn wd-style-icon wd-compare-icon">
              <a href={productLink} onClick={(event) => event.preventDefault()}>
                <span className="wd-added-icon" />
                <span className="wd-action-text">Add to compare</span>
              </a>
            </div>

            <div className="quick-view wd-action-btn wd-style-icon wd-quick-view-icon">
              <Link href={productLink} className="quick-view-button">
                Quick view
              </Link>
            </div>

            <div className="wd-wishlist-btn wd-action-btn wd-style-icon wd-wishlist-icon">
              <a
                href={productLink}
                onClick={handleWishlist}
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <span className="wd-added-icon" />
                <span className="wd-action-text">
                  {wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                </span>
              </a>
            </div>
          </div>
        </div>

        <h3 className="wd-entities-title">
          <Link href={productLink}>{product.name}</Link>
        </h3>

        <div className="wd-product-cats">
          {product.categories.map((category, index) => (
            <span key={category.id}>
              {index > 0 ? ", " : null}
              <Link href={`/product-category/${category.slug}`}>{category.name}</Link>
            </span>
          ))}
        </div>

        {rating > 0 ? (
          <div
            className="star-rating"
            role="img"
            aria-label={`Rated ${rating.toFixed(2)} out of 5`}
          >
            <span style={{ width: `${(rating / 5) * 100}%` }}>
              Rated <strong className="rating">{rating.toFixed(2)}</strong> out of 5
            </span>
          </div>
        ) : null}

        <span className="price">
          <span className="woocommerce-Price-amount amount">
            <bdi>
              <span className="woocommerce-Price-currencySymbol">&#8377;</span>
              {price.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </bdi>
          </span>
        </span>

        <div className="wd-add-btn wd-add-btn-replace">
          <button
            type="button"
            className="button product_type_variation add_to_cart_button add-to-cart-loop"
            onClick={handleAddToCart}
          >
            <span>{needsOptions ? "Choose colour" : "Add to cart"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
