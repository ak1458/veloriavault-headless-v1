import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatProductCard {
  id: number;
  name: string;
  slug: string;
  price: string;
  regularPrice: string;
  salePrice: string;
  onSale: boolean;
  image: string;
  category: string;
  shortDescription: string;
  stockStatus: string;
  href: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  products?: ChatProductCard[];
  quickReplies?: string[];
  isTyping?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  sessionId: string;
  hasGreeted: boolean;

  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  setHasGreeted: (greeted: boolean) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isOpen: false,
      isLoading: false,
      sessionId: generateSessionId(),
      hasGreeted: false,

      openChat: () => set({ isOpen: true }),
      closeChat: () => set({ isOpen: false }),
      toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),

      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: generateId(),
          timestamp: Date.now(),
        };
        set({ messages: [...get().messages, newMessage] });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      clearMessages: () =>
        set({
          messages: [],
          sessionId: generateSessionId(),
          hasGreeted: false,
        }),

      setHasGreeted: (greeted) => set({ hasGreeted: greeted }),
    }),
    {
      name: "veloria-chat",
      partialize: (state) => ({
        messages: state.messages.slice(-50), // Keep last 50 messages
        sessionId: state.sessionId,
        hasGreeted: state.hasGreeted,
      }),
    }
  )
);
