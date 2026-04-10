import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

type ContactMessage = {
  id: string;
  direction: "inbound" | "outbound";
  senderType: string;
  content: string | null;
  createdAt: string | null;
  messageType: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const phone = normalizePhone(request.nextUrl.searchParams.get("phone") ?? "");
    if (!phone) {
      return NextResponse.json({ error: "phone e obrigatorio" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("id, phone, direction, sender_type, content, created_at, message_type")
      .order("created_at", { ascending: true })
      .limit(5000);

    if (error) {
      return NextResponse.json({ error: "Erro ao buscar mensagens" }, { status: 500 });
    }

    const messages: ContactMessage[] = (data ?? [])
      .filter((row) => normalizePhone(String(row.phone ?? "")) === phone)
      .map((row) => ({
        id: String(row.id ?? `${row.phone}-${row.created_at}`),
        direction: row.direction === "outbound" ? "outbound" : "inbound",
        senderType: typeof row.sender_type === "string" ? row.sender_type : "",
        content: typeof row.content === "string" && row.content.trim() ? row.content : null,
        createdAt: typeof row.created_at === "string" ? row.created_at : null,
        messageType: typeof row.message_type === "string" ? row.message_type : "text",
      }));

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar mensagens" }, { status: 500 });
  }
}

