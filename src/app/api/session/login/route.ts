import { NextResponse } from "next/server";

import { createSessionToken, getSessionCookieOptions } from "@/lib/session";

type LoginBody = {
  id?: string | number;
  name?: string | null;
  role?: string | null;
  email?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;

    const userId = body?.id ? String(body.id).trim() : "";
    const email = body?.email?.trim() ?? "";
    const name = body?.name?.trim() || "Usuário";
    const role = body?.role?.trim() || "atendimento";

    if (!userId || !email) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const token = await createSessionToken({
      sub: userId,
      name,
      role,
      email,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set("session", token, getSessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Session login error:", error);

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Falha ao criar sessão"
            : error instanceof Error
            ? `Falha ao criar sessão: ${error.message}`
            : "Falha ao criar sessão",
      },
      { status: 500 }
    );
  }
}
