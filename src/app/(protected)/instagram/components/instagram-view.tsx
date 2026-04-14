"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle, Instagram } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { InstagramContactList } from "./instagram-contact-list";
import { InstagramMessagesList } from "./instagram-messages-list";
import { InstagramMessageInput } from "./instagram-message-input";
import {
  type InstagramContact,
  type InstagramChatMessage,
} from "@/data/instagram/types";

type InstagramViewProps = {
  contacts: InstagramContact[];
  messagesByContact: Record<string, InstagramChatMessage[]>;
  loading?: boolean;
  loadingMore?: boolean;
  hasMoreConversations?: boolean;
  selectedContactId?: string;
  onRefresh?: () => Promise<void>;
  onSelectContact?: (contactId: string) => void;
  onLoadMoreConversations?: () => void;
  onMessageSent?: () => void;
  businessUsername?: string;
  title?: string;
  description?: string;
};

export default function InstagramView({
  contacts,
  messagesByContact,
  loading = false,
  loadingMore = false,
  hasMoreConversations = false,
  selectedContactId: externalSelectedId,
  onRefresh,
  onSelectContact,
  onLoadMoreConversations,
  onMessageSent,
  businessUsername = "koalaparts",
  title = "Instagram",
  description = "Gerencie suas conversas do Instagram.",
}: InstagramViewProps) {
  const [search, setSearch] = useState("");
  const [internalSelectedId, setInternalSelectedId] = useState(
    contacts[0]?.contactId ?? ""
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [filterMyChats, setFilterMyChats] = useState(false);
  const [finishingChatId, setFinishingChatId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const selectedContactId = externalSelectedId || internalSelectedId;

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr) as { id?: string; name: string };
        setUserName(userData.name);
      }
    } catch (error) {
      console.error("Erro ao carregar nome do usuário:", error);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("instagram-sidebar-collapsed");
    if (saved !== null) {
      setIsSidebarCollapsed(saved === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "instagram-sidebar-collapsed",
      String(isSidebarCollapsed)
    );
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (externalSelectedId) return;
    if (
      !contacts.some((contact) => contact.contactId === selectedContactId)
    ) {
      setInternalSelectedId(contacts[0]?.contactId ?? "");
    }
  }, [contacts, selectedContactId, externalSelectedId]);

  const activeContact =
    contacts.find((contact) => contact.contactId === selectedContactId) ??
    contacts[0] ??
    null;

  const activeMessages = activeContact
    ? messagesByContact[activeContact.contactId] ?? []
    : [];

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [activeContact?.contactId, activeMessages.length]);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      try {
        await onRefresh();
      } catch {
        toast.error("Erro ao atualizar conversas");
      }
    }
  }, [onRefresh]);

  const handleSelectContact = useCallback(
    (contactId: string) => {
      setInternalSelectedId(contactId);
      if (onSelectContact) {
        onSelectContact(contactId);
      }
    },
    [onSelectContact]
  );

  const handleFinishChat = useCallback(async (contact: InstagramContact) => {
    if (!contact.userIdInstagram) {
      toast.error("ID do Instagram não encontrado");
      return;
    }

    try {
      setFinishingChatId(contact.contactId);
      const response = await fetch("/api/instagram/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIdInstagram: contact.userIdInstagram,
          assignmentId: contact.assignmentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao finalizar");
      }

      toast.success("Conversa finalizada com sucesso!");
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao finalizar conversa");
    } finally {
      setFinishingChatId(null);
    }
  }, [onRefresh]);

  return (
    <Card className="flex h-[calc(100vh-5rem)] min-h-0 flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="shrink-0 border-b py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={loading}
            >
              <Loader2 className={cn("size-4", loading && "animate-spin")} />
              Atualizar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-0">
        <div
          className={cn(
            "grid h-full min-h-0 transition-all duration-300",
            isSidebarCollapsed
              ? "md:grid-cols-[50px_1fr]"
              : "md:grid-cols-[360px_1fr]"
          )}
        >
          <InstagramContactList
            isSidebarCollapsed={isSidebarCollapsed}
            search={search}
            contacts={contacts}
            activeContactId={activeContact?.contactId ?? null}
            onSearchChange={setSearch}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onSelectContact={handleSelectContact}
            loadingMore={loadingMore}
            hasMore={hasMoreConversations}
            onLoadMore={onLoadMoreConversations}
            filterMyChats={filterMyChats}
            onFilterMyChatsChange={setFilterMyChats}
          />

          <section className="flex min-h-0 min-w-0 flex-col overflow-x-hidden">
            {activeContact ? (
              <>
                <div className="border-b px-5 py-4 md:px-8">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 text-white shadow-md">
                        <Instagram className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{activeContact.name}</p>
                        <p className="text-muted-foreground text-xs">{activeContact.phone}</p>
                      </div>
                    </div>
                    {(activeContact.isAssignedToCurrentUser || activeContact.assignedUserId) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleFinishChat(activeContact)}
                        disabled={finishingChatId === activeContact.contactId}
                        className="gap-1.5 text-primary border-primary/20 hover:bg-primary/10 dark:border-primary/40"
                      >
                        <CheckCircle className="size-3.5" />
                        {finishingChatId === activeContact.contactId ? "Finalizando..." : "Finalizar"}
                      </Button>
                    )}
                  </div>
                </div>

                <InstagramMessagesList
                  activeMessages={activeMessages}
                  teamNames={new Set([userName, businessUsername, "bot"])}
                  messagesContainerRef={messagesContainerRef}
                />
              </>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                {loading
                  ? "Carregando conversas..."
                  : "Nenhuma conversa disponível."}
              </div>
            )}

            {activeContact && (
              <InstagramMessageInput
                contactId={activeContact.contactId}
                igsid={activeContact.userIdInstagram ?? ""}
                userName={userName}
                onMessageSent={onMessageSent}
              />
            )}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
