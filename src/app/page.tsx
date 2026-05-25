import LegacyHomePage from "@/components/LegacyHomePage";

// force-dynamic: Skip build-time pre-rendering — the Vercel build server
// (US-East) cannot reliably reach the Hostinger WooCommerce backend,
// causing ETIMEDOUT during `next build`. The page will render on the
// first user request. Once Hostinger connectivity is stable, switch
// back to ISR with: export const revalidate = 300;
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Veloria Vault | Luxury Leather Handbags",
  description: "Timeless leather goods for the modern minimalist. Handcrafted genuine leather handbags, totes, satchels and clutches.",
};

export default function HomePage() {
  return <LegacyHomePage />;
}
