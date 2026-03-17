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
    console.log("[LOGIN] body recebido:", body);

    const userId = body?.id ? String(body.id).trim() : "";
    const email = body?.email?.trim() ?? "";
    const name = body?.name?.trim() || "Usuário";
    const role = body?.role?.trim() || "atendimento";

    if (!userId || !email) {
      console.log("[LOGIN] Dados incompletos:", { userId, email });
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    let token;
    try {
      token = await createSessionToken({
        sub: userId,
        name,
        role,
        email,
      });
      console.log("[LOGIN] Token gerado:", token);
    } catch (tokenError) {
      console.log("[LOGIN] Erro ao gerar token:", tokenError);
      throw tokenError;
    }

    try {
      const response = NextResponse.json({ ok: true });
      response.cookies.set("session", token, getSessionCookieOptions());
      console.log("[LOGIN] Cookie setado com sucesso.");
      return response;
    } catch (cookieError) {
      console.log("[LOGIN] Erro ao setar cookie:", cookieError);
      throw cookieError;
    }
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
