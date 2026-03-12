import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cron/lock-matchday
 *
 * Blocca automaticamente tutte le giornate "open" la cui deadline è passata.
 * Protetta da CRON_SECRET (Authorization header).
 *
 * Schedulazione consigliata: ogni 15 minuti
 */
export async function POST(req: NextRequest) {
  // 1. Autenticazione: solo chi conosce CRON_SECRET può chiamare questa route
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Trova tutte le giornate "open" con deadline già scaduta
    const expired = await prisma.matchday.findMany({
      where: {
        status: "open",
        deadline: { lt: new Date() }, // deadline < adesso
      },
    });

    if (expired.length === 0) {
      return NextResponse.json({
        locked: 0,
        message: "Nessuna giornata da bloccare",
      });
    }

    // 3. Blocca tutte le giornate scadute
    await prisma.matchday.updateMany({
      where: { id: { in: expired.map((m) => m.id) } },
      data: { status: "locked" },
    });

    console.log(
      `[cron/lock-matchday] Bloccate ${expired.length} giornate:`,
      expired.map((m) => m.number)
    );

    return NextResponse.json({
      locked: expired.length,
      ids: expired.map((m) => m.id),
      numbers: expired.map((m) => m.number),
    });
  } catch (error) {
    console.error("[cron/lock-matchday] Errore:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Disabilita caching per le route cron
export const dynamic = "force-dynamic";

