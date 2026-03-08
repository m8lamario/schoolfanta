import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMyTeamSummary, getMyRoster, getNextMatchday } from "./actions";
import type { RosterPlayer } from "./actions";
import styles from "./page.module.css";

const ROLE_ORDER = ["GK", "DEF", "MID", "ATT"] as const;
const ROLE_LABELS: Record<string, string> = {
  GK: "Portieri",
  DEF: "Difensori",
  MID: "Centrocampisti",
  ATT: "Attaccanti",
};

function groupByRole(players: RosterPlayer[]) {
  const groups: Record<string, RosterPlayer[]> = {};
  for (const role of ROLE_ORDER) {
    groups[role] = players.filter((p) => p.role === role);
  }
  return groups;
}

function formatDeadline(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [teamSummary, roster, nextMatchday] = await Promise.all([
    getMyTeamSummary(session.user.id),
    getMyRoster(session.user.id),
    getNextMatchday(),
  ]);

  if (!teamSummary) {
    redirect("/create-team");
  }

  const grouped = groupByRole(roster);

  return (
    <div className={styles.page}>
      <div className={styles.background}>
        <div className={styles.glowTop} />
        <div className={styles.glowBottom} />
      </div>

      <div className={styles.main}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.greeting}>
            Ciao, {session.user.name ?? "Coach"} 👋
          </span>
          <h1 className={styles.teamName}>{teamSummary.teamName}</h1>
        </div>

        {/* Stats summary */}
        <div className={styles.summaryCard}>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{teamSummary.totalPoints}</span>
            <span className={styles.statLabel}>Punti totali</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>#{teamSummary.globalRank}</span>
            <span className={styles.statLabel}>Classifica</span>
          </div>
        </div>

        {/* Next matchday */}
        {nextMatchday ? (
          <div className={styles.matchdayCard}>
            <div className={styles.matchdayHeader}>
              <span className={styles.matchdayTitle}>
                Giornata {nextMatchday.number}
              </span>
              <span className={styles.matchdayBadge}>Aperta</span>
            </div>
            <p className={styles.matchdayDeadline}>
              Deadline:{" "}
              <span className={styles.deadlineTime}>
                {formatDeadline(nextMatchday.deadline)}
              </span>
            </p>
          </div>
        ) : (
          <div className={styles.noMatchday}>
            Nessuna giornata in programma
          </div>
        )}

        {/* Roster */}
        {roster.length > 0 ? (
          <div className={styles.rosterSection}>
            <h2 className={styles.rosterTitle}>La tua rosa</h2>
            {ROLE_ORDER.map((role) => {
              const players = grouped[role];
              if (!players || players.length === 0) return null;
              return (
                <div key={role} className={styles.roleGroup}>
                  <span className={styles.roleLabel}>
                    {ROLE_LABELS[role]}
                  </span>
                  {players.map((p) => (
                    <div key={p.id} className={styles.playerRow}>
                      <div className={styles.playerInfo}>
                        <span
                          className={`${styles.playerRoleBadge} ${
                            styles[`role${role}` as keyof typeof styles]
                          }`}
                        >
                          {role}
                        </span>
                        <div>
                          <div className={styles.playerName}>{p.name}</div>
                          <div className={styles.playerSchool}>
                            {p.schoolName}
                          </div>
                        </div>
                      </div>
                      <span className={styles.playerValue}>{p.value} cr</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            La tua rosa è vuota. Qualcosa è andato storto!
          </div>
        )}
      </div>
    </div>
  );
}
