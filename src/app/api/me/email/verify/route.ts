import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/me?emailError=Token mancante", request.url)
    );
  }

  try {
    // Find the verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        identifier: {
          startsWith: "email-change:",
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.redirect(
        new URL("/me?emailError=Token non valido o già utilizzato", request.url)
      );
    }

    // Check if token is expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token,
          },
        },
      });
      return NextResponse.redirect(
        new URL("/me?emailError=Token scaduto. Richiedi un nuovo cambio email.", request.url)
      );
    }

    // Parse the identifier: "email-change:userId:newEmail"
    const parts = verificationToken.identifier.split(":");
    if (parts.length < 3) {
      return NextResponse.redirect(
        new URL("/me?emailError=Formato token non valido", request.url)
      );
    }

    const userId = parts[1];
    const newEmail = parts.slice(2).join(":"); // In case email contains ":"

    // Check if new email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== userId) {
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token,
          },
        },
      });
      return NextResponse.redirect(
        new URL("/me?emailError=Questa email è già utilizzata da un altro account", request.url)
      );
    }

    // Update the user's email
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        emailVerified: new Date(), // Mark as verified since they clicked the link
      },
    });

    // Delete the verification token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    return NextResponse.redirect(
      new URL("/me?emailSuccess=Email aggiornata con successo!", request.url)
    );
  } catch (error) {
    console.error("[api/me/email/verify] GET error:", error);
    return NextResponse.redirect(
      new URL("/me?emailError=Errore durante la verifica", request.url)
    );
  }
}

