import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryContent from "./CategoryContent";
import { getCategories, getParentProducts } from "@/lib/woocommerce";

export const revalidate = 300; // ISR: refresh every 5 minutes

// Empty list = render each category on first visit, then serve it from the
// ISR cache (without this the route is fully dynamic on every request).
export async function generateStaticParams() {
  return [];
}

type CategoryPageProps = { params: Promise<{ slug: string }> };

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  const name = category?.name ?? slug.replace(/-/g, " ");
  const description =
    stripHtml(category?.description ?? "") ||
    `Shop handcrafted genuine leather ${name.toLowerCase()} at Veloria Vault.`;

  return {
    title: name,
    description,
    alternates: { canonical: `/product-category/${slug}` },
    openGraph: { title: `${name} | Veloria Vault`, description, url: `/product-category/${slug}` },
  };
}

export default async function ProductCategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  const [categories, categoryProducts] = await Promise.all([
    getCategories(),
    getParentProducts({ categorySlug: slug }),
  ]);

  // Only 404 when the category list actually loaded; a backend hiccup
  // (empty list) must not turn every category into a cached 404.
  if (categories.length > 0 && !categories.some((c) => c.slug === slug)) {
    notFound();
  }

  return (
    <CategoryContent
      categorySlug={slug}
      initialCategories={categories}
      initialProducts={categoryProducts}
    />
  );
}
