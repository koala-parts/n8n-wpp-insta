import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const phoneRaw = request.nextUrl.searchParams.get("phone");
    if (!phoneRaw) {
      return NextResponse.json({ error: "phone é obrigatório" }, { status: 400 });
    }

    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      return NextResponse.json({ error: "phone inválido" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("whatsapp_leads")
      .select("phone, lead_status")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar lead:", error);
      return NextResponse.json({ error: "Erro ao buscar lead" }, { status: 500 });
    }

    const exists = Boolean(data);
    const leadStatus = (data as { lead_status?: string } | null)?.lead_status ?? null;

    return NextResponse.json({ exists, leadStatus, isLead: leadStatus === "lead" });
  } catch (error) {
    console.error("Erro inesperado ao buscar lead:", error);
    return NextResponse.json(
      { error: "Erro inesperado ao buscar lead" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      phone?: string;
      contactId?: string;
      interest?: string | null;
    };

    const phoneRaw = body.phone ?? "";
    const phone = normalizePhone(phoneRaw);
    const contactId = body.contactId?.trim() || null;
    const interest = typeof body.interest === "string" ? body.interest : null;

    if (!phone) {
      return NextResponse.json({ error: "phone é obrigatório" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verifica se já existe antes de inserir (phone é PK)
    const { data: existing, error: fetchError } = await supabase
      .from("whatsapp_leads")
      .select("phone")
      .eq("phone", phone)
      .maybeSingle();

    if (fetchError) {
      console.error("Erro ao verificar lead:", fetchError);
      return NextResponse.json({ error: "Erro ao verificar lead" }, { status: 500 });
    }

    const payload = {
      phone,
      contact_id: contactId,
      interest: interest && interest.trim().length > 0 ? interest.trim() : null,
      lead_status: "lead",
    };

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("whatsapp_leads")
        .update(payload)
        .eq("phone", phone)
        .select("*")
        .single();

      if (updateError || !updated) {
        console.error("Erro ao atualizar lead:", updateError);
        return NextResponse.json({ error: "Erro ao atualizar lead" }, { status: 500 });
      }
    } else {
      const { data: created, error: insertError } = await supabase
        .from("whatsapp_leads")
        .insert(payload)
        .select("*")
        .single();

      if (insertError || !created) {
        console.error("Erro ao criar lead:", insertError);
        return NextResponse.json({ error: "Erro ao criar lead" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro inesperado ao marcar lead:", error);
    return NextResponse.json({ error: "Erro inesperado ao marcar lead" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { phone?: string };

    const phoneRaw = body.phone ?? "";
    const phone = normalizePhone(phoneRaw);

    if (!phone) {
      return NextResponse.json({ error: "phone é obrigatório" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Se não existir, ainda assim tratamos como sucesso (idempotente)
    const { error: deleteError } = await supabase
      .from("whatsapp_leads")
      .delete()
      .eq("phone", phone);

    if (deleteError) {
      console.error("Erro ao excluir lead:", deleteError);
      return NextResponse.json({ error: "Erro ao excluir lead" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro inesperado ao excluir lead:", error);
    return NextResponse.json({ error: "Erro inesperado ao excluir lead" }, { status: 500 });
  }
}

