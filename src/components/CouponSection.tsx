// [PAUSED] Coupon Section is currently disabled.
// To re-enable the coupon input and tier promo box, restore the commented component below:

export default function CouponSection() {
  return null;
}

/*
export function ActiveCouponSection() {
  const [couponInput, setCouponInput] = useState("");
  
  const { 
    appliedCouponCodes, 
    calculation, 
    isLoading, 
    error,
    addCoupon, 
    removeCoupon,
  } = useCouponStore();
  
  const { items } = useCartStore();

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    await addCoupon(couponInput.trim(), items);
    setCouponInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleApplyCoupon();
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <h3 className="font-serif text-lg text-gray-800 mb-4">Discounts & Offers</h3>
      
      {/ * Available Offers Banner * /}
      <div className="mb-4 p-4 bg-gradient-to-r from-[#b59a5c]/10 to-[#b59a5c]/5 border border-[#b59a5c]/20 rounded-lg space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#b59a5c]" />
          <span className="text-sm font-medium text-gray-800">
            Current Tier Offers
          </span>
        </div>
        <ul className="text-sm text-gray-600 space-y-1.5 ml-6 list-disc">
          <li>
            Buy 1 item to get <span className="text-[#b59a5c] font-medium">15% Off</span> automatically
          </li>
          <li>
            Buy 2 or more & get <span className="text-[#b59a5c] font-medium">20% Off</span> automatically
          </li>
        </ul>
      </div>

      <p className="text-xs text-gray-500 mb-4">You can apply extra influencer or seasonal codes below.</p>

      {/ * Coupon Input * /}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Enter coupon code"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b59a5c] uppercase"
            disabled={isLoading}
          />
        </div>
        <button
          onClick={handleApplyCoupon}
          disabled={isLoading || !couponInput.trim()}
          className="px-4 py-2.5 bg-[#1a1a1a] text-white text-sm font-medium rounded-lg hover:bg-[#b59a5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
        </button>
      </div>

      {/ * Error Message * /}
      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      {/ * Applied Coupons * /}
      {appliedCouponCodes.length > 0 && (
        <div className="space-y-2 mb-4">
          {appliedCouponCodes.map((code) => {
            const couponDetail = calculation?.appliedCoupons.find(
              (c) => c.coupon.code === code
            );
            return (
              <div
                key={code}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{code}</span>
                    {couponDetail && (
                      <p className="text-xs text-green-600">
                        -₹{couponDetail.discountAmount.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    void removeCoupon(code, items);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
*/
