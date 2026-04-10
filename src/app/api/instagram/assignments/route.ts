import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdInstagram = searchParams.get("userIdInstagram");

    if (!userIdInstagram) {
      return NextResponse.json(
        { error: "userIdInstagram é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("user_active_contacts")
      .select(
        "id, user_id, assigned_at, active, user_id_instagram, users!user_active_contacts_user_id_fkey(id, name)"
      )
      .eq("user_id_instagram", userIdInstagram)
      .eq("active", true)
      .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json({ assignments: data ?? [] });
  } catch (error) {
    console.error("Error fetching Instagram assignments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar atribuições" },
      { status: 500 }
    );
  }
}
