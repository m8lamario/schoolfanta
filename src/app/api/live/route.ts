import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLiveMatchday } from "@/app/dashboard/actions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const data = await getLiveMatchday(session.user.id);

  if (!data) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({ data });
}

