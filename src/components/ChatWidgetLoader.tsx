"use client";

import dynamic from "next/dynamic";

const AgenticChatWidget = dynamic(
  () => import("@/components/AgenticChatWidget"),
  { ssr: false }
);

export default function ChatWidgetLoader() {
  return <AgenticChatWidget />;
}
