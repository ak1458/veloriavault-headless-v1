import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetails from "@/components/ProductDetails";
import { getProductBySlug, getProductVariations } from "@/lib/woocommerce";
import { getProductReviewBundle } from "@/lib/reviews";

export const revalidate = 300; // ISR: refresh every 5 minutes

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).toLowerCase();
  const product = await getProductBySlug(decodedSlug);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  return {
    title: product.name,
    description: stripHtml(product.short_description || product.description),
    alternates: {
      canonical: `/product/${slug}`,
    },
    openGraph: {
      title: product.name,
      description: stripHtml(product.short_description || product.description),
      url: `/product/${slug}`,
      images: product.images[0]?.src ? [product.images[0].src] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).toLowerCase();
  const product = await getProductBySlug(decodedSlug);

  if (!product) {
    notFound();
  }

  const [variations, reviewBundle] = await Promise.all([
    getProductVariations(product.id, product.permalink),
    getProductReviewBundle(product),
  ]);

  return (
    <div className="min-h-screen bg-[#fbfaf7] pb-20 lg:pb-0">
      <ProductDetails
        product={product}
        variations={variations}
        reviewBundle={reviewBundle}
      />
    </div>
  );
}
