import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isStrongPassword(value: string): boolean {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value)
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      password?: string;
      confirmPassword?: string;
    };

    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    // Validation
    if (!password || !confirmPassword) {
      return NextResponse.json(
        { error: "Password e conferma password sono richieste" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Le password non coincidono" },
        { status: 400 }
      );
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        {
          error:
            "La password deve avere almeno 8 caratteri, una maiuscola, una minuscola e un numero",
        },
        { status: 400 }
      );
    }

    // Hash and save
    const passwordHash = await hash(password, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/me/password] POST error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

