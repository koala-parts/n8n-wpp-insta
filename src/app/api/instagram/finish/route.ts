import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userIdInstagram, assignmentId } = body;

    if (!userIdInstagram) {
      return NextResponse.json(
        { error: "userIdInstagram é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    if (assignmentId) {
      const { error: deleteError } = await supabase
        .from("user_active_contacts")
        .update({ active: false })
        .eq("id", assignmentId);

      if (deleteError) {
        throw deleteError;
      }
    }

    const { data: existingConv } = await supabase
      .from("instagram_conversations")
      .select("id, stage")
      .eq("user_id", userIdInstagram)
      .single();

    if (existingConv) {
      const { error: updateError } = await supabase
        .from("instagram_conversations")
        .update({ stage: "resolved" })
        .eq("id", existingConv.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from("instagram_conversations")
        .insert({
          user_id: userIdInstagram,
          stage: "resolved",
        });

      if (insertError) {
        console.error("Erro ao inserir conversa resolved:", insertError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error finishing Instagram conversation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao finalizar conversa" },
      { status: 500 }
    );
  }
}
