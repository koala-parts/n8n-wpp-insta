"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ContactAvatar } from "@/components/contact-avatar";
import { MessageInput } from "../chats/components/message-input";
import {
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  UserRoundPlus,
  UserRoundSearch,
} from "lucide-react";
import { toast } from "sonner";
import type { ChatContact, ChatMessage } from "@/data/get-messages";
import { ChatsMessagesList } from "../chats/components/chats-messages-list";
import { ChatsConversationHeader } from "../chats/components/chats-conversation-header";
import { useChatTeam } from "@/hooks/use-chat-team";
import {
  FINALIZED_STAGE,
  type InteractiveMessagePayload,
  getStoredUserId,
  getStoredUserName,
  isFinalizedStage,
} from "../chats/components/chats-view.helpers";
import { ChatsOptionsDialog } from "../chats/components/chats-options-dialog";
import { ChatsTransferDialog } from "../chats/components/chats-transfer-dialog";
import { ConversationActions } from "../chats/components/conversation-actions";
import {
  ChatActionError,
  finalizeChatStage,
  requestTransfer,
  transferChat,
} from "@/lib/chat-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Contact = {
  name: string;
  phone: string;
  photo: string | null;
  contactId: string | null;
  stage?: string | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  transferRequestedById?: string | null;
};

type ContactMessage = {
  id: string;
  direction: "inbound" | "outbound";
  senderType: string;
  content: string | null;
  createdAt: string | null;
  messageType: string;
};

type ConfirmActionType = "transfer" | "finalize" | "request";

export default function ContactsPage() {
  const { teamNames, transferUsers, loadingUsers, loadTransferUsers } = useChatTeam();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [optionsDialogPayload, setOptionsDialogPayload] =
    useState<InteractiveMessagePayload | null>(null);
  const [selectedOptionRowId, setSelectedOptionRowId] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [finalizingStage, setFinalizingStage] = useState(false);
  const [requestingTransfer, setRequestingTransfer] = useState(false);
  const [requestedTransferContactIds, setRequestedTransferContactIds] = useState<Set<string>>(
    new Set()
  );
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const userData = JSON.parse(userStr) as { id?: string; name?: string };
      setUserId(typeof userData.id === "string" ? userData.id : "");
      setUserName(typeof userData.name === "string" ? userData.name : "");
    } catch {
      // no-op
    }
  }, []);

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

    void fetchTransferUsers();
  }, [loadTransferUsers, transferDialogOpen]);

  const loadContacts = useCallback(async (withSpinner = true) => {
    try {
      if (withSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await fetch("/api/contacts", { cache: "no-store" });
      const data = (await response.json()) as { contacts?: Contact[]; error?: string };

      if (!response.ok) {
        toast.error(data.error || "Erro ao buscar contatos.");
        return;
      }

      const normalizedContacts = Array.isArray(data.contacts) ? data.contacts : [];
      setContacts(normalizedContacts);

      if (!selectedPhone && normalizedContacts.length > 0) {
        setSelectedPhone(normalizedContacts[0].phone);
      }
    } catch {
      toast.error("Erro ao buscar contatos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPhone]);

  useEffect(() => {
    void loadContacts(true);
  }, [loadContacts]);

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;

    return contacts.filter((contact) =>
      `${contact.name} ${contact.phone}`.toLowerCase().includes(term)
    );
  }, [contacts, search]);

  const activeContact = useMemo(() => {
    return contacts.find((contact) => contact.phone === selectedPhone) ?? filteredContacts[0] ?? null;
  }, [contacts, filteredContacts, selectedPhone]);

  const loadMessages = useCallback(async (phone: string) => {
    if (!phone) {
      setMessages([]);
      return;
    }

    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/contacts/messages?phone=${encodeURIComponent(phone)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { messages?: ContactMessage[]; error?: string };
      if (!response.ok) {
        toast.error(data.error || "Erro ao buscar mensagens.");
        return;
      }

      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      toast.error("Erro ao buscar mensagens.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!activeContact?.phone) {
      setMessages([]);
      return;
    }
    void loadMessages(activeContact.phone);
  }, [activeContact?.phone, loadMessages]);

  const activeMessages = useMemo<ChatMessage[]>(() => {
    const contactId = activeContact?.contactId ?? activeContact?.phone ?? "";
    const phone = activeContact?.phone ?? "";

    return messages.map((message) => ({
      id: message.id,
      contactId,
      phone,
      direction: message.direction,
      senderType: message.senderType || (message.direction === "outbound" ? "user" : "client"),
      senderName: message.senderType || undefined,
      messageType: message.messageType || "text",
      content: message.content,
      stage: "-",
      createdAt: message.createdAt,
    }));
  }, [activeContact?.contactId, activeContact?.phone, messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [activeContact?.phone, activeMessages.length]);

  const activeStage = useMemo(() => {
    const key = activeContact?.contactId ?? activeContact?.phone ?? "";
    if (!key) return "-";
    return stageOverrides[key] ?? activeContact?.stage ?? "-";
  }, [activeContact?.contactId, activeContact?.phone, activeContact?.stage, stageOverrides]);

  const activeConversationFinalized = isFinalizedStage(activeStage);
  const hasPersistedContactId = Boolean(activeContact?.contactId);
  const activeAssignedUserId = activeContact?.assignedUserId ?? null;
  const isAssignedToCurrentUser =
    !activeAssignedUserId || (userId !== "" && activeAssignedUserId === userId);
  const canManageDirectly = Boolean(activeContact) && hasPersistedContactId && isAssignedToCurrentUser;
  const canTransferDirectly = canManageDirectly && !activeConversationFinalized;
  const canFinalizeDirectly = canManageDirectly && !activeConversationFinalized;
  const canRequestTransfer =
    Boolean(activeContact) &&
    hasPersistedContactId &&
    Boolean(activeAssignedUserId) &&
    !isAssignedToCurrentUser &&
    !activeConversationFinalized;
  const hasPendingTransferRequest =
    canRequestTransfer &&
    Boolean(activeContact) &&
    (activeContact?.transferRequestedById === userId ||
      requestedTransferContactIds.has(activeContact.contactId ?? activeContact.phone));

  const activeHeaderContact = useMemo<ChatContact | null>(() => {
    if (!activeContact) return null;
    return {
      id: activeContact.contactId ?? activeContact.phone,
      contactId: activeContact.contactId ?? activeContact.phone,
      phone: activeContact.phone,
      name: activeContact.name,
      photo: activeContact.photo,
      stage: "-",
      lastMessagePreview: "",
      lastMessageAt: null,
      totalMessages: activeMessages.length,
      assignedUserId: null,
      assignedUserName: null,
      transferRequestedById: null,
    };
  }, [activeContact, activeMessages.length]);

  const handleOpenInteractiveOptions = (payload: InteractiveMessagePayload) => {
    setOptionsDialogPayload(payload);
    setSelectedOptionRowId("");
    setOptionsDialogOpen(true);
  };

  const executeTransfer = async () => {
    if (!activeContact?.contactId || !selectedUserId) {
      toast.error("Selecione um usuário para transferir.");
      return;
    }

    const targetUser = transferUsers.find((user) => user.id === selectedUserId);
    const currentUserName = getStoredUserName() || "Alguem";
    const currentUserId = getStoredUserId();

    try {
      setTransferring(true);
      await transferChat({
        contactId: activeContact.contactId,
        contactPhone: activeContact.phone,
        targetUserId: selectedUserId,
        targetUserName: targetUser?.name ?? "outro usuario",
        currentUserName,
        currentUserId,
        stage: activeStage,
      });
      toast.success("Chat transferido com sucesso.");
      setTransferDialogOpen(false);
      await Promise.all([loadContacts(false), loadMessages(activeContact.phone)]);
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

  const executeFinalizeStage = async () => {
    if (!activeContact?.contactId || !canFinalizeDirectly) {
      toast.error("Você não pode finalizar esta conversa.");
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

      const key = activeContact.contactId ?? activeContact.phone;
      setStageOverrides((previous) => ({
        ...previous,
        [key]: FINALIZED_STAGE,
      }));
      toast.success("Conversa finalizada com sucesso.");
      await Promise.all([loadContacts(false), loadMessages(activeContact.phone)]);
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

  const executeRequestTransfer = async () => {
    if (!activeContact?.contactId || !canRequestTransfer) {
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
        next.add(activeContact.contactId ?? activeContact.phone);
        return next;
      });
      await Promise.all([loadContacts(false), loadMessages(activeContact.phone)]);
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

  const selectedTransferUserName =
    transferUsers.find((user) => user.id === selectedUserId)?.name ?? "este usuário";

  const confirmDialogConfig = useMemo(() => {
    if (!activeContact || !confirmAction) {
      return {
        title: "",
        description: "",
        confirmLabel: "Confirmar",
        confirmVariant: "default" as const,
      };
    }

    if (confirmAction === "transfer") {
      return {
        title: "Confirmar transferência",
        description: `Deseja realmente transferir o chat de ${activeContact.name} para ${selectedTransferUserName}?`,
        confirmLabel: "Transferir",
        confirmVariant: "default" as const,
      };
    }

    if (confirmAction === "finalize") {
      return {
        title: "Confirmar finalização",
        description: `Deseja finalizar a conversa de ${activeContact.name}?`,
        confirmLabel: "Finalizar",
        confirmVariant: "destructive" as const,
      };
    }

    return {
      title: "Solicitar transferência",
      description: `Deseja solicitar a transferência desta conversa para você? A solicitação será enviada para ${activeContact.assignedUserName ?? "o responsável atual"}.`,
      confirmLabel: "Enviar solicitação",
      confirmVariant: "outline" as const,
    };
  }, [activeContact, confirmAction, selectedTransferUserName]);

  const handleAddContact = async () => {
    if (!firstName.trim() || !newPhone.trim()) {
      toast.error("Nome e telefone sao obrigatorios.");
      return;
    }

    try {
      setAdding(true);

      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: newPhone.trim(),
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error || "Erro ao adicionar contato.");
        return;
      }

      toast.success("Contato adicionado com sucesso.");
      setAddOpen(false);
      setFirstName("");
      setLastName("");
      setNewPhone("");
      await loadContacts(false);
    } catch {
      toast.error("Erro ao adicionar contato.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <PageContainer>
      <Card className="flex h-[calc(100vh-5rem)] min-h-0 flex-col gap-0 overflow-hidden rounded-2xl py-0 shadow-sm">
        <CardHeader className="shrink-0 border-b px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Contatos</CardTitle>
              <CardDescription className="mt-1">
                Gerencie conversas e acompanhe atendimento em tempo real.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                Adicionar contato
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-0">
          <div className="grid h-full min-h-0 md:grid-cols-[360px_1fr]">
            <aside className="flex min-h-0 min-w-0 flex-col border-b md:border-r md:border-b-0">
              <div className="border-b p-3 md:p-5">
                <div className="relative">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-7 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <UserRoundSearch className="mb-2 size-8" />
                    <p className="text-sm">Nenhum contato encontrado.</p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.phone}
                      type="button"
                      className={`flex w-full items-center gap-3 border-b px-4 py-3.5 text-left transition hover:bg-accent/60 ${
                        activeContact?.phone === contact.phone ? "bg-muted/70" : ""
                      }`}
                      onClick={() => setSelectedPhone(contact.phone)}
                    >
                      <ContactAvatar
                        name={contact.name}
                        photo={contact.photo}
                        className="h-10 w-10"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.phone}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section className="flex min-h-0 min-w-0 flex-col overflow-x-hidden">
              {activeContact ? (
                <>
                  <header className="border-b px-7 py-4 md:px-8">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="truncate text-sm font-semibold tracking-tight">Ações da conversa</p>
                        <p className="text-muted-foreground truncate text-xs">{activeContact.name}</p>
                      </div>
                      <ConversationActions
                        stage={activeStage}
                        assignedUserId={activeContact.assignedUserId}
                        assignedUserName={activeContact.assignedUserName}
                        showOwnerBadge
                        canFinalize={canFinalizeDirectly}
                        canTransfer={canTransferDirectly}
                        canRequestTransfer={canRequestTransfer}
                        hasPendingTransferRequest={hasPendingTransferRequest}
                        finalizing={finalizingStage}
                        requestingTransfer={requestingTransfer}
                        onFinalize={() => setConfirmAction("finalize")}
                        onTransfer={() => setTransferDialogOpen(true)}
                        onRequestTransfer={() => setConfirmAction("request")}
                      />
                    </div>
                  </header>
                  {activeHeaderContact ? (
                    <ChatsConversationHeader activeContact={activeHeaderContact} />
                  ) : null}
                  {loadingMessages ? (
                    <div className="flex flex-1 items-center justify-center py-8">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <ChatsMessagesList
                      activeMessages={activeMessages}
                      teamNames={teamNames}
                      messagesContainerRef={messagesContainerRef}
                      onOpenInteractiveOptions={handleOpenInteractiveOptions}
                    />
                  )}
                  <div className="mt-auto">
                    <MessageInput
                      contactId={activeContact.contactId ?? activeContact.phone}
                      contactPhone={activeContact.phone}
                      onMessageSent={() => void loadMessages(activeContact.phone)}
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Escolha um contato para iniciar.
                </div>
              )}
            </section>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar contato</DialogTitle>
            <DialogDescription>
              Informe nome e telefone para criar um novo contato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Nome"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
            <Input
              placeholder="Sobrenome (opcional)"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
            <Input
              placeholder="Telefone (ex: 554499999999)"
              value={newPhone}
              onChange={(event) => setNewPhone(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddContact} disabled={adding}>
              {adding ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <UserRoundPlus className="size-4" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ChatsTransferDialog
        open={transferDialogOpen}
        activeContactName={activeContact?.name}
        loadingUsers={loadingUsers}
        transferUsers={transferUsers}
        selectedUserId={selectedUserId}
        transferring={transferring}
        onOpenChange={setTransferDialogOpen}
        onSelectUser={setSelectedUserId}
        onTransfer={() => {
          if (!selectedUserId) {
            toast.error("Selecione um usuário para transferir.");
            return;
          }
          setTransferDialogOpen(false);
          setConfirmAction("transfer");
        }}
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
            <Button
              type="button"
              variant={confirmDialogConfig.confirmVariant}
              onClick={handleConfirmAction}
              disabled={confirmingAction}
            >
              {confirmingAction ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  {confirmAction === "transfer" ? (
                    <ArrowRightLeft className="size-4" />
                  ) : confirmAction === "finalize" ? (
                    <ShieldAlert className="size-4" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {confirmDialogConfig.confirmLabel}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    </PageContainer>
  );
}

