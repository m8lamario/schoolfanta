"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateMatchdayScores } from "@/lib/scoring";
import { revalidatePath } from "next/cache";

/**
 * Verifica che l'utente corrente sia admin.
 * Lancia un errore se non autorizzato.
 */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    throw new Error("Non autorizzato");
  }
  return session;
}

/**
 * Crea una nuova giornata.
 */
export async function createMatchday(data: {
  number: number;
  deadline: string; // ISO string
}) {
  await requireAdmin();

  const matchday = await prisma.matchday.create({
    data: {
      number: data.number,
      deadline: new Date(data.deadline),
      status: "open",
    },
  });

  revalidatePath("/admin");
  return matchday;
}

/**
 * Inserisce/aggiorna voti in blocco per una giornata.
 */
export async function upsertManyPlayerVotes(
  votes: Array<{
    realPlayerId: string;
    matchdayId: string;
    vote: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  }>
) {
  await requireAdmin();

  // Filtra voti non validi
  const validVotes = votes.filter(
    (v) => v.realPlayerId && v.matchdayId && v.vote >= 0
  );

  if (validVotes.length === 0) {
    return { upserted: 0 };
  }

  await Promise.all(
    validVotes.map((v) =>
      prisma.playerVote.upsert({
        where: {
          realPlayerId_matchdayId: {
            realPlayerId: v.realPlayerId,
            matchdayId: v.matchdayId,
          },
        },
        update: {
          vote: v.vote,
          goals: v.goals,
          assists: v.assists,
          yellowCards: v.yellowCards,
          redCards: v.redCards,
        },
        create: {
          realPlayerId: v.realPlayerId,
          matchdayId: v.matchdayId,
          vote: v.vote,
          goals: v.goals,
          assists: v.assists,
          yellowCards: v.yellowCards,
          redCards: v.redCards,
        },
      })
    )
  );

  revalidatePath("/admin/votes");
  return { upserted: validVotes.length };
}

/**
 * Ricalcola manualmente i punteggi di una giornata.
 * Utile come "bottone di emergenza" per l'admin.
 */
export async function triggerRecalculate(matchdayId: string) {
  await requireAdmin();

  const result = await calculateMatchdayScores(matchdayId);

  revalidatePath("/admin");
  revalidatePath("/admin/votes");
  revalidatePath("/dashboard/standings");

  return result;
}

/**
 * Aggiorna lo status di una giornata manualmente.
 */
export async function updateMatchdayStatus(
  matchdayId: string,
  status: "open" | "locked" | "scored"
) {
  await requireAdmin();

  const matchday = await prisma.matchday.update({
    where: { id: matchdayId },
    data: { status },
  });

  revalidatePath("/admin");
  return matchday;
}

