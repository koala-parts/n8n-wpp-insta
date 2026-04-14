import { NextRequest, NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase";

const INSTAGRAM_API_VERSION = "v25.0";
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { commentId, message } = await request.json();

    if (!commentId || !message) {
      return NextResponse.json(
        { error: "commentId e message são obrigatórios" },
        { status: 400 }
      );
    }

    const accessToken = process.env.INSTAGRAM_ACESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Token de acesso do Instagram não configurado" },
        { status: 500 }
      );
    }

    const url = `${INSTAGRAM_GRAPH_URL}/${INSTAGRAM_API_VERSION}/${commentId}/replies`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Instagram API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error replying to comment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao responder comentário" },
      { status: 500 }
    );
  }
}