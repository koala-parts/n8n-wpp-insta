"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import type { ChatContact, ChatMessage } from "@/data/get-messages";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { PageContainer, PageContent } from "@/components/ui/page-container";
import ChatsView from "./chats-view";

type ChatDetailViewProps = {
  contactId: string;
  backHref: string;
  backLabel: string;
  title: string;
  description: string;
  viewMode?: "my" | "bot" | "all";
};

export function ChatDetailView({
  contactId,
  backHref,
  backLabel,
  title,
  description,
  viewMode = "my",
}: ChatDetailViewProps) {
  const [contact, setContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChatData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createBrowserSupabase();

      const { data: contactData, error: contactError } = await supabase
        .from("whatsapp_contacts")
        .select("*")
        .eq("id", contactId)
        .limit(1);

      if (contactError) throw contactError;

      if (!contactData || contactData.length === 0) {
        setError("Contato não encontrado");
        return;
      }

      const contactRow = contactData[0] as Record<string, unknown>;
      const phone = String(contactRow.phone || "");
      const normalizedPhone = phone.replace(/\D/g, "");
      const name = String(contactRow.name || (normalizedPhone ? `Contato ${normalizedPhone.slice(-4)}` : "Sem nome"));
      const photo = typeof contactRow.photo === "string" && contactRow.photo.trim() ? contactRow.photo.trim() : null;

      const { data: messagesData, error: messagesError } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: true })
        .limit(5000);

      if (messagesError) throw messagesError;

      const { data: sessionData, error: sessionError } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("contact_id", contactId)
        .limit(1);

      const { data: assignmentData, error: assignmentError } = await supabase
        .from("user_active_contacts")
        .select("user_id, transferred_by, users!user_active_contacts_user_id_fkey(name)")
        .eq("contact_id", contactId)
        .eq("active", true)
        .limit(1);

      if (sessionError) throw sessionError;
      if (assignmentError) throw assignmentError;

      const stage =
        sessionData && sessionData.length > 0
          ? String(sessionData[0].stage || "-")
          : "-";

      const assignmentRow = (assignmentData?.[0] ?? null) as
        | {
            user_id?: string;
            transferred_by?: string;
            users?: { name?: string } | null;
          }
        | null;

      const assignedUserId =
        assignmentRow && typeof assignmentRow.user_id === "string" && assignmentRow.user_id.trim()
          ? assignmentRow.user_id.trim()
          : null;
      const assignedUserName =
        assignmentRow &&
        assignmentRow.users &&
        typeof assignmentRow.users.name === "string" &&
        assignmentRow.users.name.trim()
          ? assignmentRow.users.name.trim()
          : null;
      const transferRequestedById =
        assignmentRow &&
        typeof assignmentRow.transferred_by === "string" &&
        assignmentRow.transferred_by.trim()
          ? assignmentRow.transferred_by.trim()
          : null;

      const processedMessages: ChatMessage[] = (messagesData || []).map((row, index) => {
        const rowData = row as Record<string, unknown>;
        const rawSenderType = String(rowData.sender_type || rowData.senderType || "").trim();
        const explicitSenderName = String(rowData.sender_name || rowData.senderName || "").trim();

        return {
          id: String(rowData.id || `${contactId}-${index}`),
          contactId: String(rowData.contact_id || contactId),
          phone: String(rowData.phone || normalizedPhone),
          direction: String(rowData.direction || "").toLowerCase() === "inbound" ? "inbound" : "outbound",
          senderType: rawSenderType,
          senderName: explicitSenderName || rawSenderType || undefined,
          messageType: String(rowData.message_type || rowData.messageType || "text"),
          content: typeof rowData.content === "string" && rowData.content.trim() ? rowData.content : null,
          stage: String(rowData.stage || stage),
          createdAt: typeof rowData.created_at === "string" ? rowData.created_at : null,
        };
      });

      const latestTransferEventContent = [...processedMessages]
        .reverse()
        .map((message) => (message.content ?? "").toLowerCase())
        .find(
          (content) =>
            content.includes("solicitou transferência da conversa") ||
            content.includes("transferiu a conversa para") ||
            content.includes("recusou a solicitação de transferência") ||
            content.includes("aprovou a solicitação de transferência")
        );

      const hasPendingTransferRequest =
        typeof latestTransferEventContent === "string" &&
        latestTransferEventContent.includes("solicitou transferência da conversa");

      const lastMessage = processedMessages[processedMessages.length - 1] ?? null;

      setContact({
        id: contactId,
        contactId,
        phone,
        name,
        photo,
        stage,
        assignedUserId,
        assignedUserName,
        transferRequestedById: hasPendingTransferRequest ? transferRequestedById : null,
        lastMessagePreview: lastMessage?.content ?? "Sem mensagens ainda",
        lastMessageAt: lastMessage?.createdAt ?? null,
        totalMessages: processedMessages.length,
      });
      setMessages(processedMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar chat");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (error || !contact) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
          <div className="py-12 text-center">
            <p className="text-red-500">{error || "Contato não encontrado"}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageContent>
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>

          <ChatsView
            contacts={[contact]}
            messagesByContact={{ [contact.contactId]: messages }}
            loading={loading}
            onTransferred={loadChatData}
            title={title}
            description={description}
            viewMode={viewMode}
          />
        </div>
      </PageContent>
    </PageContainer>
  );
}
