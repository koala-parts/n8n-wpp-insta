"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AISuggestionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: string[];
  loading: boolean;
  onSelectSuggestion: (suggestion: string) => void;
};

export function AISuggestionsDialog({
  open,
  onOpenChange,
  suggestions,
  loading,
  onSelectSuggestion,
}: AISuggestionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>✨</span> Sugestões de IA
          </DialogTitle>
          <DialogDescription>
            Clique em uma sugestão para usar ou editar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {loading ? (
            <div className="py-8 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
              <p className="mt-2 text-xs text-muted-foreground">
                Gerando sugestões...
              </p>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto w-full justify-start whitespace-normal p-3 text-left hover:bg-primary/10"
                onClick={() => {
                  onSelectSuggestion(suggestion);
                  onOpenChange(false);
                }}
              >
                <span className="text-xs leading-relaxed">{suggestion}</span>
              </Button>
            ))
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Erro ao gerar sugestões. Tente novamente.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
