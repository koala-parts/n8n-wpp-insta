import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerSupabase();

    const { count: humanCount, error } = await supabase
      .from("instagram_conversations")
      .select("*", { count: "exact", head: true })
      .eq("stage", "HUMAN_ACTIVE");

    if (error) {
      throw error;
    }

    return NextResponse.json({ count: humanCount ?? 0 });
  } catch (error) {
    console.error("Error counting Instagram conversations:", error);
    return NextResponse.json(
      { error: "Failed to count conversations" },
      { status: 500 }
    );
  }
}