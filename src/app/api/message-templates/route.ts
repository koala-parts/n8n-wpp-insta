import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

type MessageTemplateRow = {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar modelos:", error);
      return NextResponse.json(
        { error: "Erro ao buscar modelos" },
        { status: 500 }
      );
    }

    const templates = (data ?? []).map((row) => {
      const tmpl = row as unknown as MessageTemplateRow;
      return {
        id: tmpl.id,
        userId: tmpl.user_id,
        title: tmpl.title,
        content: tmpl.content,
        createdAt: tmpl.created_at,
        updatedAt: tmpl.updated_at,
      };
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Erro inesperado ao buscar modelos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar modelos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      title?: string | null;
      content?: string;
    };

    const userId = body.userId?.trim();
    const content = body.content?.trim();
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : null;

    if (!userId || !content) {
      return NextResponse.json(
        { error: "userId e conteúdo são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("message_templates")
      .insert({
        user_id: userId,
        title,
        content,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Erro ao criar modelo:", error);
      return NextResponse.json(
        { error: "Erro ao criar modelo" },
        { status: 500 }
      );
    }

    const row = data as unknown as MessageTemplateRow;

    return NextResponse.json(
      {
        template: {
          id: row.id,
          userId: row.user_id,
          title: row.title,
          content: row.content,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro inesperado ao criar modelo:", error);
    return NextResponse.json(
      { error: "Erro ao criar modelo" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string;
      userId?: string;
      title?: string | null;
      content?: string;
    };

    const id = body.id?.trim();
    const userId = body.userId?.trim();
    const content = body.content?.trim();
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : null;

    if (!id || !userId || !content) {
      return NextResponse.json(
        { error: "id, userId e conteúdo são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data: existing, error: fetchError } = await supabase
      .from("message_templates")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Erro ao buscar modelo:", fetchError);
      return NextResponse.json(
        { error: "Erro ao buscar modelo" },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Modelo não encontrado" },
        { status: 404 }
      );
    }

    if ((existing as { user_id: string }).user_id !== userId) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar este modelo" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("message_templates")
      .update({ title, content })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Erro ao atualizar modelo:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar modelo" },
        { status: 500 }
      );
    }

    const row = data as unknown as MessageTemplateRow;

    return NextResponse.json({
      template: {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        content: row.content,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error("Erro inesperado ao atualizar modelo:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar modelo" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string;
      userId?: string;
    };

    const id = body.id?.trim();
    const userId = body.userId?.trim();

    if (!id || !userId) {
      return NextResponse.json(
        { error: "id e userId são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data: existing, error: fetchError } = await supabase
      .from("message_templates")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Erro ao buscar modelo:", fetchError);
      return NextResponse.json(
        { error: "Erro ao buscar modelo" },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Modelo não encontrado" },
        { status: 404 }
      );
    }

    if ((existing as { user_id: string }).user_id !== userId) {
      return NextResponse.json(
        { error: "Você não tem permissão para excluir este modelo" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("message_templates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao excluir modelo:", error);
      return NextResponse.json(
        { error: "Erro ao excluir modelo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro inesperado ao excluir modelo:", error);
    return NextResponse.json(
      { error: "Erro ao excluir modelo" },
      { status: 500 }
    );
  }
}

