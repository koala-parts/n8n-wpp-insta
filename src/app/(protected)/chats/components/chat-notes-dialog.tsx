"use client";

import { useEffect, useState } from "react";
import { Pencil, StickyNote, Trash2 } from "lucide-react";
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

type ChatNotesDialogProps = {
  contactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  currentUserName: string;
};

type ChatNote = {
  id: string;
  contactId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string | null;
};

export function ChatNotesDialog({
  contactId,
  open,
  onOpenChange,
  currentUserId,
  currentUserName,
}: ChatNotesDialogProps) {
  const [notes, setNotes] = useState<ChatNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!open) return;

    let isCancelled = false;

    const loadNotes = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/chat-notes?contactId=${encodeURIComponent(contactId)}`
        );
        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Erro ao carregar anotações.");
          return;
        }

        if (!isCancelled) {
          setNotes(Array.isArray(data.notes) ? data.notes : []);
        }
      } catch (error) {
        console.error("Erro ao carregar anotações:", error);
        if (!isCancelled) {
          toast.error("Erro ao carregar anotações.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadNotes();

    return () => {
      isCancelled = true;
    };
  }, [open, contactId]);

  const resetForm = () => {
    setEditingId(null);
    setContent("");
  };

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Digite alguma coisa na anotação.");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const response = await fetch("/api/chat-notes", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingId,
            content: trimmed,
            authorId: currentUserId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Erro ao atualizar anotação.");
          return;
        }

        const updated = data.note as ChatNote;
        setNotes((prev) =>
          prev.map((note) => (note.id === updated.id ? updated : note))
        );
        toast.success("Anotação atualizada.");
      } else {
        const response = await fetch("/api/chat-notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contactId,
            content: trimmed,
            authorId: currentUserId,
            authorName: currentUserName,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Erro ao criar anotação.");
          return;
        }

        const created = data.note as ChatNote;
        setNotes((prev) => [...prev, created]);
        toast.success("Anotação criada.");
      }

      resetForm();
    } catch (error) {
      console.error("Erro ao salvar anotação:", error);
      toast.error("Erro ao salvar anotação.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (note: ChatNote) => {
    if (note.authorId !== currentUserId) return;
    setEditingId(note.id);
    setContent(note.content);
  };

  const handleDelete = async (note: ChatNote) => {
    if (note.authorId !== currentUserId) return;

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta anotação?"
    );
    if (!confirmed) return;

    try {
      setSaving(true);

      const response = await fetch("/api/chat-notes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: note.id,
          authorId: currentUserId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Erro ao excluir anotação.");
        return;
      }

      setNotes((prev) => prev.filter((item) => item.id !== note.id));
      if (editingId === note.id) {
        resetForm();
      }

      toast.success("Anotação excluída.");
    } catch (error) {
      console.error("Erro ao excluir anotação:", error);
      toast.error("Erro ao excluir anotação.");
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

  const canWrite = Boolean(currentUserId && currentUserName);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="flex h-full max-h-screen w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-4 w-4" />
            Anotações internas
          </SheetTitle>
          <SheetDescription className="text-xs">
            Use este espaço para registrar observações internas sobre a
            conversa. Todos do time veem as anotações, mas apenas o autor pode
            editar ou excluir a própria.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs">
            {loading ? (
              <p className="text-muted-foreground">Carregando anotações...</p>
            ) : notes.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhuma anotação ainda. Comece registrando um contexto rápido
                sobre este atendimento.
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="group rounded-md bg-background px-3 py-2 shadow-sm"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-[11px] font-medium">
                        {note.authorName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDatePtBr(note.createdAt)}
                      </span>
                      {note.updatedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          • editada
                        </span>
                      )}
                    </div>

                    {note.authorId === currentUserId && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(note)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent text-[11px] text-muted-foreground hover:border-border hover:bg-muted"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent text-[11px] text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-[12px] leading-relaxed">
                    {note.content}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">
                {editingId ? "Editar anotação" : "Nova anotação"}
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
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
              placeholder={
                canWrite
                  ? "Registre aqui observações internas que ajudem outros atendentes a entender o contexto desta conversa."
                  : "Para escrever anotações internas é necessário estar autenticado."
              }
              disabled={saving || !canWrite}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !canWrite || !content.trim()}
              >
                {saving
                  ? editingId
                    ? "Salvando..."
                    : "Criando..."
                  : editingId
                  ? "Salvar alterações"
                  : "Adicionar anotação"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

