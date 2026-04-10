import { createBrowserSupabase } from "@/lib/supabase";

type ChatActionErrorCode =
  | "ASSIGN_LOAD"
  | "ASSIGN_UPDATE"
  | "ASSIGN_INSERT"
  | "ASSIGN_RELEASE"
  | "ASSIGN_REQUEST"
  | "ASSIGN_REQUEST_NOT_FOUND"
  | "ASSIGN_REQUEST_CLEAR"
  | "MESSAGE_INSERT"
  | "SESSION_SELECT"
  | "SESSION_NOT_FOUND"
  | "SESSION_UPDATE";

export class ChatActionError extends Error {
  readonly code: ChatActionErrorCode;

  constructor(code: ChatActionErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ChatActionError";
  }
}

type TransferChatParams = {
  contactId: string;
  contactPhone: string;
  targetUserId: string;
  targetUserName: string;
  currentUserName: string;
  currentUserId?: string;
  stage: string;
};

type TransferChatResult = {
  messageLogged: true;
};

export async function transferChat({
  contactId,
  contactPhone,
  targetUserId,
  targetUserName,
  currentUserName,
  currentUserId,
  stage,
}: TransferChatParams): Promise<TransferChatResult> {
  const supabase = createBrowserSupabase();
  const normalizedTransferredBy =
    typeof currentUserId === "string" && currentUserId.trim() !== ""
      ? currentUserId.trim()
      : null;

  const { data: activeAssignments, error: activeError } = await supabase
    .from("user_active_contacts")
    .select("id")
    .eq("contact_id", contactId)
    .eq("active", true);

  if (activeError) {
    throw new ChatActionError("ASSIGN_LOAD", "Erro ao carregar atribuição atual.");
  }

  if (activeAssignments && activeAssignments.length > 0) {
    const { error: updateError } = await supabase
      .from("user_active_contacts")
      .update({
        user_id: targetUserId,
        transferred_by: normalizedTransferredBy,
        assigned_at: new Date().toISOString(),
      })
      .eq("contact_id", contactId)
      .eq("active", true);

    if (updateError) {
      throw new ChatActionError("ASSIGN_UPDATE", "Erro ao atualizar atribuição atual.");
    }
  } else {
    const { error: insertError } = await supabase.from("user_active_contacts").insert({
      user_id: targetUserId,
      contact_id: contactId,
      assigned_at: new Date().toISOString(),
      active: true,
      transferred_by: normalizedTransferredBy,
    });

    if (insertError) {
      throw new ChatActionError("ASSIGN_INSERT", "Erro ao transferir chat.");
    }
  }

  const transferMessage = `${currentUserName} transferiu a conversa para ${targetUserName}.`;
  const transferTimestamp = new Date().toISOString();
  const normalizedPhone = contactPhone.replace(/\D/g, "");
  const { error: messageError } = await supabase.from("whatsapp_messages").insert({
    phone: normalizedPhone,
    contact_id: contactId,
    direction: "inbound",
    sender_type: currentUserName,
    message_type: "text",
    content: transferMessage,
    stage,
    created_at: transferTimestamp,
  });

  if (messageError) {
    throw new ChatActionError(
      "MESSAGE_INSERT",
      `Chat transferido, mas falhou ao registrar no histórico: ${messageError.message}`
    );
  }

  return {
    messageLogged: true,
  };
}

type FinalizeStageParams = {
  contactId: string;
  contactPhone: string;
  stage: string;
  currentUserName: string;
};

type FinalizeStageResult = {
  sessionPhone: string;
};

type RequestTransferApprovalParams = {
  contactId: string;
  requesterUserId: string;
  requesterUserName: string;
  currentUserId: string;
  currentUserName: string;
  contactPhone: string;
  stage: string;
};

type RejectTransferRequestParams = {
  contactId: string;
  currentUserName: string;
  contactPhone: string;
  stage: string;
};

type RequestTransferParams = {
  contactId: string;
  requesterUserId: string;
  requesterUserName: string;
  contactPhone: string;
  stage: string;
};

export async function finalizeChatStage({
  contactId,
  contactPhone,
  stage,
  currentUserName,
}: FinalizeStageParams): Promise<FinalizeStageResult> {
  const supabase = createBrowserSupabase();
  const normalizedPhone = contactPhone.replace(/\D/g, "");

  const { data: sessionRows, error: selectError } = await supabase
    .from("whatsapp_sessions")
    .select("phone")
    .limit(1000);

  if (selectError) {
    throw new ChatActionError("SESSION_SELECT", "Erro ao consultar stage da conversa.");
  }

  const sessionRow = sessionRows?.find((session: Record<string, unknown>) => {
    const sessionPhone = String(session.phone || "").replace(/\D/g, "");
    return sessionPhone === normalizedPhone;
  });

  if (!sessionRow) {
    throw new ChatActionError("SESSION_NOT_FOUND", "Sessão não encontrada para esta conversa.");
  }

  const { error: updateError } = await supabase
    .from("whatsapp_sessions")
    .update({ stage })
    .eq("phone", sessionRow.phone);

  if (updateError) {
    throw new ChatActionError("SESSION_UPDATE", "Erro ao finalizar conversa.");
  }

  const { error: assignmentReleaseError } = await supabase
    .from("user_active_contacts")
    .update({ active: false })
    .eq("contact_id", contactId)
    .eq("active", true);

  if (assignmentReleaseError) {
    throw new ChatActionError("ASSIGN_RELEASE", "Erro ao remover conversa da sua fila.");
  }

  const finalizeMessage = `${currentUserName} finalizou a conversa.`;
  const finalizeTimestamp = new Date().toISOString();
  const { error: messageError } = await supabase.from("whatsapp_messages").insert({
    phone: normalizedPhone,
    contact_id: contactId,
    direction: "inbound",
    sender_type: currentUserName,
    message_type: "text",
    content: finalizeMessage,
    stage,
    created_at: finalizeTimestamp,
  });

  if (messageError) {
    throw new ChatActionError(
      "MESSAGE_INSERT",
      `Conversa finalizada, mas falhou ao registrar no histórico: ${messageError.message}`
    );
  }

  return {
    sessionPhone: String(sessionRow.phone ?? ""),
  };
}

export async function requestTransfer({
  contactId,
  requesterUserId,
  requesterUserName,
  contactPhone,
  stage,
}: RequestTransferParams) {
  const supabase = createBrowserSupabase();
  const normalizedPhone = contactPhone.replace(/\D/g, "");

  const { data: activeRows, error: activeError } = await supabase
    .from("user_active_contacts")
    .select("id, user_id")
    .eq("contact_id", contactId)
    .eq("active", true)
    .limit(1);

  if (activeError) {
    throw new ChatActionError("ASSIGN_LOAD", "Erro ao verificar responsável atual do chat.");
  }

  const activeRow = activeRows?.[0];
  if (!activeRow) {
    throw new ChatActionError("ASSIGN_REQUEST_NOT_FOUND", "Este chat não está atribuído a ninguém no momento.");
  }

  const currentAssignedUserId = String(activeRow.user_id ?? "").trim();
  if (currentAssignedUserId === requesterUserId) {
    throw new ChatActionError("ASSIGN_REQUEST", "Este chat já está na sua fila.");
  }

  const { error: requestError } = await supabase
    .from("user_active_contacts")
    .update({
      transferred_by: requesterUserId,
      assigned_at: new Date().toISOString(),
    })
    .eq("contact_id", contactId)
    .eq("active", true);

  if (requestError) {
    throw new ChatActionError("ASSIGN_REQUEST", "Erro ao solicitar transferência.");
  }

  const { error: requestMessageError } = await supabase.from("whatsapp_messages").insert({
    phone: normalizedPhone,
    contact_id: contactId,
    direction: "inbound",
    sender_type: requesterUserName,
    message_type: "system",
    content: `${requesterUserName} solicitou transferência da conversa.`,
    stage,
    created_at: new Date().toISOString(),
  });

  if (requestMessageError) {
    throw new ChatActionError(
      "MESSAGE_INSERT",
      `Solicitação enviada, mas falhou ao registrar no histórico: ${requestMessageError.message}`
    );
  }
}

export async function approveTransferRequest({
  contactId,
  requesterUserId,
  requesterUserName,
  currentUserId,
  currentUserName,
  contactPhone,
  stage,
}: RequestTransferApprovalParams) {
  const supabase = createBrowserSupabase();
  const transferResult = await transferChat({
    contactId,
    contactPhone,
    targetUserId: requesterUserId,
    targetUserName: requesterUserName,
    currentUserName,
    currentUserId,
    stage,
  });

  void transferResult;

  const normalizedPhone = contactPhone.replace(/\D/g, "");
  const { error: approveMessageError } = await supabase.from("whatsapp_messages").insert({
    phone: normalizedPhone,
    contact_id: contactId,
    direction: "inbound",
    sender_type: currentUserName,
    message_type: "system",
    content: `${currentUserName} aprovou a solicitação de transferência para ${requesterUserName}.`,
    stage,
    created_at: new Date().toISOString(),
  });

  if (approveMessageError) {
    throw new ChatActionError(
      "MESSAGE_INSERT",
      `Transferência aprovada, mas falhou ao registrar aprovação no histórico: ${approveMessageError.message}`
    );
  }
}

export async function rejectTransferRequest({
  contactId,
  currentUserName,
  contactPhone,
  stage,
}: RejectTransferRequestParams) {
  const supabase = createBrowserSupabase();
  const normalizedPhone = contactPhone.replace(/\D/g, "");

  const { error: clearError } = await supabase
    .from("user_active_contacts")
    .update({ transferred_by: null })
    .eq("contact_id", contactId)
    .eq("active", true);

  if (clearError) {
    throw new ChatActionError("ASSIGN_REQUEST_CLEAR", "Erro ao recusar solicitação de transferência.");
  }

  const { error: rejectMessageError } = await supabase.from("whatsapp_messages").insert({
    phone: normalizedPhone,
    contact_id: contactId,
    direction: "inbound",
    sender_type: currentUserName,
    message_type: "system",
    content: `${currentUserName} recusou a solicitação de transferência.`,
    stage,
    created_at: new Date().toISOString(),
  });

  if (rejectMessageError) {
    throw new ChatActionError(
      "MESSAGE_INSERT",
      `Solicitação recusada, mas falhou ao registrar no histórico: ${rejectMessageError.message}`
    );
  }
}
