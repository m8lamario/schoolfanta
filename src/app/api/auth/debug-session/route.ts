import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const token = await getToken({
    req: request as unknown as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return NextResponse.json({
    ok: true,
    hasSession: Boolean(session),
    session,
    hasToken: Boolean(token),
    tokenSub: typeof token?.sub === "string" ? token.sub : null,
  });
}
