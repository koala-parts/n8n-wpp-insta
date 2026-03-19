import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

type ChatNoteRow = {
  id: string;
  contact_id: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const contactId = request.nextUrl.searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("chat_internal_notes")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar anotações:", error);
      return NextResponse.json(
        { error: "Erro ao buscar anotações" },
        { status: 500 }
      );
    }

    const notes = (data ?? []).map((row) => {
      const note = row as unknown as ChatNoteRow;
      return {
        id: note.id,
        contactId: note.contact_id,
        content: note.content,
        authorId: note.author_id,
        authorName: note.author_name,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      };
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Erro inesperado ao buscar anotações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar anotações" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      contactId?: string;
      content?: string;
      authorId?: string;
      authorName?: string;
    };

    const contactId = body.contactId?.trim();
    const content = body.content?.trim();
    const authorId = body.authorId?.trim();
    const authorName = body.authorName?.trim();

    if (!contactId || !content) {
      return NextResponse.json(
        { error: "contactId e conteúdo são obrigatórios" },
        { status: 400 }
      );
    }

    if (!authorId || !authorName) {
      return NextResponse.json(
        { error: "authorId e authorName são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("chat_internal_notes")
      .insert({
        contact_id: contactId,
        content,
        author_id: authorId,
        author_name: authorName,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Erro ao criar anotação:", error);
      return NextResponse.json(
        { error: "Erro ao criar anotação" },
        { status: 500 }
      );
    }

    const row = data as unknown as ChatNoteRow;

    return NextResponse.json(
      {
        note: {
          id: row.id,
          contactId: row.contact_id,
          content: row.content,
          authorId: row.author_id,
          authorName: row.author_name,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro inesperado ao criar anotação:", error);
    return NextResponse.json(
      { error: "Erro ao criar anotação" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string;
      content?: string;
      authorId?: string;
    };

    const id = body.id?.trim();
    const content = body.content?.trim();
    const authorId = body.authorId?.trim();

    if (!id || !content || !authorId) {
      return NextResponse.json(
        { error: "id, conteúdo e authorId são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data: existing, error: fetchError } = await supabase
      .from("chat_internal_notes")
      .select("id, author_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Erro ao buscar anotação:", fetchError);
      return NextResponse.json(
        { error: "Erro ao buscar anotação" },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Anotação não encontrada" },
        { status: 404 }
      );
    }

    if ((existing as { author_id: string }).author_id !== authorId) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar esta anotação" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("chat_internal_notes")
      .update({ content })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Erro ao atualizar anotação:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar anotação" },
        { status: 500 }
      );
    }

    const row = data as unknown as ChatNoteRow;

    return NextResponse.json({
      note: {
        id: row.id,
        contactId: row.contact_id,
        content: row.content,
        authorId: row.author_id,
        authorName: row.author_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error("Erro inesperado ao atualizar anotação:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar anotação" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string;
      authorId?: string;
    };

    const id = body.id?.trim();
    const authorId = body.authorId?.trim();

    if (!id || !authorId) {
      return NextResponse.json(
        { error: "id e authorId são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data: existing, error: fetchError } = await supabase
      .from("chat_internal_notes")
      .select("id, author_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Erro ao buscar anotação:", fetchError);
      return NextResponse.json(
        { error: "Erro ao buscar anotação" },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Anotação não encontrada" },
        { status: 404 }
      );
    }

    if ((existing as { author_id: string }).author_id !== authorId) {
      return NextResponse.json(
        { error: "Você não tem permissão para excluir esta anotação" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("chat_internal_notes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao excluir anotação:", error);
      return NextResponse.json(
        { error: "Erro ao excluir anotação" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro inesperado ao excluir anotação:", error);
    return NextResponse.json(
      { error: "Erro ao excluir anotação" },
      { status: 500 }
    );
  }
}

