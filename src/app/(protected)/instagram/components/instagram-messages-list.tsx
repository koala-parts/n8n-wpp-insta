import { type RefObject, useState } from "react";
import { MessageSquareOff, Instagram, Play, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import type { InstagramChatMessage } from "@/data/instagram/types";
import { formatDatePtBr } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { senderLabel } from "@/app/(protected)/chats/components/chats-view.helpers";

type InstagramMessagesListProps = {
  activeMessages: InstagramChatMessage[];
  teamNames: ReadonlySet<string>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
};

function getImageUrlFromMessageContent(
  content: string | null | undefined
): string | null {
  const trimmedContent = (content ?? "").trim();
  if (!trimmedContent) return null;

  try {
    const parsedUrl = new URL(trimmedContent);
    const pathname = parsedUrl.pathname.toLowerCase();
    const isImagePath = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(
      pathname
    );
    return isImagePath ? trimmedContent : null;
  } catch {
    return null;
  }
}

function StoryReplyBadge({ message, storyLink, onOpenStory }: { message: string; storyLink?: string | null; onOpenStory?: (link: string) => void }) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => storyLink && onOpenStory?.(storyLink)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-dashed border-rose-400 bg-rose-50 p-2 text-rose-600 transition-colors hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-500/50 dark:hover:bg-rose-950/50",
          storyLink && "cursor-pointer"
        )}
      >
        <Instagram className="h-4 w-4" />
        <span className="text-xs font-medium">Resposta a Story</span>
        {storyLink && <ExternalLink className="ml-auto h-3 w-3" />}
      </button>
      <p className="whitespace-pre-wrap break-words">{message}</p>
    </div>
  );
}

function StoryMentionBadge({ message, storyLink, onOpenStory }: { message?: string | null; storyLink?: string | null; onOpenStory?: (link: string) => void }) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => storyLink && onOpenStory?.(storyLink)}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-rose-400 bg-rose-50 p-4 text-rose-600 transition-colors hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-500/50 dark:hover:bg-rose-950/50",
          storyLink && "cursor-pointer"
        )}
      >
        <Instagram className="h-8 w-8" />
        <div className="text-center">
          <p className="font-medium">Menção a Story</p>
          <p className="text-xs opacity-75">Clique para ver o story</p>
        </div>
        {storyLink && <ExternalLink className="h-4 w-4 mt-1" />}
      </button>
      {message && (
        <p className="whitespace-pre-wrap break-words">{message}</p>
      )}
    </div>
  );
}

function MediaBadge() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-purple-400 bg-purple-50 p-4 text-purple-600 dark:bg-purple-950/30 dark:border-purple-500/50">
      <Play className="h-8 w-8 fill-current" />
      <div className="text-center">
        <p className="font-medium">Post / Reel / Vídeo</p>
        <p className="text-xs opacity-75">Mídia enviada</p>
      </div>
    </div>
  );
}

function ImageMessage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="space-y-2">
      <img src={src} alt={alt} className="h-auto max-h-80 w-full rounded-md object-cover" />
    </div>
  );
}

export function InstagramMessagesList({
  activeMessages,
  teamNames,
  messagesContainerRef,
}: InstagramMessagesListProps) {
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [storyDialogLink, setStoryDialogLink] = useState<string | null>(null);

  const handleOpenStory = (link: string) => {
    setStoryDialogLink(link);
    setStoryDialogOpen(true);
  };

  return (
    <>
      <div
        ref={messagesContainerRef}
        className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto bg-gradient-to-b from-background to-muted/20 px-4 py-4 pb-14 md:px-6"
      >
        <div className="flex justify-center py-2 text-xs text-muted-foreground">
          Apenas as mensagens mais recentes estão disponíveis (limitação do Instagram)
        </div>

        {activeMessages.length > 0 ? (
          activeMessages.map((message) => {
            const normalizedContent = (message.content ?? "").trim();
            const isStoryMention = message.messageType === "story_mention";
            const isEmptyContent = normalizedContent === "[sem conteúdo]";
            const isStoryReply = message.messageType === "story_reply";
            const imageUrlFromContent = getImageUrlFromMessageContent(
              message.content
            );
            const senderValue = (
              message.senderName ?? message.senderType ?? ""
            ).trim();
            const normalizedSender = senderValue.toLowerCase();
            const isOwnMessage =
              normalizedSender === "bot" ||
              (normalizedSender && teamNames.has(normalizedSender));

            return (
              <div
                key={message.id}
                className={cn(
                  "flex min-w-0",
                  isOwnMessage ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "min-w-0 space-y-2.5 overflow-hidden rounded-xl border px-4 py-3 text-sm leading-normal shadow-sm max-w-[85%]",
                    isOwnMessage
                      ? "border-purple-500/40 bg-purple-600 text-white"
                      : "border-border bg-background"
                  )}
                >
                  {isStoryReply ? (
                    <StoryReplyBadge
                      message={message.content ?? ""}
                      storyLink={message.storyLink}
                      onOpenStory={handleOpenStory}
                    />
                  ) : isStoryMention ? (
                    <StoryMentionBadge
                      message={message.content}
                      storyLink={message.storyLink}
                      onOpenStory={handleOpenStory}
                    />
                  ) : isEmptyContent || message.content?.startsWith("📎") ? (
                    <MediaBadge />
                  ) : imageUrlFromContent ||
                    message.messageType === "image" ? (
                    <ImageMessage
                      src={imageUrlFromContent ?? message.content ?? ""}
                      alt="Imagem da conversa"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">
                      {message.content ?? "[sem conteúdo]"}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] opacity-80">
                    <span>{senderLabel(message.senderType, message.senderName)}</span>
                    <span>•</span>
                    <span>{formatDatePtBr(message.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center text-sm">
            <MessageSquareOff className="size-5" />
            <span>Este contato ainda não possui mensagens.</span>
          </div>
        )}
      </div>

      <Dialog open={storyDialogOpen} onOpenChange={setStoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Story / Reel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {storyDialogLink ? (
              <iframe
                src={storyDialogLink}
                className="h-[60vh] w-full rounded-lg border"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <p className="text-center text-muted-foreground">Link não disponível</p>
            )}
            <div className="flex justify-end">
              <a
                href={storyDialogLink || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir no Instagram
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
