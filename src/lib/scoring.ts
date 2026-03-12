import { prisma } from "@/lib/prisma";

/**
 * Calcola i punteggi di tutte le squadre fantasy per una giornata.
 * Formula: voto + 3*gol + assist − 0.5*giallo − 2*rosso
 *
 * Questa funzione è idempotente: può essere chiamata più volte
 * senza creare duplicati (usa upsert).
 */
export async function calculateMatchdayScores(matchdayId: string) {
  // 1. Prendi tutte le lineup per questa giornata (solo titolari)
  const lineups = await prisma.lineup.findMany({
    where: { matchdayId },
    include: {
      players: {
        where: { isStarter: true },
      },
    },
  });

  let teamsScored = 0;
  let teamsSkipped = 0;

  for (const lineup of lineups) {
    let totalPoints = 0;
    let playersWithVotes = 0;

    for (const lp of lineup.players) {
      const vote = await prisma.playerVote.findUnique({
        where: {
          realPlayerId_matchdayId: {
            realPlayerId: lp.realPlayerId,
            matchdayId,
          },
        },
      });

      if (vote) {
        // Formula: voto + 3*gol + assist − 0.5*giallo − 2*rosso
        const playerPoints =
          vote.vote +
          3 * vote.goals +
          1 * vote.assists -
          0.5 * vote.yellowCards -
          2 * vote.redCards;
        
        totalPoints += playerPoints;
        playersWithVotes++;
      }
      // Se il giocatore non ha il voto → 0 punti (non ha giocato)
    }

    // Salta squadre senza nessun giocatore con voto (evita punteggi 0 inutili)
    if (playersWithVotes === 0) {
      teamsSkipped++;
      continue;
    }

    // Salva (o aggiorna) il punteggio — idempotente con upsert
    // Arrotonda a 1 decimale
    const finalPoints = Math.round(totalPoints * 10) / 10;

    await prisma.matchdayScore.upsert({
      where: {
        fantasyTeamId_matchdayId: {
          fantasyTeamId: lineup.fantasyTeamId,
          matchdayId,
        },
      },
      update: { points: finalPoints },
      create: {
        fantasyTeamId: lineup.fantasyTeamId,
        matchdayId,
        points: finalPoints,
      },
    });

    teamsScored++;
  }

  return { teamsScored, teamsSkipped };
}

/**
 * Calcola il punteggio di un singolo giocatore dato un PlayerVote.
 * Utile per preview nel pannello admin.
 */
export function calculatePlayerPoints(vote: {
  vote: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}): number {
  return (
    vote.vote +
    3 * vote.goals +
    1 * vote.assists -
    0.5 * vote.yellowCards -
    2 * vote.redCards
  );
}

