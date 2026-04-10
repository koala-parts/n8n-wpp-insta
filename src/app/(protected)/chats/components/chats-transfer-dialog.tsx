<<<<<<< HEAD
import { CheckCircle2, Loader2, UserRoundSearch, Users } from "lucide-react";
=======
import { Loader2 } from "lucide-react";
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218

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
<<<<<<< HEAD
      <DialogContent className="sm:max-w-lg">
=======
      <DialogContent>
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
        <DialogHeader>
          <DialogTitle>Transferir chat</DialogTitle>
          <DialogDescription>
            Selecione um usuário para transferir o chat de {activeContactName}.
          </DialogDescription>
        </DialogHeader>

<<<<<<< HEAD
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {loadingUsers ? (
            <div className="text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-3 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Carregando usuários...
            </div>
          ) : transferUsers.length === 0 ? (
            <div className="text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-3 text-sm">
              <UserRoundSearch className="size-4" />
=======
        <div className="space-y-2">
          {loadingUsers ? (
            <div className="text-muted-foreground text-sm">Carregando usuários...</div>
          ) : transferUsers.length === 0 ? (
            <div className="text-muted-foreground text-sm">
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
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
<<<<<<< HEAD
                    "hover:bg-muted/60 flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left transition-all",
                    isSelected && "border-primary bg-primary/5 shadow-sm"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium tracking-tight">{user.name}</p>
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{user.role}</Badge>
                    {isSelected ? <CheckCircle2 className="size-4 text-primary" /> : null}
                  </div>
=======
                    "hover:bg-muted/60 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors",
                    isSelected && "bg-muted border-primary"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                  </div>
                  <Badge variant="outline">{user.role}</Badge>
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
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
<<<<<<< HEAD
              <>
                <Users className="size-4" />
                Transferir para usuário
              </>
=======
              "Transferir para usuário"
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
