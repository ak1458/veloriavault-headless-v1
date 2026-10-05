import { OFFER_TIERS, PREPAID_OFFER_TEXT } from "@/config/offers";

/** Homepage offer strip: the automatic savings, shown right under the hero. */
export default function OfferStrip() {
  const offers = [
    ...OFFER_TIERS.map((tier) => ({ big: `${tier.percent}% Off`, small: tier.label })),
    { big: "+5% Off", small: PREPAID_OFFER_TEXT.replace(/^Extra 5% off on /i, "On ") },
  ];

  return (
    <section aria-label="Offers" className="border-y border-[#e9e2d5] bg-white">
      <div className="mx-auto grid max-w-[1320px] grid-cols-3 divide-x divide-[#ede7db] px-2 sm:px-6">
        {offers.map((offer) => (
          <div key={offer.small} className="px-2 py-4 text-center sm:py-5">
            <p className="font-serif text-lg text-[#b59a5c] sm:text-2xl">{offer.big}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1f1a13] sm:text-xs">
              {offer.small}
            </p>
          </div>
        ))}
      </div>
      <p className="pb-3 text-center text-[11px] text-[#7a7264]">
        Applied automatically at checkout. No code needed.
      </p>
    </section>
  );
}
