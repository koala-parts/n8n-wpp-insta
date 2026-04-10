import {
  Dialog,
  DialogContent,
  DialogDescription,
<<<<<<< HEAD
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";
=======
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
import type { InteractiveMessagePayload } from "./chats-view.helpers";

type ChatsOptionsDialogProps = {
  open: boolean;
  payload: InteractiveMessagePayload | null;
  selectedOptionRowId: string;
  onOpenChange: (open: boolean) => void;
  onSelectOption: (rowId: string) => void;
};

export function ChatsOptionsDialog({
  open,
  payload,
  selectedOptionRowId,
  onOpenChange,
  onSelectOption,
}: ChatsOptionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<<<<<<< HEAD
      <DialogContent className="sm:max-w-lg">
=======
      <DialogContent>
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
        <DialogHeader>
          <DialogTitle>{payload?.buttonText ?? "Ver opções"}</DialogTitle>
          {payload?.description ? (
            <DialogDescription>{payload.description}</DialogDescription>
          ) : null}
        </DialogHeader>

<<<<<<< HEAD
        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {payload ? (
            payload.sections.map((section, sectionIndex) => (
              <div key={`${section.title ?? "section"}-${sectionIndex}`} className="space-y-1.5">
                {section.title ? (
                  <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                    {section.title}
                  </p>
=======
        <div className="space-y-1">
          {payload ? (
            payload.sections.map((section, sectionIndex) => (
              <div key={`${section.title ?? "section"}-${sectionIndex}`}>
                {section.title ? (
                  <p className="text-muted-foreground mb-1 text-xs uppercase">{section.title}</p>
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
                ) : null}

                <div className="space-y-1">
                  {section.options.map((option) => {
                    const isSelected = selectedOptionRowId === option.rowId;

                    return (
                      <button
                        key={option.rowId}
                        type="button"
                        onClick={() => onSelectOption(option.rowId)}
                        className={cn(
<<<<<<< HEAD
                          "hover:bg-muted/60 flex w-full items-center justify-between rounded-md border px-3 py-3 text-left transition-all",
                          isSelected && "border-primary bg-primary/5 shadow-sm"
=======
                          "hover:bg-muted/60 flex w-full items-center justify-between rounded-md px-2 py-3 text-left transition-colors",
                          isSelected && "bg-muted"
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
                        )}
                      >
                        <div>
                          <p className="text-base font-medium">{option.title}</p>
                          {option.description ? (
                            <p className="text-muted-foreground text-xs">{option.description}</p>
                          ) : null}
                        </div>
<<<<<<< HEAD
                        {isSelected ? (
                          <CheckCircle2 className="size-5 text-primary" aria-hidden />
                        ) : (
                          <Circle className="text-muted-foreground size-5" aria-hidden />
                        )}
=======
                        <span
                          className={cn(
                            "border-muted-foreground/50 inline-block size-6 rounded-full border",
                            isSelected && "border-primary"
                          )}
                          aria-hidden
                        />
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
<<<<<<< HEAD
            <div className="text-muted-foreground rounded-md border px-3 py-3 text-sm">
              Nenhuma opção disponível.
            </div>
=======
            <div className="text-muted-foreground text-sm">Nenhuma opção disponível.</div>
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
          )}
        </div>

        {payload?.footerText ? (
          <p className="text-muted-foreground text-xs">{payload.footerText}</p>
        ) : null}
<<<<<<< HEAD
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
=======
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
      </DialogContent>
    </Dialog>
  );
}
