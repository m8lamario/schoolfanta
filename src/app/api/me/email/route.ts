import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailChangeVerification } from "@/lib/email";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { email?: string };
    const newEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    // Validation
    if (!newEmail) {
      return NextResponse.json({ error: "Email richiesta" }, { status: 400 });
    }

    if (!isValidEmail(newEmail)) {
      return NextResponse.json({ error: "Formato email non valido" }, { status: 400 });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    // Check if email is the same
    if (currentUser.email?.toLowerCase() === newEmail) {
      return NextResponse.json(
        { error: "La nuova email è uguale a quella attuale" },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: "Questa email è già utilizzata da un altro account" },
        { status: 400 }
      );
    }

    // Generate verification token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store the pending email change request
    // We use the VerificationToken model with a special identifier format
    const identifier = `email-change:${session.user.id}:${newEmail}`;

    // Delete any existing pending email change for this user
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: {
          startsWith: `email-change:${session.user.id}:`,
        },
      },
    });

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        identifier,
        token,
        expires,
      },
    });

    // Send verification email to the NEW address
    const emailResult = await sendEmailChangeVerification(
      newEmail,
      token,
      currentUser.name
    );

    if (!emailResult.success) {
      // Clean up token if email fails
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier, token } },
      });
      return NextResponse.json(
        { error: "Errore nell'invio dell'email di verifica" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email di verifica inviata al nuovo indirizzo",
    });
  } catch (error) {
    console.error("[api/me/email] POST error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

