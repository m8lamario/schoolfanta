import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateMatchdayScores } from "@/lib/scoring";

/**
 * POST /api/cron/auto-score
 *
 * Calcola automaticamente i punteggi e chiude le giornate quando:
 * 1. Tutte le partite della giornata sono finite (finished = true)
 * 2. Esistono voti inseriti dall'admin per quella giornata
 *
 * Protetta da CRON_SECRET (Authorization header).
 * Idempotente: può essere chiamata più volte senza effetti collaterali.
 *
 * Schedulazione consigliata: ogni ora
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Trova giornate bloccate (locked) - quelle pronte per essere calcolate
    const lockedMatchdays = await prisma.matchday.findMany({
      where: { status: "locked" },
      include: {
        matches: { select: { id: true, finished: true } },
        votes: { select: { id: true } },
      },
    });

    const results: Array<{
      matchdayNumber: number;
      skipped: boolean;
      reason?: string;
      teamsScored?: number;
    }> = [];

    for (const matchday of lockedMatchdays) {
      // Condizione 1: tutte le partite devono essere finite
      // (se non ci sono partite associate, consideriamo come "finite")
      const allMatchesFinished =
        matchday.matches.length === 0 ||
        matchday.matches.every((m) => m.finished);

      if (!allMatchesFinished) {
        results.push({
          matchdayNumber: matchday.number,
          skipped: true,
          reason: "Non tutte le partite sono finite",
        });
        continue;
      }

      // Condizione 2: ci devono essere voti inseriti dall'admin
      if (matchday.votes.length === 0) {
        results.push({
          matchdayNumber: matchday.number,
          skipped: true,
          reason: "Nessun voto inserito ancora",
        });
        continue;
      }

      // Calcola i punteggi
      const { teamsScored } = await calculateMatchdayScores(matchday.id);

      // Chiudi la giornata → "scored"
      await prisma.matchday.update({
        where: { id: matchday.id },
        data: { status: "scored" },
      });

      console.log(
        `[cron/auto-score] Giornata ${matchday.number} completata: ${teamsScored} squadre`
      );

      results.push({
        matchdayNumber: matchday.number,
        skipped: false,
        teamsScored,
      });
    }

    return NextResponse.json({
      processed: lockedMatchdays.length,
      results,
    });
  } catch (error) {
    console.error("[cron/auto-score] Errore:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Disabilita caching per le route cron
export const dynamic = "force-dynamic";

