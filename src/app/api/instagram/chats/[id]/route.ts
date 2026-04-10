import { NextRequest, NextResponse } from "next/server";

const INSTAGRAM_API_VERSION = "v25.0";
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";

type InstagramUser = {
  id: string;
  username: string;
  name?: string;
};

type InstagramMessage = {
  id: string;
  created_time: string;
  from: InstagramUser;
  to: { data: InstagramUser[] };
  message?: string;
  media_url?: string;
  media_type?: string;
  story?: { url: string; reply?: string };
};

type InstagramMessagesResponse = {
  data: InstagramMessage[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  };
};

type InstagramConversationResponse = {
  id: string;
  participants: Array<{
    username: string;
    id: string;
    name?: string;
    profile_picture_url?: string;
  }>;
  messages?: InstagramMessagesResponse;
};

async function getConversationDetails(
  conversationId: string,
  accessToken: string,
  before?: string
): Promise<InstagramConversationResponse> {
  const fields = [
    "id",
    "participants{username,id,profile_picture_url,name}",
    "messages{message,created_time,from{id,username},to{id,username},media_url,media_type,story}",
  ].join(",");

  const url = new URL(
    `${INSTAGRAM_GRAPH_URL}/${INSTAGRAM_API_VERSION}/${conversationId}`
  );
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("limit", "50");

  if (before) {
    url.searchParams.set("before", before);
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Instagram API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const accessToken = process.env.INSTAGRAM_ACESS_TOKEN;
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before") || undefined;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Token de acesso do Instagram não configurado" },
        { status: 500 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: "ID da conversa não fornecido" },
        { status: 400 }
      );
    }

    const data = await getConversationDetails(conversationId, accessToken, before);

    if (!data.id) {
      return NextResponse.json(
        { error: "Conversa não encontrada" },
        { status: 404 }
      );
    }

    const messages = data.messages?.data || [];

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      createdTime: msg.created_time,
      from: msg.from,
      to: msg.to,
      message: msg.message || null,
      mediaUrl: msg.media_url || null,
      mediaType: msg.media_type || null,
      story: msg.story || null,
      direction: msg.from.username === "me" ? "outbound" : "inbound",
    }));

    const hasNext = Boolean(
      data.messages?.paging?.cursors?.before ||
      data.messages?.paging?.next
    );
    const nextCursor = data.messages?.paging?.cursors?.before;

    return NextResponse.json({
      conversation: {
        id: data.id,
        participants: data.participants || [],
      },
      messages: formattedMessages,
      hasNext,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching Instagram conversation details:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar detalhes da conversa" },
      { status: 500 }
    );
  }
}
