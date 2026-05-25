export interface InstagramPost {
  id: string;
  url: string;
  imageUrl: string;
  caption: string;
}

export async function getInstagramFeed(): Promise<InstagramPost[]> {
  try {
    const storeUrl = process.env.NEXT_PUBLIC_LEGACY_SITE_URL || "https://api.veloriavault.com";
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout
    
    const response = await fetch(`${storeUrl}/wp-json/veloria/v1/instagram-feed`, {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "VeloriaVault/Next.js (Vercel API Fetcher)",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch custom Instagram REST API: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.success && Array.isArray(data.posts) && data.posts.length > 0) {
      return data.posts;
    }
    throw new Error("Custom Instagram REST API returned empty or unsuccessful response");
  } catch (error) {
    console.warn("Error fetching custom Instagram REST API, falling back to legacy HTML scraper:", error instanceof Error ? error.message : error);
    
    // FALLBACK: Fetch from the WordPress domain and scrape HTML if the REST API fails
    try {
      const storeUrl = process.env.NEXT_PUBLIC_LEGACY_SITE_URL || "https://api.veloriavault.com";
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout
      
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
    } catch (scrapeError) {
      console.error("Error scraping Instagram feed:", scrapeError);
      return [];
    }
  }
}
