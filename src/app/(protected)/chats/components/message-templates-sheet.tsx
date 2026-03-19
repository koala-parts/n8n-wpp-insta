"use client";

import { useEffect, useState } from "react";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDatePtBr } from "@/lib/formatters";
import { toast } from "sonner";

type MessageTemplatesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  mode: "quick-insert" | "manage";
  onSelectTemplate?: (content: string) => void;
};

type MessageTemplate = {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt: string | null;
};

export function MessageTemplatesSheet({
  open,
  onOpenChange,
  userId,
  mode,
  onSelectTemplate,
}: MessageTemplatesSheetProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!open || !userId) return;

    let isCancelled = false;

    const loadTemplates = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/message-templates?userId=${encodeURIComponent(userId)}`
        );
        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Erro ao carregar modelos.");
          return;
        }

        if (!isCancelled) {
          setTemplates(Array.isArray(data.templates) ? data.templates : []);
        }
      } catch (error) {
        console.error("Erro ao carregar modelos:", error);
        if (!isCancelled) {
          toast.error("Erro ao carregar modelos.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      isCancelled = true;
    };
  }, [open, userId]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
  };

  const handleSave = async () => {
    const trimmedContent = content.trim();
    const trimmedTitle = title.trim();

    if (!trimmedContent) {
      toast.error("O conteúdo do modelo não pode ficar vazio.");
      return;
    }

    if (!userId) {
      toast.error("Usuário não identificado.");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const response = await fetch("/api/message-templates", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingId,
            userId,
            title: trimmedTitle || null,
            content: trimmedContent,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Erro ao atualizar modelo.");
          return;
        }

        const updated = data.template as MessageTemplate;
        setTemplates((prev) =>
          prev.map((template) => (template.id === updated.id ? updated : template))
        );
        toast.success("Modelo atualizado.");
      } else {
        const response = await fetch("/api/message-templates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            title: trimmedTitle || null,
            content: trimmedContent,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Erro ao criar modelo.");
          return;
        }

        const created = data.template as MessageTemplate;
        setTemplates((prev) => [...prev, created]);
        toast.success("Modelo criado.");
      }

      resetForm();
    } catch (error) {
      console.error("Erro ao salvar modelo:", error);
      toast.error("Erro ao salvar modelo.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingId(template.id);
    setTitle(template.title ?? "");
    setContent(template.content);
  };

  const handleDelete = async (template: MessageTemplate) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este modelo?"
    );
    if (!confirmed) return;

    try {
      setSaving(true);

      const response = await fetch("/api/message-templates", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: template.id,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Erro ao excluir modelo.");
        return;
      }

      setTemplates((prev) => prev.filter((item) => item.id !== template.id));
      if (editingId === template.id) {
        resetForm();
      }

      toast.success("Modelo excluído.");
    } catch (error) {
      console.error("Erro ao excluir modelo:", error);
      toast.error("Erro ao excluir modelo.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSelect = (template: MessageTemplate) => {
    if (mode === "quick-insert" && onSelectTemplate) {
      onSelectTemplate(template.content);
      onOpenChange(false);
      return;
    }

    // no modo "manage" não faz nada especial ao clicar
  };

  const titleLabel =
    mode === "quick-insert" ? "Meus modelos rápidos" : "Modelos de mensagem";

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="flex h-full max-h-screen w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {titleLabel}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Crie mensagens prontas para reutilizar no atendimento. Somente você
            vê e gerencia seus próprios modelos.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs">
            {loading ? (
              <p className="text-muted-foreground">Carregando modelos...</p>
            ) : templates.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhum modelo ainda. Crie mensagens que você usa com frequência
                para agilizar o atendimento.
              </p>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelect(template)}
                  className="group block w-full rounded-md bg-background px-3 py-2 text-left shadow-sm transition hover:bg-accent"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-medium">
                        {template.title || "Sem título"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDatePtBr(template.createdAt)}
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleEdit(template)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent text-[11px] text-muted-foreground hover:border-border hover:bg-muted"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(template)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent text-[11px] text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <p className="line-clamp-3 whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">
                    {template.content}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">
                {editingId ? "Editar modelo" : "Novo modelo"}
              </span>
              {editingId && (
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:underline"
                  onClick={resetForm}
                >
                  Cancelar edição
                </button>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
              placeholder="Título (opcional) — ex: Saudação padrão"
              disabled={saving}
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
              placeholder="Mensagem do modelo. Ex: Olá, tudo bem? Sou do atendimento da Koala Parts, como posso te ajudar?"
              disabled={saving}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !content.trim() || !userId}
              >
                {saving
                  ? editingId
                    ? "Salvando..."
                    : "Criando..."
                  : editingId
                  ? "Salvar alterações"
                  : "Adicionar modelo"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

