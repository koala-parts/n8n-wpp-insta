import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{payload?.buttonText ?? "Ver opções"}</DialogTitle>
          {payload?.description ? (
            <DialogDescription>{payload.description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-1">
          {payload ? (
            payload.sections.map((section, sectionIndex) => (
              <div key={`${section.title ?? "section"}-${sectionIndex}`}>
                {section.title ? (
                  <p className="text-muted-foreground mb-1 text-xs uppercase">{section.title}</p>
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
                          "hover:bg-muted/60 flex w-full items-center justify-between rounded-md px-2 py-3 text-left transition-colors",
                          isSelected && "bg-muted"
                        )}
                      >
                        <div>
                          <p className="text-base font-medium">{option.title}</p>
                          {option.description ? (
                            <p className="text-muted-foreground text-xs">{option.description}</p>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            "border-muted-foreground/50 inline-block size-6 rounded-full border",
                            isSelected && "border-primary"
                          )}
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground text-sm">Nenhuma opção disponível.</div>
          )}
        </div>

        {payload?.footerText ? (
          <p className="text-muted-foreground text-xs">{payload.footerText}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
