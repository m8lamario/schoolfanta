import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(
      new URL("/login?error=InvalidVerificationLink", request.url)
    );
  }

  try {
    // Trova il token di verifica
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.redirect(
        new URL("/login?error=InvalidVerificationToken", request.url)
      );
    }

    // Controlla se è scaduto
    if (verificationToken.expires < new Date()) {
      // Elimina il token scaduto
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: token,
          },
        },
      });

      return NextResponse.redirect(
        new URL("/login?error=VerificationTokenExpired", request.url)
      );
    }

    // Trova l'utente e aggiorna emailVerified
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=UserNotFound", request.url)
      );
    }

    // Aggiorna l'utente come verificato
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Elimina il token usato
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    // Invia email di benvenuto (non-blocking)
    sendWelcomeEmail(email, user.name).catch((err) => {
      console.error("[verify-email] failed to send welcome email:", err);
    });

    // Redirect al login con messaggio di successo
    return NextResponse.redirect(
      new URL("/login?verified=true", request.url)
    );
  } catch (error) {
    console.error("[verify-email] error:", error);
    return NextResponse.redirect(
      new URL("/login?error=VerificationFailed", request.url)
    );
  }
}

