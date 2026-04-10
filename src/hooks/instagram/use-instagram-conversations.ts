import { useState, useCallback, useEffect } from "react";
import {
  type InstagramContact,
  type InstagramChatMessage,
} from "@/data/instagram/types";
import { createBrowserSupabase } from "@/lib/supabase";

type ConversationDetails = {
  contactUsername: string;
  userIdInstagram: string | null;
  messages: InstagramChatMessage[];
  lastMessagePreview: string;
  lastMessageAt: string | null;
  hasNext?: boolean;
  nextCursor?: string;
};

async function fetchConversationDetails(
  contactId: string,
  businessUsername: string,
  before?: string
): Promise<ConversationDetails | null> {
  try {
    let url = `/api/instagram/chats/${contactId}`;
    if (before) {
      url += `?before=${before}`;
    }

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.error) return null;

    const rawParticipants = data.conversation?.participants;
    const participants = Array.isArray(rawParticipants)
      ? rawParticipants
      : rawParticipants?.data || [];

    const otherParticipant = participants.find(
      (p: { username: string }) =>
        p.username !== "me" && p.username !== businessUsername
    );
    const contactUsername =
      otherParticipant?.username || participants[0]?.username || "";

    const messages: InstagramChatMessage[] = (data.messages || [])
      .map((msg: {
        id: string;
        createdTime: string;
        from: { id: string; username: string };
        message: string | null;
        mediaUrl: string | null;
        mediaType: string | null;
        story: { mention?: { link: string }; reply_to?: { link: string } } | null;
      }) => {
        const isFromBusiness = msg.from.username === businessUsername;
        const hasStoryMention = msg.story?.mention;
        const hasStoryReply = msg.story?.reply_to;
        let content = msg.message;
        let messageType = "text";

        if (msg.mediaUrl) {
          messageType = "image";
          content = msg.mediaUrl;
        } else if (hasStoryMention) {
          messageType = "story_mention";
          content = msg.message || "";
        } else if (hasStoryReply) {
          messageType = "story_reply";
          content = msg.message || "";
        } else if (!content) {
          messageType = "media";
          content = msg.mediaType ? `📎 ${msg.mediaType}` : "📎 Mídia";
        }

        const storyLink = msg.story?.mention?.link || msg.story?.reply_to?.link || null;

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
          storyLink,
          createdAt: msg.createdTime,
        };
      })
      .sort(
        (a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );

    const lastMessage = messages[messages.length - 1];

    let lastMessagePreview = "Sem mensagens";
    if (lastMessage) {
      if (lastMessage.messageType === "story_mention") {
        lastMessagePreview = lastMessage.content || "Menção a Story";
      } else if (lastMessage.messageType === "story_reply") {
        lastMessagePreview = lastMessage.content || "Resposta a Story";
      } else if (lastMessage.messageType === "media") {
        lastMessagePreview = lastMessage.content || "Mídia";
      } else {
        lastMessagePreview = lastMessage.content || "Sem mensagens";
      }
    }

    return {
      contactUsername,
      userIdInstagram: otherParticipant?.id || null,
      messages,
      lastMessagePreview,
      lastMessageAt: lastMessage?.createdAt || null,
      hasNext: data.hasNext,
      nextCursor: data.nextCursor,
    };
  } catch {
    return null;
  }
}

async function fetchConversations(after?: string) {
  let url = "/api/instagram/chats";
  if (after) {
    url += `?after=${after}`;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error("Erro ao carregar conversas");

  const data = await response.json();
  if (data.error) throw new Error(data.error);

  return data;
}

async function fetchProfilesForContacts(
  userIds: string[]
): Promise<Map<string, string | null>> {
  if (userIds.length === 0) return new Map();

  const profilePromises = userIds.map(async (userId) => {
    try {
      const res = await fetch(`/api/instagram/profile?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        return { userId, profilePictureUrl: data.profilePictureUrl };
      }
    } catch {
      // ignore
    }
    return { userId, profilePictureUrl: null };
      });
  const profileResults = await Promise.all(profilePromises);
  return new Map(profileResults.map(p => [p.userId, p.profilePictureUrl]));
}

type AssignmentInfo = {
  userIdInstagram: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  assignmentId: string | null;
};

async function fetchAssignmentsForContacts(
  userIdsInstagram: string[]
): Promise<Map<string, AssignmentInfo>> {
  if (userIdsInstagram.length === 0) return new Map();

  const supabase = createBrowserSupabase();
  const { data, error } = await supabase
    .from("user_active_contacts")
    .select(
      "id, user_id, user_id_instagram, users!user_active_contacts_user_id_fkey(id, name)"
    )
    .in("user_id_instagram", userIdsInstagram)
    .eq("active", true);

  if (error) {
    console.error("Erro ao buscar assignments:", error);
    return new Map();
  }

  const result = new Map<string, AssignmentInfo>();
  (data ?? []).forEach((row) => {
    const userIdInstagram = row.user_id_instagram;
    if (userIdInstagram) {
      result.set(userIdInstagram, {
        userIdInstagram,
        assignedUserId: row.user_id,
        assignedUserName: (row.users as { id?: string; name?: string } | null)?.name ?? null,
        assignmentId: row.id,
      });
    }
  });

  return result;
}

export function useInstagramPagination(businessUsername: string) {
  const [contacts, setContacts] = useState<InstagramContact[]>([]);
  const [messagesByContact, setMessagesByContact] = useState<
    Record<string, InstagramChatMessage[]>
  >({});
  const [messagesPaging, setMessagesPaging] = useState<
    Record<string, { hasMore: boolean; nextCursor?: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMessagesMore, setLoadingMessagesMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr) as { id?: string };
        if (userData.id) {
          setCurrentUserId(userData.id);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);

      const data = await fetchConversations();

      if (!data.conversations || data.conversations.length === 0) {
        setContacts([]);
        setHasMore(false);
        return;
      }

      const detailsPromises = data.conversations.map((conv: { id: string }) =>
        fetchConversationDetails(conv.id, businessUsername)
      );

      const detailsResults = await Promise.all(detailsPromises);

      const userIdsInstagram = detailsResults
        .map((d) => d?.userIdInstagram)
        .filter((id): id is string => typeof id === "string" && id !== "");

      const profileMap = await fetchProfilesForContacts(userIdsInstagram);
      const assignmentMap = await fetchAssignmentsForContacts(userIdsInstagram);

      const newContacts: InstagramContact[] = data.conversations.map(
        (conv: { id: string; participants?: { data?: Array<{ id: string }> } }, index: number) => {
          const details = detailsResults[index];
          const username =
            details?.contactUsername || `Usuário ${conv.id.slice(-4)}`;

          const userIdInstagram = details?.userIdInstagram ?? null;
          const profilePictureUrl = userIdInstagram ? profileMap.get(userIdInstagram) ?? null : null;
          const assignmentInfo = userIdInstagram ? assignmentMap.get(userIdInstagram) : null;

          const messages = details?.messages || [];

          return {
            id: conv.id,
            contactId: conv.id,
            phone: `@${username}`,
            name: username,
            stage: "-",
            lastMessagePreview:
              details?.lastMessagePreview || "Sem mensagens",
            lastMessageAt: details?.lastMessageAt || null,
            totalMessages: messages.length,
            username,
            profilePictureUrl,
            platform: "instagram" as const,
            userIdInstagram,
            assignedUserId: assignmentInfo?.assignedUserId ?? null,
            assignedUserName: assignmentInfo?.assignedUserName ?? null,
            assignmentId: assignmentInfo?.assignmentId ?? null,
            isAssignedToCurrentUser: assignmentInfo?.assignedUserId === currentUserId,
          };
        }
      );

      const newMessages: Record<string, InstagramChatMessage[]> = {};
      const newPaging: Record<string, { hasMore: boolean; nextCursor?: string }> = {};

      detailsResults.forEach((details, index) => {
        if (details) {
          const convId = data.conversations[index].id;
          newMessages[convId] = details.messages;
          newPaging[convId] = {
            hasMore: details.hasNext ?? false,
            nextCursor: details.nextCursor,
          };
        }
      });

      newContacts.sort((a, b) => {
        const aTime = a.lastMessageAt
          ? new Date(a.lastMessageAt).getTime()
          : 0;
        const bTime = b.lastMessageAt
          ? new Date(b.lastMessageAt).getTime()
          : 0;
        return bTime - aTime;
      });

      setContacts(newContacts);
      setMessagesByContact(newMessages);
      setMessagesPaging(newPaging);
      setHasMore(data.hasNext);
      setNextCursor(data.nextCursor || null);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [businessUsername]);

  const loadMoreConversations = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;

    try {
      setLoadingMore(true);

      const data = await fetchConversations(nextCursor);

      if (!data.conversations || data.conversations.length === 0) {
        setHasMore(false);
        return;
      }

      const detailsPromises = data.conversations.map((conv: { id: string }) =>
        fetchConversationDetails(conv.id, businessUsername)
      );

      const detailsResults = await Promise.all(detailsPromises);

      const userIdsInstagram = detailsResults
        .map((d) => d?.userIdInstagram)
        .filter((id): id is string => typeof id === "string" && id !== "");

      const profileMap = await fetchProfilesForContacts(userIdsInstagram);
      const assignmentMap = await fetchAssignmentsForContacts(userIdsInstagram);

      const newContacts: InstagramContact[] = data.conversations.map(
        (conv: { id: string; participants?: { data?: Array<{ id: string }> } }, index: number) => {
          const details = detailsResults[index];
          const username =
            details?.contactUsername || `Usuário ${conv.id.slice(-4)}`;

          const userIdInstagram = details?.userIdInstagram ?? null;
          const profilePictureUrl = userIdInstagram ? profileMap.get(userIdInstagram) ?? null : null;
          const assignmentInfo = userIdInstagram ? assignmentMap.get(userIdInstagram) : null;

          const messages = details?.messages || [];

          return {
            id: conv.id,
            contactId: conv.id,
            phone: `@${username}`,
            name: username,
            stage: "-",
            lastMessagePreview:
              details?.lastMessagePreview || "Sem mensagens",
            lastMessageAt: details?.lastMessageAt || null,
            totalMessages: messages.length,
            username,
            profilePictureUrl,
            platform: "instagram" as const,
            userIdInstagram,
            assignedUserId: assignmentInfo?.assignedUserId ?? null,
            assignedUserName: assignmentInfo?.assignedUserName ?? null,
            assignmentId: assignmentInfo?.assignmentId ?? null,
            isAssignedToCurrentUser: assignmentInfo?.assignedUserId === currentUserId,
          };
        }
      );

      const newMessages: Record<string, InstagramChatMessage[]> = {};
      const newPaging: Record<string, { hasMore: boolean; nextCursor?: string }> = {};

      detailsResults.forEach((details, index) => {
        if (details) {
          const convId = data.conversations[index].id;
          newMessages[convId] = details.messages;
          newPaging[convId] = {
            hasMore: details.hasNext ?? false,
            nextCursor: details.nextCursor,
          };
        }
      });

      setContacts((prev) => {
        const combined = [...prev, ...newContacts];
        combined.sort((a, b) => {
          const aTime = a.lastMessageAt
            ? new Date(a.lastMessageAt).getTime()
            : 0;
          const bTime = b.lastMessageAt
            ? new Date(b.lastMessageAt).getTime()
            : 0;
          return bTime - aTime;
        });
        return combined;
      });

      setMessagesByContact((prev) => ({ ...prev, ...newMessages }));
      setMessagesPaging((prev) => ({ ...prev, ...newPaging }));
      setHasMore(data.hasNext);
      setNextCursor(data.nextCursor || null);
    } catch (error) {
      console.error("Error loading more conversations:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [businessUsername, hasMore, loadingMore, nextCursor, currentUserId]);

  const loadMoreMessages = useCallback(
    async (contactId: string) => {
      const paging = messagesPaging[contactId];
      if (!paging?.nextCursor || loadingMessagesMore) return;

      try {
        setLoadingMessagesMore(true);

        const details = await fetchConversationDetails(
          contactId,
          businessUsername,
          paging.nextCursor
        );

        if (!details) return;

        setMessagesByContact((prev) => {
          const existing = prev[contactId] || [];
          const existingOldest = existing.length > 0 ? existing[0].createdAt : null;
          const newMsgs = details.messages.filter(m => {
            if (!existingOldest) return true;
            if (!m.createdAt) return false;
            return new Date(m.createdAt).getTime() < new Date(existingOldest).getTime();
          });
          const combined = [...newMsgs, ...existing];
          return {
            ...prev,
            [contactId]: combined,
          };
        });

        setMessagesPaging((prev) => ({
          ...prev,
          [contactId]: {
            hasMore: details.hasNext ?? false,
            nextCursor: details.nextCursor,
          },
        }));
      } catch (error) {
        console.error("Error loading more messages:", error);
      } finally {
        setLoadingMessagesMore(false);
      }
    },
    [businessUsername, loadingMessagesMore, messagesPaging]
  );

  const getHasMoreMessages = useCallback(
    (contactId: string) => {
      return messagesPaging[contactId]?.hasMore ?? false;
    },
    [messagesPaging]
  );

  return {
    contacts,
    messagesByContact,
    messagesPaging,
    loading,
    loadingMore,
    loadingMessagesMore,
    hasMore,
    loadInitial,
    loadMoreConversations,
    loadMoreMessages,
    getHasMoreMessages,
  };
}
