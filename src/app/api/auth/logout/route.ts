import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Deprecated. Use NextAuth signOut()",
    },
    { status: 410 }
  );
}
