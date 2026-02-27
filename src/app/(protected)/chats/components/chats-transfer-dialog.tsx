import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { TransferUser } from "@/hooks/use-chat-team";

type ChatsTransferDialogProps = {
  open: boolean;
  activeContactName?: string;
  loadingUsers: boolean;
  transferUsers: TransferUser[];
  selectedUserId: string;
  transferring: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (userId: string) => void;
  onTransfer: () => void;
};

export function ChatsTransferDialog({
  open,
  activeContactName,
  loadingUsers,
  transferUsers,
  selectedUserId,
  transferring,
  onOpenChange,
  onSelectUser,
  onTransfer,
}: ChatsTransferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir chat</DialogTitle>
          <DialogDescription>
            Selecione um usuário para transferir o chat de {activeContactName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {loadingUsers ? (
            <div className="text-muted-foreground text-sm">Carregando usuários...</div>
          ) : transferUsers.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              Nenhum usuário elegível encontrado.
            </div>
          ) : (
            transferUsers.map((user) => {
              const isSelected = selectedUserId === user.id;

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onSelectUser(user.id)}
                  className={cn(
                    "hover:bg-muted/60 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors",
                    isSelected && "bg-muted border-primary"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                  </div>
                  <Badge variant="outline">{user.role}</Badge>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onTransfer}
            disabled={loadingUsers || transferring || !selectedUserId}
          >
            {transferring ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Transferindo...
              </>
            ) : (
              "Transferir para usuário"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
