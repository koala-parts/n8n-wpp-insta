import { NextResponse } from "next/server";

import { getSessionCookieOptions } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("session", "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
