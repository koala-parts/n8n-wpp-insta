import { NextRequest, NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { id, stage } = await request.json();

    if (!id || !stage) {
      return NextResponse.json(
        { error: "ID e stage são obrigatória" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("instagram_conversations")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating stage:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar estágio" },
      { status: 500 }
    );
  }
}