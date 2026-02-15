import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        passwordHash: true, // We'll convert this to hasPassword boolean
        accounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    const hasPassword = Boolean(user.passwordHash);
    const hasGoogleAccount = user.accounts.some((acc) => acc.provider === "google");

    // Never expose passwordHash
    const { passwordHash: _hash, accounts: _accounts, ...safeUser } = user;

    return NextResponse.json({
      ...safeUser,
      hasPassword,
      hasGoogleAccount,
    });
  } catch (error) {
    console.error("[api/me] GET error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      firstName?: string;
      lastName?: string;
    };

    // Validate and sanitize input
    const updateData: { name?: string | null; firstName?: string | null; lastName?: string | null } = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      updateData.name = trimmed.length > 0 ? trimmed.slice(0, 100) : null;
    }

    if (typeof body.firstName === "string") {
      const trimmed = body.firstName.trim();
      updateData.firstName = trimmed.length > 0 ? trimmed.slice(0, 50) : null;
    }

    if (typeof body.lastName === "string") {
      const trimmed = body.lastName.trim();
      updateData.lastName = trimmed.length > 0 ? trimmed.slice(0, 50) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        passwordHash: true,
        accounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    const hasPassword = Boolean(updatedUser.passwordHash);
    const hasGoogleAccount = updatedUser.accounts.some((acc) => acc.provider === "google");

    const { passwordHash: _hash, accounts: _accounts, ...safeUser } = updatedUser;

    return NextResponse.json({
      ...safeUser,
      hasPassword,
      hasGoogleAccount,
    });
  } catch (error) {
    console.error("[api/me] PUT error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

