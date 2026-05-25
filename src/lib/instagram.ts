export interface InstagramPost {
  id: string;
  url: string;
  imageUrl: string;
  caption: string;
}

export async function getInstagramFeed(): Promise<InstagramPost[]> {
  try {
    // Fetch from the WordPress domain which holds the WPzoom Instagram Widget
    const storeUrl = process.env.NEXT_PUBLIC_LEGACY_SITE_URL || "https://api.veloriavault.com";
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout — Hostinger can be slow
    
    const response = await fetch(`${storeUrl}/`, {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "VeloriaVault/Next.js (Vercel Legacy Fetcher)",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch WordPress homepage: ${response.status}`);
    }

    const html = await response.text();
    const posts: InstagramPost[] = [];

    // The WPzoom Instagram Widget historically wrapped each item in
    //   <li class="zoom-instagram-widget__item">…</li>
    // but a recent plugin update emits
    //   <li data-media-type="image|video">…</li>
    // instead. Match either form so future plugin tweaks don't silently
    // empty the feed.
    const itemRegex =
      /<li[^>]*(?:class="[^"]*zoom-instagram-(?:widget|feed)__item[^"]*"|data-media-type="[^"]+")[^>]*>([\s\S]*?)<\/li>/gi;
    let match;
    
    while ((match = itemRegex.exec(html)) !== null) {
      const itemHtml = match[1];
      
      // Extract the post URL (supports both /p/ and /reel/)
      const urlMatch = itemHtml.match(/href="(https:\/\/www\.instagram\.com\/(?:p|reel)\/[^"/?]+)\/?"/i);
      
      // Extract the image (prefer data-src for high res, fallback to src)
      const imgMatch = itemHtml.match(/data-src="([^"]+)"/i) || itemHtml.match(/src="([^"]+)"/i);
      const altMatch = itemHtml.match(/alt="([^"]*)"/i);
      
      if (urlMatch && imgMatch) {
        const url = urlMatch[1].endsWith('/') ? urlMatch[1] : `${urlMatch[1]}/`;
        let imageUrl = imgMatch[1];
        const caption = altMatch ? altMatch[1] : "";
        
        // Exclude profile logos or non-post images
        if (imageUrl.toLowerCase().includes("logo") || imageUrl.toLowerCase().includes("avatar")) {
           continue;
        }

        // Decode HTML entities
        imageUrl = imageUrl.replace(/&#038;/g, "&");
      
        // Avoid duplicates
        if (!posts.some(p => p.url === url)) {
          posts.push({
            id: `ig-post-${posts.length}`,
            url,
            imageUrl,
            caption: caption.substring(0, 100),
          });
        }
      }
    }
    
    // Ensure even number, max 6
    let limit = Math.min(posts.length, 6);
    if (limit % 2 !== 0) {
      limit -= 1;
    }
    
    return posts.slice(0, limit);
  } catch (error) {
    console.error("Error scraping Instagram feed:", error);
    // CRITICAL: Return an empty array instead of failing the build
    return [];
  }
}
