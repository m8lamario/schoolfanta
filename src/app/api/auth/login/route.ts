import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Demo-only: accept anything and set a session cookie.
  // In produzione: valida credenziali e/o scambia un token OAuth.
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // ignore
  }

  const sessionValue =
    typeof body === "object" && body !== null && "session" in body
      ? String((body as { session: unknown }).session)
      : "demo";

  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: "session",
    value: sessionValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 giorni
  });

  return response;
}
