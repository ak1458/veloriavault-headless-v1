export const PRODUCT_PAGE_PROMO = {
  eyebrow: "Special offer",
  title: "Luxury leather, layered savings.",
  subtitle:
    "Clear offers on the product page with the spacing and breathing room from your reference screenshots.",
  items: [
    /* [PAUSED] Uncomment when re-enabling Buy 1 / Buy 2 Tier offers:
    {
      title: "Buy 1 - Enjoy 15% Off",
      description: "Automatically applied to one bag.",
    },
    {
      title: "Buy 2 - Get 20% Off",
      description: "The best automatic bag offer in the current checkout flow.",
    },
    */
    {
      title: "Extra 5% Off On Prepaid",
      description: "Works automatically with UPI, credit/debit cards, and net banking.",
    },
    /* [PAUSED] Uncomment when re-enabling scratch coupons:
    {
      title: "Scratch Coupon",
      description: "Unlock a saved scratch reward right on this product page.",
    },
    */
  ],
};

export const PRODUCT_PAGE_POLICY_LINKS = {
  returnExchange: "/refund-returns/",
  warranty: "/warranty-policy/",
};

export const PRODUCT_PAGE_TRUST_BADGES = [
  {
    id: "full-grain",
    icon: "leather",
    title: "Genuine Full-Grain",
    subtitle: "Leather",
  },
  {
    id: "handcrafted",
    icon: "craft",
    title: "Handcrafted in India",
    subtitle: "",
  },
  {
    id: "secure",
    icon: "secure",
    title: "Secured Checkout",
    subtitle: "",
  },
  {
    id: "responsible",
    icon: "ethical",
    title: "Responsibly Produced",
    subtitle: "",
  },
  {
    id: "plastic-free",
    icon: "packaging",
    title: "Premium Plastic Free",
    subtitle: "Packaging",
  },
  {
    id: "returns",
    icon: "returns",
    title: "7 Days Hassle-Free",
    subtitle: "Exchange Only",
  },
] as const;

export const PRODUCT_PAGE_REVIEW_BADGES: Array<{ id: string; ringColor: string; score: string; label: string }> = [];
