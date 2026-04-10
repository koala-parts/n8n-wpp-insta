import { NextRequest, NextResponse } from "next/server";

const INSTAGRAM_API_VERSION = "v24.0";
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";

type InstagramProfileResponse = {
  id: string;
  username: string;
  name?: string;
  profile_pic?: string;
  profile_picture_url?: string;
};

async function getUserProfile(
  userId: string,
  accessToken: string
): Promise<InstagramProfileResponse | null> {
  const url = new URL(`${INSTAGRAM_GRAPH_URL}/${INSTAGRAM_API_VERSION}/${userId}`);
  url.searchParams.set("fields", "id,username,name,profile_pic");
  url.searchParams.set("access_token", accessToken);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Instagram API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching Instagram profile:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.INSTAGRAM_ACESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Token de acesso do Instagram não configurado" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "ID do usuário não fornecido" },
        { status: 400 }
      );
    }

    const profile = await getUserProfile(userId, accessToken);

    if (!profile) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      name: profile.name,
      profilePictureUrl: profile.profile_pic || profile.profile_picture_url || null,
    });
  } catch (error) {
    console.error("Error fetching Instagram profile:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao buscar perfil",
      },
      { status: 500 }
    );
  }
}
