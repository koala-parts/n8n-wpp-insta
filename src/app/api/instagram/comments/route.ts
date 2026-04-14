import { NextRequest, NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("instagram_conversations")
      .select("*")
      .not("comment", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ comments: data });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar comentários" },
      { status: 500 }
    );
  }
}