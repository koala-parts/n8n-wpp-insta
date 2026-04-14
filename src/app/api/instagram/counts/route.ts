import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerSupabase();

    const { count: allInstagramCount, error: allError } = await supabase
      .from("instagram_conversations")
      .select("*", { count: "exact", head: true });

    const { count: commentsCount, error: commentsError } = await supabase
      .from("instagram_conversations")
      .select("*", { count: "exact", head: true })
      .not("comment", "is", null);

    const { count: pendingCommentsCount, error: pendingError } = await supabase
      .from("instagram_conversations")
      .select("*", { count: "exact", head: true })
      .not("comment", "is", null)
      .eq("stage", "WAITING_TEAM");

    if (allError || commentsError || pendingError) {
      throw allError || commentsError || pendingError;
    }

    return NextResponse.json({ 
      all: allInstagramCount ?? 0,
      comments: commentsCount ?? 0,
      dms: (allInstagramCount ?? 0) - (commentsCount ?? 0),
      pending: pendingCommentsCount ?? 0,
    });
  } catch (error) {
    console.error("Error counting Instagram:", error);
    return NextResponse.json(
      { error: "Failed to count" },
      { status: 500 }
    );
  }
}