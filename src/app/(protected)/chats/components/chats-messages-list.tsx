import type { RefObject } from "react";
import { ExternalLink, List, MessageSquareOff, ShoppingCart } from "lucide-react";

import type { ChatMessage } from "@/data/get-messages";
import { formatDatePtBr } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  type InteractiveMessagePayload,
  parseCardsMessagePayload,
  parseInteractiveMessagePayload,
  parseQuickReplyMessagePayload,
  renderAsteriskBoldText,
  senderLabel,
} from "./chats-view.helpers";

type ChatsMessagesListProps = {
  activeMessages: ChatMessage[];
  teamNames: ReadonlySet<string>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  onOpenInteractiveOptions: (payload: InteractiveMessagePayload) => void;
};

function getImageUrlFromMessageContent(content: string | null | undefined): string | null {
  const trimmedContent = (content ?? "").trim();

  if (!trimmedContent) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedContent);
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();
    const isImagePath = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(pathname);

    const isWhatsAppProfilePhoto =
      hostname === "pps.whatsapp.net" && pathname.includes("/t61.24694-24/");

    if (isWhatsAppProfilePhoto) {
      return null;
    }

    return isImagePath ? trimmedContent : null;
  } catch {
    return null;
  }
}

export function ChatsMessagesList({
  activeMessages,
  teamNames,
  messagesContainerRef,
  onOpenInteractiveOptions,
}: ChatsMessagesListProps) {
  return (
    <div
      ref={messagesContainerRef}
      className="min-h-0 min-w-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto bg-gradient-to-b from-background to-muted/20 px-5 py-6 pb-14 md:px-8"
    >
      {activeMessages.length > 0 ? (
        activeMessages.map((message) => {
          const normalizedContent = (message.content ?? "").trim().toLowerCase();
          const isSystemEvent =
            message.messageType === "system" ||
            normalizedContent.includes("transferiu para") ||
            normalizedContent.includes("transferiu a conversa para") ||
            normalizedContent.includes("finalizou a conversa") ||
            normalizedContent.includes("solicitou transferência da conversa") ||
            normalizedContent.includes("aprovou a solicitação de transferência") ||
            normalizedContent.includes("recusou a solicitação de transferência");

          if (isSystemEvent) {
            return (
              <div key={message.id} className="flex justify-center">
                <div className="text-muted-foreground bg-muted rounded-md px-3 py-1 text-xs">
                  <span>{message.content ?? "Conversa transferida."}</span>
                </div>
              </div>
            );
          }

          const interactivePayload = parseInteractiveMessagePayload(message.content);
          const quickReplyPayload = parseQuickReplyMessagePayload(message.content);
          const cardsPayload = parseCardsMessagePayload(message.content);
          const imageUrlFromContent = getImageUrlFromMessageContent(message.content);
          const senderValue = (message.senderName ?? message.senderType ?? "").trim();
          const normalizedSender = senderValue.toLowerCase();
          const isOwnMessage =
            normalizedSender === "bot" ||
            (normalizedSender && teamNames.has(normalizedSender));

          return (
            <div
              key={message.id}
              className={cn("flex min-w-0", isOwnMessage ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "min-w-0 space-y-2.5 overflow-hidden rounded-xl border px-4 py-3 text-sm leading-normal shadow-sm",
                  cardsPayload ? "max-w-[96%] md:max-w-[92%]" : "max-w-[70%] md:max-w-[54%]",
                  isOwnMessage
                    ? "border-primary/40 bg-primary text-primary-foreground"
                    : "border-border bg-background"
                )}
              >
                {quickReplyPayload ? (
                  <div className="space-y-4">
                    <p className="wrap-break-word whitespace-pre-wrap">
                      {renderAsteriskBoldText(quickReplyPayload.message)}
                    </p>

                    <div
                      className={cn(
                        "overflow-hidden rounded-md border",
                        isOwnMessage ? "border-primary-foreground/25" : "border-border"
                      )}
                    >
                      {quickReplyPayload.buttons.map((button, index) => (
                        <button
                          key={button.buttonId}
                          type="button"
                          className={cn(
                            "flex w-full items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
                            index > 0 &&
                              (isOwnMessage
                                ? "border-primary-foreground/25 border-t"
                                : "border-border border-t"),
                            isOwnMessage
                              ? "text-primary-foreground hover:bg-primary-foreground/10"
                              : "text-emerald-600 hover:bg-muted/60"
                          )}
                        >
                          <span aria-hidden>↩</span>
                          <span>{button.buttonText.displayText}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : interactivePayload ? (
                  <div className="space-y-3">
                    {interactivePayload.title ? (
                      <p className="font-medium">{interactivePayload.title}</p>
                    ) : null}

                    {interactivePayload.description ? (
                      <p className="wrap-break-word whitespace-pre-wrap">
                        {interactivePayload.description}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onOpenInteractiveOptions(interactivePayload)}
                      className={cn(
                        "hover:bg-background/80 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                        isOwnMessage ? "bg-primary-foreground/10" : "bg-background"
                      )}
                    >
                      <List className="size-4" />
                      {interactivePayload.buttonText ?? "Ver opções"}
                    </button>

                    {interactivePayload.footerText ? (
                      <p className="text-xs opacity-80">{interactivePayload.footerText}</p>
                    ) : null}
                  </div>
                ) : cardsPayload ? (
                  <div className="space-y-3">
                    {cardsPayload.text ? (
                      <p className="wrap-break-word whitespace-pre-wrap">{cardsPayload.text}</p>
                    ) : null}

                    <div className="w-full max-w-full gap-2 overflow-x-auto pb-1 [display:flex]">
                      {cardsPayload.cards.map((card, index) => (
                        <article
                          key={`${message.id}-card-${index}`}
                          className={cn(
                            "w-62.5 shrink-0 overflow-hidden rounded-lg border",
                            isOwnMessage
                              ? "border-primary-foreground/20 bg-primary-foreground/8"
                              : "border-border bg-background"
                          )}
                        >
                          {card.imageUrl ? (
                            <img
                              src={card.imageUrl}
                              alt={card.message || "Imagem do produto"}
                              className="h-44 w-full object-cover"
                            />
                          ) : null}

                          <div className="space-y-3 p-3">
                            <p className="line-clamp-2 text-base font-medium leading-snug">
                              {card.message || "Sem descrição"}
                            </p>

                            {card.buttonUrl ? (
                              <a
                                href={card.buttonUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className={cn(
                                  "flex items-center gap-2 text-base font-semibold transition-opacity hover:opacity-80",
                                  isOwnMessage ? "text-primary-foreground" : "text-emerald-600"
                                )}
                              >
                                <ExternalLink className="size-4" />
                                <ShoppingCart className="size-4" />
                                <span>{card.buttonText ?? "Comprar"}</span>
                              </a>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : imageUrlFromContent || message.messageType === "image" ? (
                  <div className="space-y-2">
                    <img
                      src={imageUrlFromContent ?? ""}
                      alt="Imagem da conversa"
                      className="h-auto max-h-90 w-full rounded-md object-cover"
                    />

                    {!imageUrlFromContent ? (
                      <p className="text-xs opacity-80">[imagem sem URL]</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="wrap-break-word whitespace-pre-wrap">
                    {message.content ??
                      (message.messageType === "image" ? "[imagem]" : "[sem conteúdo]")}
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
          <span className="text-xs">Envie a primeira mensagem para iniciar o atendimento.</span>
        </div>
      )}
    </div>
  );
}
