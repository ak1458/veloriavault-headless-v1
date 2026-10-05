"use client";

import { useEffect, useState } from "react";
import { ANNOUNCEMENT_MESSAGES } from "@/config/offers";

/**
 * Top offer strip. Desktop shows every offer in one line; mobile rotates one
 * message at a time so nothing wraps or gets cut off.
 */
export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % ANNOUNCEMENT_MESSAGES.length),
      3500,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="bg-black px-4 py-2 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-white sm:text-[11px] sm:tracking-[0.2em]"
      role="region"
      aria-label="Current offers"
    >
      <span className="hidden sm:inline">
        {ANNOUNCEMENT_MESSAGES.map((message, i) => (
          <span key={message}>
            {i > 0 && <span className="mx-3 text-[#b59a5c]" aria-hidden="true">•</span>}
            {message}
          </span>
        ))}
      </span>
      <span className="sm:hidden" aria-live="polite">
        {ANNOUNCEMENT_MESSAGES[index]}
      </span>
    </div>
  );
}
