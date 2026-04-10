import { NextResponse } from "next/server";

const INSTAGRAM_API_VERSION = "v25.0";
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";

export async function GET() {
  try {
    const accessToken = process.env.INSTAGRAM_ACESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Token de acesso do Instagram não configurado" },
        { status: 500 }
      );
    }

    const url = new URL(`${INSTAGRAM_GRAPH_URL}/${INSTAGRAM_API_VERSION}/me`);
    url.searchParams.set("fields", "id,username,name");
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Instagram API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      id: data.id,
      username: data.username,
      name: data.name,
    });
  } catch (error) {
    console.error("Error fetching Instagram business info:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao buscar informações do Instagram",
      },
      { status: 500 }
    );
  }
}
