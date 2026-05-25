import type { Metadata } from "next";
import { Inter, Playfair_Display, Lato } from "next/font/google";
import "./globals.css";
import PremiumHeader from "@/components/PremiumHeader";
import PremiumFooter from "@/components/PremiumFooter";
import MobileBottomNav from "@/components/MobileBottomNav";
import ChatWidgetLoader from "@/components/ChatWidgetLoader";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
});

export const metadata: Metadata = {
  title: {
    default: "Veloria Vault | Luxury Leather Handbags",
    template: "%s | Veloria Vault",
  },
  description:
    "Timeless leather goods for the modern minimalist. Handcrafted genuine leather handbags, totes, satchels and clutches.",
  metadataBase: new URL("https://veloriavault.com"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Veloria Vault | Luxury Leather Handbags",
    description: "Timeless leather goods for the modern minimalist.",
    url: "/",
    siteName: "Veloria Vault",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Veloria Vault - Luxury Leather Handbags",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Veloria Vault | Luxury Leather Handbags",
    description: "Timeless leather goods for the modern minimalist.",
    images: ["/images/og-image.jpg"],
  },
};

// JSON-LD Structured Data
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Veloria Vault",
  url: "https://veloriavault.com",
  logo: "https://veloriavault.com/logo.svg",
  description: "Timeless leather goods for the modern minimalist. Handcrafted genuine leather handbags, totes, satchels and clutches.",
  sameAs: [
    "https://www.instagram.com/veloriavault",
    "https://www.facebook.com/p/Veloria-Vault-61568488662553",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-7376326666",
    contactType: "customer service",
    email: "care@veloriavault.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://veloriavault.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        id="top"
        suppressHydrationWarning
        className={`${inter.variable} ${playfair.variable} ${lato.variable} antialiased bg-[#faf8f5] text-gray-900`}
        style={{ fontFamily: 'var(--font-lato), var(--font-sans), sans-serif' }}
      >
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded focus:shadow-lg"
        >
          Skip to main content
        </a>
        <PremiumHeader />
        <main id="main-content">{children}</main>
        <PremiumFooter />
        <MobileBottomNav />
        <ChatWidgetLoader />
      </body>
    </html>
  );
}
