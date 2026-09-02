"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { Menu, X, ShoppingBag, Heart, User, ChevronDown, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CartDrawer from "./CartDrawer";

const DESKTOP_LOGO = "https://api.veloriavault.com/wp-content/uploads/2026/02/logo.svg";
const MOBILE_LOGO = "https://api.veloriavault.com/wp-content/uploads/2026/02/logo.svg";

type SubItem = { label: string; href: string };
type MenuColumn = { title: string; items: SubItem[] };
type NavItem = { label: string; href: string; columns?: MenuColumn[] };

const NAV_ITEMS: NavItem[] = [
  { label: "SHOP", href: "/shop" },
  {
    label: "COLLECTIONS",
    href: "#",
    columns: [
      {
        title: "By Style",
        items: [
          { label: "Tote Bags", href: "/product-category/tote-bag" },
          { label: "Sling Bags", href: "/product-category/sling-bag" },
          { label: "Clutch Bags", href: "/product-category/clutch" },
          { label: "Hand Bag", href: "/product-category/hand-bag" },
          { label: "Crossbody", href: "/product-category/crossbody" },
          { label: "Satchel Bag", href: "/product-category/satchel-bag" },
        ]
      },
      {
        title: "Collections",
        items: [
          { label: "New Arrivals", href: "/shop?new=true" },
          { label: "Best Sellers", href: "/shop?bestseller=true" },
          { label: "Minimalist Series", href: "/shop?collection=minimalist" },
        ]
      },
      {
        title: "Shop By Tag",
        items: [
          { label: "Leather", href: "/shop?tag=leather" },
          { label: "Handmade", href: "/shop?tag=handmade" },
          { label: "Travel", href: "/shop?tag=travel" },
        ]
      }
    ]
  },
  { label: "ABOUT", href: "/about" },
  { label: "CONTACT", href: "/contact-us" },
];

export default function PremiumHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cartDrawerOpen = useCartStore((state) => state.isOpen);
  const openCart = useCartStore((state) => state.openCart);
  const closeCart = useCartStore((state) => state.closeCart);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const totalItems = useCartStore((state) => state.getTotalItems());
  const wishlistCount = useWishlistStore((state) => state.items.length);

  const displayItems = mounted ? totalItems : 0;
  const displayWishlist = mounted ? wishlistCount : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Handle back button
  useEffect(() => {
    if (!mobileMenuOpen) return;

    window.history.pushState({ mobileMenu: true }, "");

    const handlePopState = () => {
      setMobileMenuOpen(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [mobileMenuOpen]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <>
      {/* [PAUSED] Top Announcement Bar
      <div className="bg-black px-4 py-2 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-white sm:text-[11px] sm:tracking-[0.2em]">
        Get 5% Extra Off on All Prepaid Orders
      </div>
      */}

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-[#faf8f5] border-b border-gray-200">
        {/* Desktop Header */}
        <div className="hidden lg:block">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between py-4">
              <div className="flex-1" />
              <Link href="/" className="block">
                <Image
                  src={DESKTOP_LOGO}
                  alt="Veloria Vault"
                  width={196}
                  height={48}
                  priority
                  unoptimized
                  className="h-12 w-auto transition-all duration-300"
                />
              </Link>
              <div className="flex-1 flex items-center justify-end space-x-4">
                <Link href="/track-order" className="text-xs tracking-wider text-gray-600 hover:text-[#b59a5c] cursor-pointer transition-colors font-bold">
                  TRACK ORDER
                </Link>
                <Link href="/account" className="text-xs tracking-wider text-gray-600 hover:text-black cursor-pointer transition-colors font-bold">
                  LOGIN / REGISTER
                </Link>
                <Link
                  href="/wishlist"
                  className="p-2 text-gray-800 hover:text-black transition-colors relative"
                  aria-label="Wishlist"
                >
                  <Heart size={20} />
                  {displayWishlist > 0 && mounted && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-[#b59a5c] text-white text-[9px] font-bold flex items-center justify-center rounded-full">
                      {displayWishlist > 9 ? '9+' : displayWishlist}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => openCart()}
                  className="flex items-center space-x-1 p-2 text-gray-800 hover:text-black transition-colors relative"
                  aria-label="Cart"
                >
                  <ShoppingBag size={20} />
                  {displayItems > 0 && mounted && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-[#b59a5c] text-white text-[9px] font-bold flex items-center justify-center rounded-full">
                      {displayItems > 9 ? '9+' : displayItems}
                    </span>
                  )}
                  <span className="text-sm">₹{mounted ? useCartStore.getState().getSubtotal().toLocaleString("en-IN") : "0"}</span>
                </button>
              </div>
            </div>

            <nav className="flex items-center justify-center space-x-10 pb-3">
              {NAV_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="relative group"
                  onMouseEnter={() => setHoveredNav(item.columns ? item.label : null)}
                  onMouseLeave={() => setHoveredNav(null)}
                >
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 text-[11px] font-bold tracking-[0.35em] text-gray-800 hover:text-[#b59a5c] transition-colors relative py-1"
                  >
                    {item.label}
                    {item.columns && <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-200" />}
                    <span className="absolute left-0 bottom-0 w-0 h-[1px] bg-[#b59a5c] transition-all duration-300 group-hover:w-full" />
                  </Link>

                  {/* Mega Menu Dropdown */}
                  {item.columns && hoveredNav === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[550px] bg-white shadow-xl rounded-xl p-6 grid grid-cols-3 gap-6 z-50 border border-gray-100 before:content-[''] before:absolute before:inset-x-0 before:-top-4 before:h-4 before:bg-transparent"
                    >
                      {item.columns.map((col, idx) => (
                        <div key={idx} className="space-y-3">
                          <h4 className="font-serif text-[12px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-1.5 market-header">
                            {col.title}
                          </h4>
                          <ul className="space-y-2">
                            {col.items.map((subItem, sIdx) => (
                              <li key={sIdx}>
                                <Link
                                  href={subItem.href}
                                  className="text-[11px] font-medium text-gray-600 hover:text-[#b59a5c] transition-colors block py-0.5 tracking-wider"
                                >
                                  {subItem.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Mobile Header - Logo shifted right for better centering */}
        <div className="lg:hidden">
          <div className="container mx-auto px-4 py-3">
            <div className="grid grid-cols-[44px_1fr_72px] items-center gap-2">
              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="p-2 -ml-2 text-gray-800 hover:text-black transition-colors"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              <Link href="/" className="flex justify-center">
                <Image
                  src={MOBILE_LOGO}
                  alt="Veloria Vault"
                  width={130}
                  height={40}
                  priority
                  unoptimized
                  className="h-10 w-auto"
                />
              </Link>

              {/* Cart Icons */}
              <div className="flex items-center justify-end space-x-1">
                <Link
                  href="/wishlist"
                  className="p-2 text-gray-800 hover:text-black transition-colors relative"
                  aria-label="Wishlist"
                >
                  <Heart size={20} />
                  {displayWishlist > 0 && mounted && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-[#b59a5c] text-white text-[9px] font-bold flex items-center justify-center rounded-full">
                      {displayWishlist > 9 ? '9+' : displayWishlist}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => openCart()}
                  className="p-2 text-gray-800 hover:text-black transition-colors relative"
                  aria-label="Cart"
                >
                  <ShoppingBag size={20} />
                  {displayItems > 0 && mounted && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-[#b59a5c] text-white text-[9px] font-bold flex items-center justify-center rounded-full">
                      {displayItems > 9 ? '9+' : displayItems}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />

          <div
            className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[320px] bg-[#faf8f5] z-50 lg:hidden shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <Link href="/" onClick={closeMobileMenu}>
                  <Image
                    src={MOBILE_LOGO}
                    alt="Veloria Vault"
                    width={130}
                    height={40}
                    unoptimized
                    className="h-10 w-auto"
                  />
                </Link>
                <button
                  onClick={closeMobileMenu}
                  className="p-2 text-gray-800 hover:text-black"
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-6">
                <ul className="space-y-1 px-4">
                  {NAV_ITEMS.map((item) => (
                    <li key={item.label} className="border-b border-gray-100 last:border-0">
                      {item.columns ? (
                        <div className="py-2">
                          <button
                            onClick={() => setHoveredNav(hoveredNav === item.label ? null : item.label)}
                            className="flex items-center justify-between w-full py-2 text-base font-medium text-gray-800 hover:text-[#b59a5c] tracking-wider"
                          >
                            <span>{item.label}</span>
                            <ChevronDown size={16} className={`transition-transform duration-200 ${hoveredNav === item.label ? "rotate-180" : ""}`} />
                          </button>

                          <AnimatePresence>
                            {hoveredNav === item.label && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden pl-4 space-y-4 pb-2 pt-1"
                              >
                                {item.columns.map((col, idx) => (
                                  <div key={idx} className="space-y-1.5">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{col.title}</p>
                                    <ul className="space-y-1 pl-2 border-l border-gray-100">
                                      {col.items.map((subItem, sIdx) => (
                                        <li key={sIdx}>
                                          <Link
                                            href={subItem.href}
                                            onClick={closeMobileMenu}
                                            className="block py-1 text-sm text-gray-600 hover:text-[#b59a5c]"
                                          >
                                            {subItem.label}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={closeMobileMenu}
                          className="block py-3 text-base font-medium text-gray-800 hover:text-[#b59a5c] transition-colors tracking-wider"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 px-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Account</p>
                  <ul className="space-y-1">
                    <li>
                      <Link
                        href="/track-order"
                        onClick={closeMobileMenu}
                        className="flex items-center space-x-3 py-2 text-gray-600 hover:text-black font-bold"
                      >
                        <Package size={18} />
                        <span>Track Your Order</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/account"
                        onClick={closeMobileMenu}
                        className="flex items-center space-x-3 py-2 text-gray-600 hover:text-black"
                      >
                        <User size={18} />
                        <span>Login / Register</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/wishlist"
                        onClick={closeMobileMenu}
                        className="flex items-center space-x-3 py-2 text-gray-600 hover:text-black"
                      >
                        <Heart size={18} />
                        <span>Wishlist ({displayWishlist})</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/cart"
                        onClick={closeMobileMenu}
                        className="flex items-center space-x-3 py-2 text-gray-600 hover:text-black"
                      >
                        <ShoppingBag size={18} />
                        <span>Cart ({displayItems})</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              </nav>

              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  &copy; {new Date().getFullYear()} Veloria Vault
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cart Drawer component */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => closeCart()} />
    </>
  );
}
