"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  PageContainer,
  PageContent,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Send, Loader2, ExternalLink, RefreshCw, MessageSquare, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type InstagramComment = {
  id: string;
  user_name: string;
  stage: string;
  comment: string | null;
  link_url: string | null;
  thumbnail: string | null;
  comment_id: string | null;
};

const STAGES: Record<string, { label: string; color: string; dotColor: string }> = {
  WAITING_TEAM: {
    label: "Pendente",
    color: "bg-red-50 text-red-700 border-red-200",
    dotColor: "bg-red-500",
  },
  HUMAN_ACTIVE: {
    label: "Em atendimento",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400",
  },
  RESOLVED: {
    label: "Finalizado",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
  },
};

function getInitials(name: string) {
  return name.replace("@", "").slice(0, 2).toUpperCase();
}

export default function ComentariosPage() {
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    const res = await fetch("/api/instagram/comments");
    const data = await res.json();
    setComments(data.comments || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchComments();
  };

  const updateStage = async (id: string, newStage: string) => {
    await fetch("/api/instagram/comments/update-stage", {
      method: "PATCH",
      body: JSON.stringify({ id, stage: newStage }),
    });

    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage: newStage } : c))
    );
  };

  const sendReply = async (cardId: string, commentId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);

    await fetch("/api/instagram/comments/reply", {
      method: "POST",
      body: JSON.stringify({ commentId, message: replyText }),
    });

    setReplyText("");
    setReplyingTo(null);
    setSendingReply(false);
    updateStage(cardId, "HUMAN_ACTIVE");
  };

  const getByStage = (stage: string) =>
    comments.filter((c) => c.stage === stage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Carregando comentários...
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <div className="flex items-center justify-between w-full">
            <div>
              <PageTitle>Comentários</PageTitle>
            </div>

          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageContent>
        <div className="flex gap-4 overflow-x-auto pb-6">
          {Object.entries(STAGES).map(([key, stage]) => {
            const items = getByStage(key);
            const isDragOver = dragOverStage === key;

            return (
              <div
                key={key}
                className="w-[420px] flex-shrink-0"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(key);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverStage(null);
                  }
                }}
                onDrop={() => {
                  if (draggedCard) updateStage(draggedCard, key);
                  setDraggedCard(null);
                  setDragOverStage(null);
                }}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg border bg-background/80 backdrop-blur sticky top-0 z-10">
                  <span
                    className={cn("w-2 h-2 rounded-full flex-shrink-0", stage.dotColor)}
                  />
                  <span className="text-sm font-medium flex-1">{stage.label}</span>
                  <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>

                {/* Drop zone */}
                <div
                  className={cn(
                    "space-y-2.5 rounded-xl p-1 transition-colors min-h-[60px]",
                    isDragOver && "bg-muted/60"
                  )}
                >
                  {items.length === 0 ? (
                    <div
                      className={cn(
                        "flex items-center justify-center h-20 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors",
                        isDragOver && "border-primary/30 bg-primary/5"
                      )}
                    >
                      Arraste aqui
                    </div>
                  ) : (
                    items.map((c) => (
                      <CommentCard
                        key={c.id}
                        data={c}
                        isReplying={replyingTo === c.id}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        sendingReply={sendingReply}
                        onReply={() => {
                          setReplyingTo(c.id);
                          setReplyText("");
                        }}
                        onCancelReply={() => setReplyingTo(null)}
                        onSendReply={() => sendReply(c.id, c.comment_id ?? "")}
                        onFinish={() => updateStage(c.id, "RESOLVED")}
                        onDragStart={() => setDraggedCard(c.id)}
                        onDragEnd={() => setDraggedCard(null)}
                        isDragging={draggedCard === c.id}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PageContent>
    </PageContainer>
  );
}

type CardProps = {
  data: InstagramComment;
  isReplying: boolean;
  replyText: string;
  setReplyText: (v: string) => void;
  sendingReply: boolean;
  onReply: () => void;
  onCancelReply: () => void;
  onSendReply: () => void;
  onFinish: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
};

function CommentCard({
  data,
  isReplying,
  replyText,
  setReplyText,
  sendingReply,
  onReply,
  onCancelReply,
  onSendReply,
  onFinish,
  onDragStart,
  onDragEnd,
  isDragging,
}: CardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isReplying) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isReplying]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      onSendReply();
    }
    if (e.key === "Escape") {
      onCancelReply();
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group rounded-2xl border bg-card px-4 py-4 transition-all",
        "cursor-grab active:cursor-grabbing",
        "hover:border-border/80 hover:shadow-sm",
        isDragging && "opacity-40 scale-95"
      )}
    >
      {/* TOP */}
      <div className="flex items-start gap-4">
        {/* THUMB */}
        {data.thumbnail ? (
          <Image
            src={data.thumbnail}
            alt=""
            width={120}
            height={150}
            className="rounded-xl object-cover w-28 h-36 flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
            {getInitials(data.user_name)}
          </div>
        )}

        {/* TEXT */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
          <div className="space-y-2">
            {/* COMMENT FIRST (PRIMARY) */}
            {data.comment && (
              <p className="text-[15px] font-medium text-foreground leading-relaxed line-clamp-4">
                {data.comment}
              </p>
            )}

            {/* USER SECONDARY */}
            <p className="text-xs text-muted-foreground truncate">
              @{data.user_name.replace("@", "")}
            </p>
          </div>

          {/* LINK */}
          {data.link_url && (
            <div className="mt-2">
              <Link
                href={data.link_url}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Ver post
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ACTIONS */}
      {!isReplying && (
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs gap-1.5"
            onClick={onReply}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Responder
          </Button>

          {data.stage !== "RESOLVED" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-emerald-600"
              onClick={onFinish}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finalizar
            </Button>
          )}
        </div>
      )}

      {/* REPLY */}
      {isReplying && (
        <div className="mt-4 pt-4 border-t space-y-2">
          <textarea
            ref={textareaRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua resposta... (⌘↵ para enviar)"
            rows={3}
            className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={onSendReply}
              disabled={sendingReply || !replyText.trim()}
            >
              {sendingReply ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Enviar
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={onCancelReply}
              disabled={sendingReply}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}