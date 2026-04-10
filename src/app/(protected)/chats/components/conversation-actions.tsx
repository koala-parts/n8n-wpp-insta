import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { getStageLabel, isFinalizedStage } from "./chats-view.helpers";

type ConversationActionsProps = {
  stage: string;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  showOwnerBadge?: boolean;
  canFinalize: boolean;
  canTransfer: boolean;
  canRequestTransfer: boolean;
  hasPendingTransferRequest: boolean;
  finalizing: boolean;
  requestingTransfer: boolean;
  onFinalize: () => void;
  onTransfer: () => void;
  onRequestTransfer: () => void;
};

export function ConversationActions({
  stage,
  assignedUserId,
  assignedUserName,
  showOwnerBadge = false,
  canFinalize,
  canTransfer,
  canRequestTransfer,
  hasPendingTransferRequest,
  finalizing,
  requestingTransfer,
  onFinalize,
  onTransfer,
  onRequestTransfer,
}: ConversationActionsProps) {
  const finalized = isFinalizedStage(stage);
  const ownerBadgeText = assignedUserId
    ? `👤 ${assignedUserName?.trim() || "Usuário"}`
    : "🤖 Bot";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Badge variant={finalized ? "default" : "outline"}>
        {finalized ? "✓ Finalizado" : getStageLabel(stage)}
      </Badge>

      {showOwnerBadge ? <Badge variant="outline">{ownerBadgeText}</Badge> : null}

      {canTransfer ? (
        <Button type="button" variant="outline" size="sm" onClick={onTransfer}>
          <ArrowRightLeft className="size-4" />
          Transferir
        </Button>
      ) : null}

      {canRequestTransfer ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRequestTransfer}
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
            <>
              <UserPlus className="size-4" />
              Assumir conversa
            </>
          )}
        </Button>
      ) : null}

      {canFinalize ? (
        <div className="ml-1 border-l pl-3">
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onFinalize}
            disabled={finalizing || finalized}
          >
            {finalizing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Finalizando...
              </>
            ) : finalized ? (
              <>
                <CheckCircle2 className="size-4" />
                Finalizado
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Finalizar
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

