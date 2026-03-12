import { prisma } from "@/lib/prisma";
import VotesForm from "./VotesForm";
import styles from "../admin.module.css";

type SearchParams = Promise<{ matchdayId?: string }>;

export default async function VotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  
  // Tutte le giornate (per il selettore)
  const matchdays = await prisma.matchday.findMany({
    orderBy: { number: "desc" },
  });

  const selectedMatchdayId = params.matchdayId ?? matchdays[0]?.id;
  const selectedMatchday = matchdays.find((m) => m.id === selectedMatchdayId);

  // Tutti i giocatori reali con eventuali voti già salvati
  const players = selectedMatchdayId
    ? await prisma.realPlayer.findMany({
        include: {
          school: { select: { shortName: true, name: true } },
          votes: {
            where: { matchdayId: selectedMatchdayId },
          },
        },
        orderBy: [{ school: { name: "asc" } }, { role: "asc" }, { name: "asc" }],
      })
    : [];

  // Formatta i dati per il client component
  const playersForClient = players.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    schoolShortName: p.school?.shortName ?? "?",
    existingVote: p.votes[0] ?? null,
  }));

  return (
    <div className={styles.votesContainer}>
      <div className={styles.votesHeader}>
        <h1>Inserimento Voti</h1>

        {/* Selettore giornata */}
        <form method="GET" className={styles.matchdaySelector}>
          <label htmlFor="matchdayId">Giornata:</label>
          <select name="matchdayId" id="matchdayId" defaultValue={selectedMatchdayId}>
            {matchdays.map((md) => (
              <option key={md.id} value={md.id}>
                Giornata {md.number} ({md.status})
              </option>
            ))}
          </select>
          <button type="submit">Carica</button>
        </form>
      </div>

      {selectedMatchday && (
        <div style={{ marginBottom: "1rem", color: "#64748b", fontSize: "0.9rem" }}>
          <strong>Status:</strong>{" "}
          <span className={`${styles.statusBadge} ${styles[selectedMatchday.status]}`}>
            {selectedMatchday.status}
          </span>
          {" • "}
          <strong>Deadline:</strong>{" "}
          {new Date(selectedMatchday.deadline).toLocaleString("it-IT")}
        </div>
      )}

      {!selectedMatchdayId ? (
        <div className={styles.emptyState}>
          <p>Nessuna giornata disponibile.</p>
          <p>Crea prima una giornata dalla dashboard.</p>
        </div>
      ) : playersForClient.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Nessun giocatore trovato nel database.</p>
          <p>Assicurati di aver popolato la tabella RealPlayer.</p>
        </div>
      ) : (
        <VotesForm players={playersForClient} matchdayId={selectedMatchdayId} />
      )}
    </div>
  );
}

