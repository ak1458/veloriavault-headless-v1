"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle,
  X,
  Send,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useChatStore, type ChatMessage, type ChatProductCard } from "@/store/chat";
import { useCartStore } from "@/store/cart";

// ── Product Card (inside chat) ────────────────────────────────

function ChatProductCardUI({
  product,
  onBuyNow,
}: {
  product: ChatProductCard;
  onBuyNow: (product: ChatProductCard) => void;
}) {
  const price = parseFloat(product.price);
  const regularPrice = parseFloat(product.regularPrice);
  const hasDiscount = product.onSale && regularPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((regularPrice - price) / regularPrice) * 100)
    : 0;

  return (
    <div className="chat-product-card">
      {/* Image */}
      <div className="chat-product-image-wrap">
        <Link href={product.href} prefetch={false}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={200}
              height={200}
              className="chat-product-image"
              loading="lazy"
            />
          ) : (
            <div className="chat-product-image-placeholder">
              <ShoppingBag size={32} />
            </div>
          )}
        </Link>
        {hasDiscount && (
          <span className="chat-product-badge">-{discountPercent}%</span>
        )}
      </div>

      {/* Info */}
      <div className="chat-product-info">
        <p className="chat-product-category">{product.category}</p>
        <h4 className="chat-product-name">{product.name}</h4>
        <div className="chat-product-pricing">
          <span className="chat-product-price">
            ₹{price.toLocaleString("en-IN")}
          </span>
          {hasDiscount && (
            <span className="chat-product-original-price">
              ₹{regularPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="chat-product-actions">
        <button
          onClick={() => onBuyNow(product)}
          className="chat-btn-buy"
          aria-label={`Add ${product.name} to cart`}
        >
          <ShoppingBag size={14} />
          <span>Add to Cart</span>
        </button>
        <Link
          href={product.href}
          className="chat-btn-details"
          prefetch={false}
        >
          <span>View</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

// ── Product Carousel ──────────────────────────────────────────

function ProductCarousel({
  products,
  onBuyNow,
}: {
  products: ChatProductCard[];
  onBuyNow: (product: ChatProductCard) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 220;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="chat-carousel-wrap">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="chat-carousel-arrow chat-carousel-arrow-left"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} />
        </button>
      )}
      <div ref={scrollRef} className="chat-carousel scrollbar-hide">
        {products.map((product) => (
          <ChatProductCardUI
            key={product.id}
            product={product}
            onBuyNow={onBuyNow}
          />
        ))}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="chat-carousel-arrow chat-carousel-arrow-right"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="chat-typing">
      <div className="chat-typing-dot" style={{ animationDelay: "0ms" }} />
      <div className="chat-typing-dot" style={{ animationDelay: "150ms" }} />
      <div className="chat-typing-dot" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────

function MessageBubble({
  message,
  onBuyNow,
  onQuickReply,
}: {
  message: ChatMessage;
  onBuyNow: (product: ChatProductCard) => void;
  onQuickReply: (text: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`chat-bubble-row ${isUser ? "chat-bubble-row-user" : "chat-bubble-row-bot"}`}
    >
      {!isUser && (
        <div className="chat-avatar">
          <Sparkles size={14} />
        </div>
      )}
      <div className={`chat-bubble ${isUser ? "chat-bubble-user" : "chat-bubble-bot"}`}>
        {message.isTyping ? (
          <TypingIndicator />
        ) : (
          <>
            <div
              className="chat-bubble-text"
              dangerouslySetInnerHTML={{
                __html: formatMessage(message.content),
              }}
            />

            {/* Product carousel */}
            {message.products && message.products.length > 0 && (
              <ProductCarousel
                products={message.products}
                onBuyNow={onBuyNow}
              />
            )}

            {/* Quick replies */}
            {message.quickReplies && message.quickReplies.length > 0 && (
              <div className="chat-quick-replies">
                {message.quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => onQuickReply(reply)}
                    className="chat-quick-reply-chip"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Format message text (markdown-light) ──────────────────────

function formatMessage(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

// ── Main Widget ───────────────────────────────────────────────

export default function AgenticChatWidget() {
  const {
    messages,
    isOpen,
    isLoading,
    sessionId,
    hasGreeted,
    openChat,
    closeChat,
    addMessage,
    setLoading,
    setHasGreeted,
  } = useChatStore();

  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Greeting on first open
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true);
      // Add welcome message
      const hour = new Date().getHours();
      let timeGreeting = "Hello";
      if (hour < 12) timeGreeting = "Good morning";
      else if (hour < 17) timeGreeting = "Good afternoon";
      else timeGreeting = "Good evening";

      addMessage({
        role: "assistant",
        content: `${timeGreeting}! ✨ Welcome to Veloria Vault. I'm your personal shopping assistant.\n\nI can help you find the perfect leather bag or wallet. What are you looking for today?`,
        quickReplies: [
          "💼 Find an Office Bag",
          "👜 Show Tote Bags",
          "🎁 Gift Ideas",
          "🔥 What's on Sale?",
          "💰 Wallets & Clutches",
        ],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasGreeted]);

  // ── Send Message ──────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userText = text.trim();
      setInput("");

      // Add user message
      addMessage({ role: "user", content: userText });

      // Show typing indicator
      setLoading(true);
      addMessage({ role: "assistant", content: "", isTyping: true });

      try {
        const response = await fetch("/api/chat/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userText, sessionId }),
        });

        const data = await response.json();

        // Remove typing indicator & add real response
        // We do this by removing the last message (typing) and adding the real one
        useChatStore.setState((state) => ({
          messages: state.messages.filter((m) => !m.isTyping),
        }));

        addMessage({
          role: "assistant",
          content: data.content || "I'm not sure how to help with that. Try browsing our shop!",
          products: data.products,
          quickReplies: data.quickReplies,
        });
      } catch {
        useChatStore.setState((state) => ({
          messages: state.messages.filter((m) => !m.isTyping),
        }));
        addMessage({
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting. Please try again or browse our shop directly.",
          quickReplies: ["Try again", "Browse Shop"],
        });
      } finally {
        setLoading(false);
      }
    },
    [isLoading, addMessage, setLoading, sessionId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text);
  };

  const handleBuyNow = (product: ChatProductCard) => {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: parseFloat(product.price),
      image: product.image,
      category: product.category,
      href: product.href,
    });

    addMessage({
      role: "assistant",
      content: `✅ **${product.name}** added to your cart!\n\nWould you like to checkout or keep browsing?`,
      quickReplies: ["🛒 Go to Cart", "Keep browsing", "Show similar items"],
    });

    openCart();
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={openChat}
            className="chat-fab"
            aria-label="Open shopping assistant"
            id="chat-widget-trigger"
          >
            <div className="chat-fab-inner">
              <MessageCircle size={24} />
            </div>
            <span className="chat-fab-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="chat-panel"
            role="dialog"
            aria-label="Shopping assistant chat"
            id="chat-widget-panel"
          >
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-header-avatar">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="chat-header-title">Veloria Assistant</h3>
                  <p className="chat-header-subtitle">
                    <span className="chat-online-dot" />
                    Online · Instant replies
                  </p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="chat-close-btn"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages
                .filter((m) => !m.isTyping || isLoading) // Only show typing when loading
                .map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onBuyNow={handleBuyNow}
                    onQuickReply={handleQuickReply}
                  />
                ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="chat-input-bar">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="chat-input"
                disabled={isLoading}
                maxLength={500}
                id="chat-input-field"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="chat-send-btn"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
