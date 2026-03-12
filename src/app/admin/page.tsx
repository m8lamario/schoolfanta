import { prisma } from "@/lib/prisma";
import Link from "next/link";
import styles from "./admin.module.css";

export default async function AdminDashboard() {
  // Statistiche generali
  const [matchdays, totalUsers, totalTeams, totalPlayers] = await Promise.all([
    prisma.matchday.findMany({
      orderBy: { number: "desc" },
      take: 10,
      include: {
        _count: {
          select: { votes: true, matches: true },
        },
      },
    }),
    prisma.user.count(),
    prisma.fantasyTeam.count(),
    prisma.realPlayer.count(),
  ]);

  const lockedMatchdays = matchdays.filter((m) => m.status === "locked").length;

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem", color: "#1e293b" }}>
        Dashboard Admin
      </h1>

      {/* Stats grid */}
      <div className={styles.dashboardGrid}>
        <div className={`${styles.statCard} ${styles.info}`}>
          <h3>Utenti Registrati</h3>
          <div className={styles.statValue}>{totalUsers}</div>
        </div>

        <div className={`${styles.statCard} ${styles.success}`}>
          <h3>Squadre Fantasy</h3>
          <div className={styles.statValue}>{totalTeams}</div>
        </div>

        <div className={`${styles.statCard} ${styles.info}`}>
          <h3>Giocatori Reali</h3>
          <div className={styles.statValue}>{totalPlayers}</div>
        </div>

        {lockedMatchdays > 0 && (
          <div className={`${styles.statCard} ${styles.warning}`}>
            <h3>⚠️ Giornate in attesa di voti</h3>
            <div className={styles.statValue}>{lockedMatchdays}</div>
            <Link
              href="/admin/votes"
              style={{ color: "#f59e0b", fontSize: "0.85rem" }}
            >
              Inserisci voti →
            </Link>
          </div>
        )}
      </div>

      {/* Matchday list */}
      <div className={styles.matchdayList}>
        <h2>Ultime Giornate</h2>

        {matchdays.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Nessuna giornata creata.</p>
          </div>
        ) : (
          matchdays.map((md) => (
            <div key={md.id} className={styles.matchdayItem}>
              <div className={styles.matchdayInfo}>
                <span className={styles.matchdayNumber}>
                  Giornata {md.number}
                </span>
                <span className={styles.matchdayDeadline}>
                  Deadline: {new Date(md.deadline).toLocaleString("it-IT")}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  {md._count.votes} voti • {md._count.matches} partite
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span
                  className={`${styles.statusBadge} ${styles[md.status]}`}
                >
                  {md.status}
                </span>
                {md.status === "locked" && (
                  <Link
                    href={`/admin/votes?matchdayId=${md.id}`}
                    style={{
                      padding: "0.4rem 0.8rem",
                      background: "#f59e0b",
                      color: "white",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      textDecoration: "none",
                    }}
                  >
                    Inserisci voti
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

