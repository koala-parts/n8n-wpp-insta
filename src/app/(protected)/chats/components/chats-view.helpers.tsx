import { type ReactNode } from "react";

export type InteractiveOption = {
  title: string;
  description: string;
  rowId: string;
};

export type InteractiveSection = {
  title: string | null;
  options: InteractiveOption[];
};

export type InteractiveMessagePayload = {
  description: string | null;
  footerText: string | null;
  title: string | null;
  buttonText: string | null;
  sections: InteractiveSection[];
};

type QuickReplyButton = {
  buttonId: string;
  type: number;
  buttonText: {
    displayText: string;
  };
};

type QuickReplyMessagePayload = {
  imageUrl: string | null;
  videoUrl: string | null;
  message: string;
  buttons: QuickReplyButton[];
};

export type CardsMessageCard = {
  imageUrl: string | null;
  message: string;
  buttonText: string | null;
  buttonUrl: string | null;
};

export type CardsMessagePayload = {
  text: string | null;
  cards: CardsMessageCard[];
};

export const FINALIZED_STAGE = "finalizado";

const STAGE_LABELS: Record<string, string> = {
  welcome: "Boas-vindas",
  menu: "Menu principal",
  conversacao_ia: "Conversa com IA",
  identificacao_veiculo: "Identificação do veículo",
  escolha_categoria: "Escolha de categoria",
  acompanhar_pedido: "Acompanhar pedido",
  aguardando_numero_pedido: "Aguardando número do pedido",
  pagamentos_menu: "Menu de pagamentos",
  suporte_menu: "Menu de suporte",
  finalizado: "Finalizado",
  humano: "Atendimento humano",
  order_submenu: "Submenu de pedidos",
  marketplace: "Marketplace",
  troca: "Troca",
  devolucao: "Devolução",
  recebi_errado: "Recebi produto errado",
  cancelamento: "Cancelamento",
  status: "Status do pedido",
  suporte_garantia: "Suporte de garantia",
  conversacao_ia_suporte: "Conversa com IA (suporte)",
};

export function parseInteractiveMessagePayload(content: string | null) {
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as Partial<InteractiveMessagePayload>;
    if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      return null;
    }

    const sections = parsed.sections
      .map((section) => {
        const options = Array.isArray(section.options)
          ? section.options
              .filter((option) => typeof option?.title === "string")
              .map((option) => ({
                title: option.title,
                description:
                  typeof option.description === "string" ? option.description : "",
                rowId: typeof option.rowId === "string" ? option.rowId : option.title,
              }))
          : [];

        return {
          title: typeof section.title === "string" ? section.title : null,
          options,
        };
      })
      .filter((section) => section.options.length > 0);

    if (sections.length === 0) return null;

    return {
      description: typeof parsed.description === "string" ? parsed.description : null,
      footerText: typeof parsed.footerText === "string" ? parsed.footerText : null,
      title: typeof parsed.title === "string" ? parsed.title : null,
      buttonText: typeof parsed.buttonText === "string" ? parsed.buttonText : "Ver opções",
      sections,
    } as InteractiveMessagePayload;
  } catch {
    return null;
  }
}

export function parseQuickReplyMessagePayload(content: string | null) {
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as Partial<QuickReplyMessagePayload>;
    if (typeof parsed.message !== "string" || !Array.isArray(parsed.buttons)) {
      return null;
    }

    const buttons = parsed.buttons
      .filter((button) => typeof button.buttonText?.displayText === "string")
      .map((button) => ({
        buttonId: typeof button.buttonId === "string" ? button.buttonId : button.buttonText.displayText,
        type: typeof button.type === "number" ? button.type : 1,
        buttonText: {
          displayText: button.buttonText.displayText,
        },
      }));

    if (buttons.length === 0) return null;

    return {
      imageUrl: typeof parsed.imageUrl === "string" ? parsed.imageUrl : null,
      videoUrl: typeof parsed.videoUrl === "string" ? parsed.videoUrl : null,
      message: parsed.message,
      buttons,
    } as QuickReplyMessagePayload;
  } catch {
    return null;
  }
}

export function parseCardsMessagePayload(content: string | null) {
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as {
      text?: unknown;
      cards?: Array<{
        message?: unknown;
        header?: {
          image?: {
            imageUrl?: unknown;
          };
        };
        hydratedButtons?: Array<{
          urlButton?: {
            displayText?: unknown;
            url?: unknown;
          };
        }>;
      }>;
    };

    if (!Array.isArray(parsed.cards) || parsed.cards.length === 0) {
      return null;
    }

    const cards = parsed.cards
      .map((card) => {
        const firstUrlButton = Array.isArray(card.hydratedButtons)
          ? card.hydratedButtons.find((button) =>
              Boolean(button?.urlButton && typeof button.urlButton.url === "string")
            )
          : undefined;

        return {
          imageUrl:
            typeof card.header?.image?.imageUrl === "string" && card.header.image.imageUrl.trim()
              ? card.header.image.imageUrl
              : null,
          message: typeof card.message === "string" ? card.message : "",
          buttonText:
            typeof firstUrlButton?.urlButton?.displayText === "string" &&
            firstUrlButton.urlButton.displayText.trim()
              ? firstUrlButton.urlButton.displayText
              : null,
          buttonUrl:
            typeof firstUrlButton?.urlButton?.url === "string" &&
            firstUrlButton.urlButton.url.trim()
              ? firstUrlButton.urlButton.url
              : null,
        };
      })
      .filter((card) => card.imageUrl || card.message || card.buttonUrl);

    if (cards.length === 0) {
      return null;
    }

    return {
      text: typeof parsed.text === "string" && parsed.text.trim() ? parsed.text : null,
      cards,
    } as CardsMessagePayload;
  } catch {
    return null;
  }
}

export function renderAsteriskBoldText(text: string): ReactNode {
  const parts = text.split(/(\*[^*]+\*)/g);

  return parts.map((part, index) => {
    const isBold = part.startsWith("*") && part.endsWith("*") && part.length > 1;
    if (!isBold) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return <strong key={`${part}-${index}`}>{part.slice(1, -1)}</strong>;
  });
}

export function getStoredUserName() {
  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) return "";
    const parsed = JSON.parse(userRaw) as { name?: string };
    return typeof parsed.name === "string" ? parsed.name : "";
  } catch {
    return "";
  }
}

export function getStoredUserId() {
  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) return "";
    const parsed = JSON.parse(userRaw) as { id?: string };
    return typeof parsed.id === "string" ? parsed.id.trim() : "";
  } catch {
    return "";
  }
}

export function senderLabel(senderType: string, senderName?: string) {
  const name = senderName?.trim();
  const type = senderType?.trim();
  if (name && name !== "-") return name;
  if (type === "bot" || type === "Bot") return "🤖 Bot";
  if (type === "user" || type === "User") return "👤 Cliente";
  return type || "-";
}

export function isFinalizedStage(stage: string | null | undefined) {
  const normalized = (stage ?? "").trim().toLowerCase();
  return normalized === "finalizado" || normalized === "finalizada";
}

export function getStageLabel(stage: string | null | undefined) {
  if (!stage || stage.trim() === "" || stage === "-") return "-";

  const normalized = stage.trim().toLowerCase();
  if (isFinalizedStage(normalized)) return "Finalizado";

  const mappedLabel = STAGE_LABELS[normalized];
  if (mappedLabel) return mappedLabel;

  return normalized
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}
