import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    // Recupera l'utente
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "Nessuna email associata all'account" },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email già verificata" },
        { status: 400 }
      );
    }

    // Elimina eventuali token precedenti per questo utente
    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    // Genera nuovo token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore

    // Salva il token
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires,
      },
    });

    // Invia l'email
    const result = await sendVerificationEmail(user.email, token, user.name);

    if (!result.success) {
      return NextResponse.json(
        { error: "Errore nell'invio dell'email. Riprova più tardi." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email di verifica inviata",
    });
  } catch (error) {
    console.error("[resend-verification] error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

