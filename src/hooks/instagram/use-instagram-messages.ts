import { useState, useCallback } from "react";
import { type InstagramChatMessage } from "@/data/instagram/types";

async function fetchMessages(contactId: string, before?: string) {
  let url = `/api/instagram/chats/${contactId}`;
  if (before) {
    url += `?before=${before}`;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error("Erro ao carregar mensagens");

  const data = await response.json();
  if (data.error) throw new Error(data.error);

  return data;
}

export function useInstagramMessages(businessUsername: string) {
  const [messages, setMessages] = useState<InstagramChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadInitial = useCallback(
    async (contactId: string) => {
      try {
        setLoading(true);

        const data = await fetchMessages(contactId);

        const formattedMessages: InstagramChatMessage[] = (data.messages || []).map(
          (msg: {
            id: string;
            createdTime: string;
            from: { id: string; username: string };
            message: string | null;
            mediaUrl: string | null;
            mediaType: string | null;
            story: { mention?: { link: string }; reply_to?: { link: string } } | null;
          }) => {
            const isFromBusiness = msg.from.username === businessUsername;
            const hasStory = msg.story?.mention || msg.story?.reply_to;
            let content = msg.message;
            let messageType = "text";

            if (msg.mediaUrl) {
              messageType = "image";
              content = msg.mediaUrl;
            } else if (hasStory) {
              messageType = "story_mention";
              content = "[Menção a story]";
            } else if (!content) {
              content = "[sem conteúdo]";
            }

            return {
              id: msg.id,
              contactId,
              phone: `@${msg.from.username}`,
              direction: isFromBusiness ? "outbound" : "inbound",
              senderType: isFromBusiness ? "user" : "instagram_user",
              senderName: msg.from.username,
              messageType,
              content,
              stage: "-",
              createdAt: msg.createdTime,
            };
          }
        );

        formattedMessages.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );

        setMessages(formattedMessages);
        setHasMore(data.hasNext);
        setNextCursor(data.nextCursor || null);
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setLoading(false);
      }
    },
    [businessUsername]
  );

  const loadMore = useCallback(
    async (contactId: string) => {
      if (!hasMore || loadingMore || !nextCursor) return;

      try {
        setLoadingMore(true);

        const data = await fetchMessages(contactId, nextCursor);

        const formattedMessages: InstagramChatMessage[] = (data.messages || []).map(
          (msg: {
            id: string;
            createdTime: string;
            from: { id: string; username: string };
            message: string | null;
            mediaUrl: string | null;
            mediaType: string | null;
            story: { mention?: { link: string }; reply_to?: { link: string } } | null;
          }) => {
            const isFromBusiness = msg.from.username === businessUsername;
            const hasStory = msg.story?.mention || msg.story?.reply_to;
            let content = msg.message;
            let messageType = "text";

            if (msg.mediaUrl) {
              messageType = "image";
              content = msg.mediaUrl;
            } else if (hasStory) {
              messageType = "story_mention";
              content = "[Menção a story]";
            } else if (!content) {
              content = "[sem conteúdo]";
            }

            return {
              id: msg.id,
              contactId,
              phone: `@${msg.from.username}`,
              direction: isFromBusiness ? "outbound" : "inbound",
              senderType: isFromBusiness ? "user" : "instagram_user",
              senderName: msg.from.username,
              messageType,
              content,
              stage: "-",
              createdAt: msg.createdTime,
            };
          }
        );

        formattedMessages.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );

        setMessages((prev) => [...prev, ...formattedMessages]);
        setHasMore(data.hasNext);
        setNextCursor(data.nextCursor || null);
      } catch (error) {
        console.error("Error loading more messages:", error);
      } finally {
        setLoadingMore(false);
      }
    },
    [businessUsername, hasMore, loadingMore, nextCursor]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setHasMore(true);
    setNextCursor(null);
  }, []);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    loadInitial,
    loadMore,
    clearMessages,
  };
}
