import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("user_active_contacts")
      .select("id, user_id, user_id_instagram, assigned_at, users!user_active_contacts_user_id_fkey(name)")
      .eq("active", true)
      .not("user_id_instagram", "is", null)
      .order("assigned_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const notifications = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      contactId: row.id,
      contactName: (row.users as { name?: string } | undefined)?.name || row.user_id_instagram,
      userIdInstagram: row.user_id_instagram,
      assignedAt: row.assigned_at,
      type: "instagram-help",
      readKey: `instagram-help:${row.id}`,
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}