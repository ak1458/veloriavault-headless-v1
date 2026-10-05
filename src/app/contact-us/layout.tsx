import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Veloria Vault for any questions, support, or inquiries about our luxury leather handbags.",
  alternates: {
    canonical: "/contact-us",
  },
  openGraph: {
    title: "Contact Us | Veloria Vault",
    description: "Get in touch with Veloria Vault for any questions, support, or inquiries.",
    url: "/contact-us",
    images: [
      {
        url: "/images/covers/contact us.png",
        width: 1200,
        height: 630,
        alt: "Contact Veloria Vault",
      },
    ],
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
