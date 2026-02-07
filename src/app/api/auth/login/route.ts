import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Deprecated. Use NextAuth at /api/auth/[...nextauth]",
    },
    { status: 410 }
  );
}
