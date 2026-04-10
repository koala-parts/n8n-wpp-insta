"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type AiPromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (prompt: string) => Promise<void>;
  loading: boolean;
};

export function AiPromptDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: AiPromptDialogProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      return;
    }
    await onSubmit(prompt);
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>✨</span> Peça ajuda para IA
          </DialogTitle>
          <DialogDescription>
            Descreva o que você quer responder ao cliente
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Ex: Cliente perguntou sobre prazo de entrega"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoFocus
          className="min-h-10"
        />

        <DialogFooter className="gap-2 flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              "Gerar sugestões"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
