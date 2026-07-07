import { LEGACY_SITE_URL, OUTBOUND_USER_AGENT } from "@/lib/site";

export interface WPPage {
  id: number;
  slug: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  template: string;
  class_list: string[];
}

async function wpFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(`${LEGACY_SITE_URL}/wp-json/wp/v2${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  const response = await fetch(url.toString(), {
    next: { revalidate: 300 },
    headers: { "User-Agent": OUTBOUND_USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status}`);
  }

  return response.json();
}

export async function getPageBySlug(slug: string): Promise<WPPage | null> {
  try {
    const pages = await wpFetch<WPPage[]>("/pages", { slug });
    return pages[0] ?? null;
  } catch (error) {
    console.error(`Failed to fetch page "${slug}":`, error);
    return null;
  }
}
