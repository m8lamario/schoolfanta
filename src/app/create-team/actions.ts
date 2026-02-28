"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Types ───

export type RealPlayerDTO = {
  id: string;
  name: string;
  role: string;
  schoolName: string;
  value: number;
};

type CreateTeamResult =
  | { success: true }
  | { success: false; error: string };

// ─── Fetch players available for draft ───

export async function getAvailablePlayers(): Promise<RealPlayerDTO[]> {
  const players = await prisma.realPlayer.findMany({
    include: { school: { select: { name: true } } },
    orderBy: [{ role: "asc" }, { value: "desc" }],
  });

  return players.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    schoolName: p.school.name,
    value: p.value,
  }));
}

// ─── Get current user budget ───

export async function getUserBudget(): Promise<number> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Non autenticato");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { budget: true },
  });

  return user?.budget ?? 100;
}

// ─── Create team ───

const REQUIRED_ROLES: Record<string, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  ATT: 3,
};

export async function createTeam(
  teamName: string,
  playerIds: string[],
): Promise<CreateTeamResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Non autenticato" };
  }

  const userId = session.user.id;

  // Trim & validate team name
  const name = teamName.trim();
  if (!name || name.length < 2 || name.length > 30) {
    return {
      success: false,
      error: "Il nome squadra deve avere tra 2 e 30 caratteri",
    };
  }

  // Check user doesn't already have a team
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { budget: true, hasTeam: true },
  });

  if (!user) return { success: false, error: "Utente non trovato" };
  if (user.hasTeam) return { success: false, error: "Hai già una squadra" };

  // Must have exactly 15 players
  if (playerIds.length !== 15) {
    return { success: false, error: "Devi selezionare esattamente 15 giocatori" };
  }

  // Check for duplicates
  if (new Set(playerIds).size !== 15) {
    return { success: false, error: "Non puoi selezionare lo stesso giocatore due volte" };
  }

  // Load selected players
  const players = await prisma.realPlayer.findMany({
    where: { id: { in: playerIds } },
  });

  if (players.length !== 15) {
    return { success: false, error: "Alcuni giocatori selezionati non esistono" };
  }

  // Validate role composition
  const counts: Record<string, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  let totalCost = 0;

  for (const p of players) {
    counts[p.role] = (counts[p.role] || 0) + 1;
    totalCost += p.value;
  }

  for (const [role, required] of Object.entries(REQUIRED_ROLES)) {
    if ((counts[role] || 0) !== required) {
      return {
        success: false,
        error: `Rosa non valida: servono ${required} ${role}, ne hai ${counts[role] || 0}`,
      };
    }
  }

  // Validate budget
  if (totalCost > user.budget) {
    return {
      success: false,
      error: `Budget insufficiente: costo ${totalCost}, budget ${user.budget}`,
    };
  }

  // Create team in a transaction
  try {
    await prisma.$transaction(async (tx) => {
      await tx.fantasyTeam.create({
        data: {
          name,
          userId,
          players: {
            create: playerIds.map((pid) => ({
              realPlayerId: pid,
            })),
          },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          hasTeam: true,
          budget: user.budget - totalCost,
        },
      });
    });
  } catch (e) {
    console.error("[createTeam] transaction error", e);
    return { success: false, error: "Errore durante la creazione della squadra" };
  }

  return { success: true };
}

