"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Instagram, Loader2 } from "lucide-react";
import type { InstagramPost } from "@/lib/instagram";

const FALLBACK_CARDS = [
  "Quiet luxury details",
  "Daily carry essentials",
  "Premium leather craftsmanship",
  "Structured silhouettes",
  "Made for everyday elegance",
  "View the latest drops",
];

function LoadingTile({ index }: { index: number }) {
  return (
    <div
      className="aspect-square rounded-sm bg-gradient-to-br from-[#faf8f5] via-white to-[#f5efe4] border border-[#b59a5c]/10 animate-pulse"
      style={{ animationDelay: `${index * 80}ms` }}
    />
  );
}

function FallbackTile({ label }: { label: string }) {
  return (
    <a
      href="https://www.instagram.com/veloriavault/"
      target="_blank"
      rel="noopener noreferrer"
      className="group aspect-square rounded-sm border border-[#b59a5c]/15 bg-gradient-to-br from-[#faf8f5] via-white to-[#f7f1e6] p-5 flex flex-col items-center justify-center text-center transition-transform duration-300 hover:-translate-y-1"
    >
      <Instagram className="w-7 h-7 text-[#b59a5c] mb-3 group-hover:scale-110 transition-transform" />
      <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-800">
        Veloria Vault
      </span>
      <span className="mt-2 text-xs text-gray-500 leading-relaxed">{label}</span>
    </a>
  );
}

// Default empty array to prevent re-renders
const DEFAULT_POSTS: InstagramPost[] = [];

export default function InstagramFeed({
  initialPosts = DEFAULT_POSTS,
}: {
  initialPosts?: InstagramPost[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [isLoading, setIsLoading] = useState(initialPosts.length === 0);
  const [hasFetched, setHasFetched] = useState(initialPosts.length > 0);
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const hasFetchedRef = useRef(initialPosts.length > 0);

  const markFailed = (id: string) =>
    setFailedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  useEffect(() => {
    // Skip if we already have posts or have already fetched
    if (initialPosts.length > 0 || hasFetchedRef.current) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    const loadPosts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/instagram", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          posts?: InstagramPost[];
        };

        if (!isActive) {
          return;
        }

        setPosts(Array.isArray(data.posts) ? data.posts : []);
      } catch {
        if (!controller.signal.aborted && isActive) {
          setPosts([]);
        }
      } finally {
        if (!controller.signal.aborted && isActive) {
          setIsLoading(false);
          setHasFetched(true);
          hasFetchedRef.current = true;
        }
      }
    };

    void loadPosts();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [initialPosts]);

  const showFallbackCards = useMemo(
    () => !isLoading && hasFetched && posts.length === 0,
    [hasFetched, isLoading, posts.length],
  );

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <a
            href="https://www.instagram.com/veloriavault/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center space-x-3 mb-4 group"
          >
            <Instagram className="w-6 h-6 text-[#b59a5c] group-hover:scale-110 transition-transform" />
            <span className="text-lg font-medium text-gray-900">@veloriavault</span>
          </a>
          <p className="text-gray-500 text-sm">
            Follow us on Instagram for the latest updates and behind-the-scenes
          </p>
          {isLoading ? (
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading latest posts
            </p>
          ) : null}
        </div>

        <div
          id="instagram-feed-container"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {posts.length > 0 ? (
            posts.map((post) => {
              const failed = failedIds.has(post.id);
              return (
                <a
                  key={post.id}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden bg-gradient-to-br from-[#faf8f5] via-white to-[#f7f1e6] block"
                  title={post.caption}
                >
                  {failed ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Instagram className="w-7 h-7 text-[#b59a5c]" />
                    </span>
                  ) : (
                    /* Plain <img> loads direct from the browser (~140ms). Do NOT
                       switch to next/image: the optimizer fetches server-side and
                       Hostinger's firewall stalls non-browser requests (12s+ hang). */
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.imageUrl}
                      alt={post.caption || "Veloria Vault Instagram Post"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => markFailed(post.id)}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Instagram className="w-8 h-8 text-white" />
                  </div>
                </a>
              );
            })
          ) : isLoading ? (
            Array.from({ length: 6 }, (_, index) => (
              <LoadingTile key={`instagram-loading-${index}`} index={index} />
            ))
          ) : showFallbackCards ? (
            FALLBACK_CARDS.map((label) => (
              <FallbackTile key={label} label={label} />
            ))
          ) : null}
        </div>

        <div className="text-center mt-8">
          <a
            href="https://www.instagram.com/veloriavault/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-3 border-2 border-black text-black text-xs font-bold tracking-[0.2em] uppercase hover:bg-black hover:text-white transition-all duration-300"
          >
            Follow Us
          </a>
        </div>
      </div>
    </section>
  );
}
