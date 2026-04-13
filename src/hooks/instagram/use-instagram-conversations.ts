import { useState, useCallback, useEffect, useRef } from "react";
import { type InstagramContact, type InstagramChatMessage } from "@/data/instagram/types";

const POLLING_INTERVAL = 30000;

async function fetchConversationsFull(after?: string, includeMessages = true) {
  let url = "/api/instagram/conversations-full";
  const params = new URLSearchParams();
  if (after) params.set("after", after);
  if (includeMessages) params.set("includeMessages", "true");
  const queryString = params.toString();
  if (queryString) url += `?${queryString}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Erro ao carregar conversas");

  const data = await response.json();
  if (data.error) throw new Error(data.error);

  return data;
}

export function useInstagramPagination(businessUsername: string) {
  const [contacts, setContacts] = useState<InstagramContact[]>([]);
  const [messagesByContact, setMessagesByContact] = useState<Record<string, InstagramChatMessage[]>>({});
  const [messagesPaging, setMessagesPaging] = useState<Record<string, { hasMore: boolean; nextCursor?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMessagesMore, setLoadingMessagesMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr) as { id?: string };
        if (userData.id) setCurrentUserId(userData.id);
      }
    } catch {}
  }, []);

  const refreshActiveContactMessages = useCallback(async () => {
    if (!selectedContactId || isPollingRef.current) return;
    
    try {
      isPollingRef.current = true;
      const data = await fetchConversationsFull(undefined, true);
      
      if (data.messages && data.messages[selectedContactId]) {
        setMessagesByContact(prev => ({
          ...prev,
          [selectedContactId]: data.messages[selectedContactId]
        }));
      }

      if (data.conversations) {
        const updatedContact = data.conversations.find((c: InstagramContact) => c.contactId === selectedContactId);
        if (updatedContact) {
          setContacts(prev => prev.map(c => 
            c.contactId === selectedContactId ? updatedContact : c
          ));
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
    } finally {
      isPollingRef.current = false;
    }
  }, [selectedContactId]);

  useEffect(() => {
    if (selectedContactId) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(refreshActiveContactMessages, POLLING_INTERVAL);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [selectedContactId, refreshActiveContactMessages]);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchConversationsFull(undefined, true);

      if (!data.conversations || data.conversations.length === 0) {
        setContacts([]);
        setHasMore(false);
        return;
      }

      const newContacts = data.conversations.map((conv: InstagramContact) => ({
        ...conv,
        isAssignedToCurrentUser: conv.assignedUserId === currentUserId,
      }));

      setContacts(newContacts);
      setMessagesByContact(data.messages || {});
      setHasMore(data.hasNext);
      setNextCursor(data.nextCursor || null);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const loadMoreConversations = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;

    try {
      setLoadingMore(true);
      const data = await fetchConversationsFull(nextCursor, true);

      if (!data.conversations || data.conversations.length === 0) {
        setHasMore(false);
        return;
      }

      const newContacts = data.conversations.map((conv: InstagramContact) => ({
        ...conv,
        isAssignedToCurrentUser: conv.assignedUserId === currentUserId,
      }));

      setContacts(prev => {
        const combined = [...prev, ...newContacts];
        combined.sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime;
        });
        return combined;
      });

      setMessagesByContact(prev => ({ ...prev, ...(data.messages || {}) }));
      setHasMore(data.hasNext);
      setNextCursor(data.nextCursor || null);
    } catch (error) {
      console.error("Error loading more conversations:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor, currentUserId]);

  const loadMoreMessages = useCallback(async (contactId: string) => {
    const paging = messagesPaging[contactId];
    if (!paging?.nextCursor || loadingMessagesMore) return;

    try {
      setLoadingMessagesMore(true);
      const url = `/api/instagram/chats/${contactId}?before=${paging.nextCursor}`;
      const response = await fetch(url);
      
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.error || !data.messages) return;

      const newMessages = data.messages.map((msg: InstagramChatMessage) => ({
        ...msg,
        contactId,
      })).sort((a: InstagramChatMessage, b: InstagramChatMessage) => 
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );

      setMessagesByContact(prev => {
        const existing = prev[contactId] || [];
        return { ...prev, [contactId]: [...newMessages, ...existing] };
      });

      setMessagesPaging(prev => ({
        ...prev,
        [contactId]: { hasMore: data.hasNext ?? false, nextCursor: data.nextCursor },
      }));
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setLoadingMessagesMore(false);
    }
  }, [loadingMessagesMore, messagesPaging]);

  const getHasMoreMessages = useCallback((contactId: string) => {
    return messagesPaging[contactId]?.hasMore ?? false;
  }, [messagesPaging]);

  const setActiveContact = useCallback((contactId: string | null) => {
    setSelectedContactId(contactId);
  }, []);

  const updateContactWithNewMessage = useCallback((contactId: string, newMessage: InstagramChatMessage) => {
    setMessagesByContact(prev => {
      const existing = prev[contactId] || [];
      const exists = existing.some(m => m.id === newMessage.id);
      if (exists) return prev;
      return { ...prev, [contactId]: [...existing, newMessage] };
    });
  }, []);

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
    setActiveContact,
    updateContactWithNewMessage,
  };
}