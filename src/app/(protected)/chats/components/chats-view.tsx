"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ChatContact, ChatMessage } from "@/data/get-messages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageInput } from "./message-input";
import { useChatTeam } from "@/hooks/use-chat-team";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChatsContactList } from "./chats-contact-list";
import { ChatsConversationHeader } from "./chats-conversation-header";
import { ChatsMessagesList } from "./chats-messages-list";
import { ChatsOptionsDialog } from "./chats-options-dialog";
import { ChatsTransferDialog } from "./chats-transfer-dialog";
import {
  FINALIZED_STAGE,
  type InteractiveMessagePayload,
  getStageLabel,
  getStoredUserId,
  getStoredUserName,
  isFinalizedStage,
} from "./chats-view.helpers";
import {
  ChatActionError,
  requestTransfer,
  finalizeChatStage,
  transferChat,
} from "@/lib/chat-actions";

type ChatsViewProps = {
  contacts: ChatContact[];
  messagesByContact: Record<string, ChatMessage[]>;
  loading?: boolean;
  onTransferred?: () => Promise<void>;
  title?: string;
  description?: string;
  viewMode?: "my" | "bot" | "all";
};

type ConfirmActionType = "transfer" | "finalize" | "request";

export default function ChatsView({
  contacts,
  messagesByContact,
  loading = false,
  onTransferred,
  title = "Meus Chats",
  description = "Selecione um contato para visualizar o histórico de mensagens.",
  viewMode = "my",
}: ChatsViewProps) {
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState(contacts[0]?.contactId ?? "");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [finalizingStage, setFinalizingStage] = useState(false);
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [optionsDialogPayload, setOptionsDialogPayload] =
    useState<InteractiveMessagePayload | null>(null);
  const [selectedOptionRowId, setSelectedOptionRowId] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [requestingTransfer, setRequestingTransfer] = useState(false);
  const [requestedTransferContactIds, setRequestedTransferContactIds] = useState<Set<string>>(
    new Set()
  );
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const { teamNames, transferUsers, loadingUsers, loadTransferUsers } = useChatTeam();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Load user name
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr) as { id?: string; name: string };
        setUserName(userData.name);
        setUserId(typeof userData.id === "string" ? userData.id : "");
      }
    } catch (error) {
      console.error("Erro ao carregar nome do usuário:", error);
    }
  }, []);

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chat-sidebar-collapsed");
    if (saved !== null) {
      setIsSidebarCollapsed(saved === "true");
    }
  }, []);

  // Persist sidebar collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("chat-sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!contacts.some((contact) => contact.contactId === selectedContactId)) {
      setSelectedContactId(contacts[0]?.contactId ?? "");
    }
  }, [contacts, selectedContactId]);

  useEffect(() => {
    const fetchTransferUsers = async () => {
      if (!transferDialogOpen) return;

      const result = await loadTransferUsers();
      if ("error" in result) {
        toast.error("Erro ao carregar usuários para transferência.");
        return;
      }
      setSelectedUserId(result.users?.[0]?.id ?? "");
    };

    fetchTransferUsers();
  }, [transferDialogOpen, loadTransferUsers]);

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;

    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(term) ||
        contact.phone.toLowerCase().includes(term)
    );
  }, [contacts, search]);

  const activeContact =
    contacts.find((contact) => contact.contactId === selectedContactId) ??
    filteredContacts[0] ??
    null;

  const activeMessages = activeContact
    ? messagesByContact[activeContact.contactId] ?? []
    : [];

  const activeStage = activeContact
    ? stageOverrides[activeContact.contactId] ?? activeContact.stage
    : "-";
  const activeConversationFinalized = isFinalizedStage(activeStage);
  const activeAssignedUserId = activeContact?.assignedUserId ?? null;
  const isAssignedToCurrentUser =
    !activeAssignedUserId || (userId !== "" && activeAssignedUserId === userId);
  const canManageDirectly = viewMode === "my" || (viewMode === "all" && isAssignedToCurrentUser);
  const canTransferDirectly = canManageDirectly && !activeConversationFinalized;
  const canFinalizeDirectly = canManageDirectly && !activeConversationFinalized;
  const canRequestTransfer =
    viewMode === "all" &&
    Boolean(activeContact) &&
    Boolean(activeAssignedUserId) &&
    !isAssignedToCurrentUser &&
    !activeConversationFinalized;
  const hasPendingTransferRequest =
    canRequestTransfer &&
    Boolean(activeContact) &&
    (activeContact.transferRequestedById === userId ||
      requestedTransferContactIds.has(activeContact.contactId));

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [activeContact?.contactId, activeMessages.length]);

  const executeTransfer = async () => {
    if (!activeContact || !selectedUserId) {
      toast.error("Selecione um usuário para transferir.");
      return;
    }

    const targetUser = transferUsers.find((user) => user.id === selectedUserId);
    const currentUserName = getStoredUserName() || "Alguem";
    const currentUserId = getStoredUserId();

    try {
      setTransferring(true);
      const transferResult = await transferChat({
        contactId: activeContact.contactId,
        contactPhone: activeContact.phone,
        targetUserId: selectedUserId,
        targetUserName: targetUser?.name ?? "outro usuario",
        currentUserName,
        currentUserId,
        stage: activeStage,
      });

      void transferResult;

      toast.success("Chat transferido com sucesso.");
      setTransferDialogOpen(false);

      if (onTransferred) {
        await onTransferred();
      }
    } catch (error) {
      if (error instanceof ChatActionError) {
        toast.error(error.message);
        return;
      }

      toast.error("Erro ao transferir chat.");
    } finally {
      setTransferring(false);
    }
  };

  const handleTransfer = async () => {
    if (!activeContact || !selectedUserId) {
      toast.error("Selecione um usuário para transferir.");
      return;
    }

    setTransferDialogOpen(false);
    setConfirmAction("transfer");
  };

  const executeFinalizeStage = async () => {
    if (!canFinalizeDirectly) {
      toast.error("Você não pode finalizar esta conversa.");
      return;
    }

    if (!activeContact) {
      toast.error("Selecione um chat para finalizar.");
      return;
    }

    if (activeConversationFinalized) {
      toast.info("Esta conversa já está finalizada.");
      return;
    }

    try {
      setFinalizingStage(true);
      const currentUserName = getStoredUserName() || "Alguem";
      await finalizeChatStage({
        contactId: activeContact.contactId,
        contactPhone: activeContact.phone,
        stage: FINALIZED_STAGE,
        currentUserName,
      });

      setStageOverrides((previous) => ({
        ...previous,
        [activeContact.contactId]: FINALIZED_STAGE,
      }));
      toast.success("Conversa finalizada com sucesso.");

      if (onTransferred) {
        await onTransferred();
      }
    } catch (error) {
      if (error instanceof ChatActionError) {
        toast.error(error.message);
        return;
      }

      toast.error("Erro ao finalizar conversa.");
    } finally {
      setFinalizingStage(false);
    }
  };

  const handleFinalizeStage = async () => {
    if (!canFinalizeDirectly) {
      toast.error("Você não pode finalizar esta conversa.");
      return;
    }

    if (!activeContact) {
      toast.error("Selecione um chat para finalizar.");
      return;
    }

    if (activeConversationFinalized) {
      toast.info("Esta conversa já está finalizada.");
      return;
    }

    setConfirmAction("finalize");
  };

  const executeRequestTransfer = async () => {
    if (!activeContact) {
      toast.error("Selecione uma conversa.");
      return;
    }

    if (!canRequestTransfer) {
      toast.error("Solicitação de transferência indisponível para esta conversa.");
      return;
    }

    if (!userId || !userName) {
      toast.error("Usuário não identificado.");
      return;
    }

    try {
      setRequestingTransfer(true);
      await requestTransfer({
        contactId: activeContact.contactId,
        requesterUserId: userId,
        requesterUserName: userName,
        contactPhone: activeContact.phone,
        stage: activeStage,
      });

      toast.success("Solicitação enviada com sucesso.");
      setRequestedTransferContactIds((previous) => {
        const next = new Set(previous);
        next.add(activeContact.contactId);
        return next;
      });

      if (onTransferred) {
        await onTransferred();
      }
    } catch (error) {
      if (error instanceof ChatActionError) {
        toast.error(error.message);
        return;
      }

      toast.error("Erro ao solicitar transferência.");
    } finally {
      setRequestingTransfer(false);
    }
  };

  const handleRequestTransfer = async () => {
    if (!activeContact) {
      toast.error("Selecione uma conversa.");
      return;
    }

    if (!canRequestTransfer) {
      toast.error("Solicitação de transferência indisponível para esta conversa.");
      return;
    }

    if (hasPendingTransferRequest) {
      toast.info("Solicitação já enviada para esta conversa.");
      return;
    }

    setConfirmAction("request");
  };

  const selectedTransferUserName =
    transferUsers.find((user) => user.id === selectedUserId)?.name ?? "este usuário";

  const confirmDialogConfig = useMemo(() => {
    if (!activeContact || !confirmAction) {
      return {
        title: "",
        description: "",
        confirmLabel: "Confirmar",
      };
    }

    if (confirmAction === "transfer") {
      return {
        title: "Confirmar transferência",
        description: `Deseja realmente transferir o chat de ${activeContact.name} para ${selectedTransferUserName}?`,
        confirmLabel: "Transferir",
      };
    }

    if (confirmAction === "finalize") {
      return {
        title: "Confirmar finalização",
        description: `Deseja finalizar a conversa de ${activeContact.name}?`,
        confirmLabel: "Finalizar",
      };
    }

    return {
      title: "Solicitar transferência",
      description: `Deseja solicitar a transferência desta conversa para você? A solicitação será enviada para ${activeContact.assignedUserName ?? "o responsável atual"}.`,
      confirmLabel: "Enviar solicitação",
    };
  }, [activeContact, confirmAction, selectedTransferUserName]);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      setConfirmingAction(true);

      if (confirmAction === "transfer") {
        await executeTransfer();
      } else if (confirmAction === "finalize") {
        await executeFinalizeStage();
      } else {
        await executeRequestTransfer();
      }

      setConfirmAction(null);
    } finally {
      setConfirmingAction(false);
    }
  };

  const handleOpenInteractiveOptions = (payload: InteractiveMessagePayload) => {
    setOptionsDialogPayload(payload);
    setSelectedOptionRowId("");
    setOptionsDialogOpen(true);
  };

  return (
    <Card className="flex h-[calc(100vh-5rem)] min-h-0 flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="shrink-0 border-b py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>

          {activeContact ? (
            <div className="flex items-center gap-2">
              <Badge variant={activeConversationFinalized ? "default" : "outline"}>
                {activeConversationFinalized
                  ? "✓ Finalizado"
                  : getStageLabel(activeStage)}
              </Badge>

              {canFinalizeDirectly ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleFinalizeStage}
                  disabled={finalizingStage || activeConversationFinalized}
                >
                  {finalizingStage ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : activeConversationFinalized ? (
                    "Finalizado"
                  ) : (
                    "Finalizar"
                  )}
                </Button>
              ) : null}

              {canTransferDirectly ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setTransferDialogOpen(true)}>
                  Transferir
                </Button>
              ) : null}

              {canRequestTransfer ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRequestTransfer}
                  disabled={requestingTransfer || hasPendingTransferRequest}
                >
                  {requestingTransfer ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Solicitando...
                    </>
                  ) : hasPendingTransferRequest ? (
                    "Solicitação enviada"
                  ) : (
                    "Solicitar transferência"
                  )}
                </Button>
              ) : null}
            </div>
          ) : null}
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
          <ChatsContactList
            isSidebarCollapsed={isSidebarCollapsed}
            search={search}
            filteredContacts={filteredContacts}
            activeContactId={activeContact?.contactId ?? null}
            stageOverrides={stageOverrides}
            onSearchChange={setSearch}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onSelectContact={setSelectedContactId}
          />

          <section className="flex min-h-0 min-w-0 flex-col overflow-x-hidden">
            {activeContact ? (
              <>
                <ChatsConversationHeader
                  activeContact={activeContact}
                />

                <ChatsMessagesList
                  activeMessages={activeMessages}
                  teamNames={teamNames}
                  messagesContainerRef={messagesContainerRef}
                  onOpenInteractiveOptions={handleOpenInteractiveOptions}
                />
              </>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                {loading ? "Carregando chats..." : "Nenhum chat disponível."}
              </div>
            )}

            {activeContact && (
              <MessageInput
                contactId={activeContact.contactId}
                contactPhone={activeContact.phone}
                userName={userName}
                onMessageSent={() => {
                  // Opcionalmente, poderia recarregar mensagens aqui
                }}
              />
            )}
          </section>
        </div>
      </CardContent>

      <ChatsTransferDialog
        open={transferDialogOpen}
        activeContactName={activeContact?.name}
        loadingUsers={loadingUsers}
        transferUsers={transferUsers}
        selectedUserId={selectedUserId}
        transferring={transferring}
        onOpenChange={setTransferDialogOpen}
        onSelectUser={setSelectedUserId}
        onTransfer={handleTransfer}
      />

      <ChatsOptionsDialog
        open={optionsDialogOpen}
        payload={optionsDialogPayload}
        selectedOptionRowId={selectedOptionRowId}
        onOpenChange={(open) => {
          setOptionsDialogOpen(open);
          if (!open) {
            setSelectedOptionRowId("");
            setOptionsDialogPayload(null);
          }
        }}
        onSelectOption={setSelectedOptionRowId}
      />

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmDialogConfig.title}</DialogTitle>
            <DialogDescription>{confirmDialogConfig.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={confirmingAction}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmAction} disabled={confirmingAction}>
              {confirmingAction ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                confirmDialogConfig.confirmLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}