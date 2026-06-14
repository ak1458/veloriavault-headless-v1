import LegacyHomePage from "@/components/LegacyHomePage";

// ISR: serve a cached static page, regenerate every 5 minutes. The data
// layer (LegacyHomePage) uses Promise.allSettled + try/catch with []
// fallbacks, so a build-time fetch timeout degrades gracefully instead of
// failing the build. This removes per-request SSR (and React #419 Suspense
// timeouts against the Hostinger backend) and makes the homepage fast.
export const revalidate = 300;

export const metadata = {
  title: "Veloria Vault | Luxury Leather Handbags",
  description: "Timeless leather goods for the modern minimalist. Handcrafted genuine leather handbags, totes, satchels and clutches.",
};

export default function HomePage() {
  return <LegacyHomePage />;
}
