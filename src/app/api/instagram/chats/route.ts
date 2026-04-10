import { NextRequest, NextResponse } from "next/server";

const INSTAGRAM_API_VERSION = "v25.0";
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";

type InstagramConversationsResponse = {
  data: Array<{
    id: string;
    conversation_id: string;
    participants: {
      data: Array<{
        username: string;
        id: string;
      }>;
    };
  }>;
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
};

async function getInstagramConversations(
  accessToken: string,
  after?: string
): Promise<InstagramConversationsResponse> {
  const url = new URL(
    `${INSTAGRAM_GRAPH_URL}/${INSTAGRAM_API_VERSION}/me/conversations`
  );
  url.searchParams.set("platform", "instagram");
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("limit", "25");

  if (after) {
    url.searchParams.set("after", after);
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Instagram API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.INSTAGRAM_ACESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Token de acesso do Instagram não configurado" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const after = searchParams.get("after") || undefined;

    const data = await getInstagramConversations(accessToken, after);

    const conversations = data.data.map((conv) => ({
      id: conv.id,
      conversationId: conv.id,
      participants: conv.participants?.data || [],
    }));

    const hasNext = Boolean(data.paging?.next || data.paging?.cursors?.after);
    const nextCursor = data.paging?.cursors?.after;

    return NextResponse.json({
      conversations,
      hasNext,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching Instagram conversations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar conversas" },
      { status: 500 }
    );
  }
}
