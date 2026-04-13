"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PageContainer,
  PageContent,
} from "@/components/ui/page-container";
import InstagramView from "./components/instagram-view";
import { useInstagramPagination } from "@/hooks/instagram/use-instagram-conversations";

const InstagramPage = () => {
  const [businessUsername, setBusinessUsername] = useState<string>("koalaparts");
  const [selectedId, setSelectedId] = useState<string>("");

  const {
    contacts,
    loading,
    loadingMore,
    hasMore,
    loadInitial,
    loadMoreConversations,
    messagesByContact,
    setActiveContact,
    updateContactWithNewMessage,
  } = useInstagramPagination(businessUsername);

  useEffect(() => {
    const loadBusinessUsername = async () => {
      try {
        const response = await fetch("/api/instagram/business");
        if (response.ok) {
          const data = await response.json();
          if (data.username) {
            setBusinessUsername(data.username);
          }
        }
      } catch {
        // Use default
      }
    };
    loadBusinessUsername();
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const handleRefresh = useCallback(async () => {
    await loadInitial();
  }, [loadInitial]);

  const handleSelectContact = useCallback((contactId: string) => {
    setSelectedId(contactId);
    setActiveContact(contactId);
  }, [setActiveContact]);

  const handleLoadMoreConversations = useCallback(() => {
    void loadMoreConversations();
  }, [loadMoreConversations]);

  const handleMessageSent = useCallback(() => {
    // Trigger polling to refresh messages immediately
    const activeContactId = selectedId;
    if (activeContactId) {
      // Just trigger a quick refresh by reloading
      void loadInitial();
    }
  }, [selectedId, loadInitial]);

  return (
    <PageContainer>
      <PageContent>
        <InstagramView
          contacts={contacts}
          messagesByContact={messagesByContact}
          loading={loading}
          loadingMore={loadingMore}
          hasMoreConversations={hasMore}
          selectedContactId={selectedId}
          onRefresh={handleRefresh}
          onSelectContact={handleSelectContact}
          onLoadMoreConversations={handleLoadMoreConversations}
          onMessageSent={handleMessageSent}
          businessUsername={businessUsername}
        />
      </PageContent>
    </PageContainer>
  );
};

export default InstagramPage;
