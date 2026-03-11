import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMyTeamSummary, getNextMatchday, getCurrentLineup, saveLineup } from "./actions";
import DashboardClient from "./DashboardClient";
import styles from "./page.module.css";

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

  const [teamSummary, nextMatchday, lineupData] = await Promise.all([
    getMyTeamSummary(session.user.id),
    getNextMatchday(),
    getCurrentLineup(session.user.id),
  ]);

  if (!teamSummary) {
    redirect("/create-team");
  }

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

        {/* Lineup Card (clickable → opens lineup builder) */}
        <DashboardClient
          userId={session.user.id}
          lineupData={lineupData}
          saveAction={saveLineup}
        />
      </div>
    </div>
  );
}
