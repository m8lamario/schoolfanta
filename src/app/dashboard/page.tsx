import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getMyTeamSummary, getNextMatchday, getCurrentLineup, saveLineup, getLiveMatchdaySummary } from "./actions";
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

  const [teamSummary, nextMatchday, lineupData, liveSummary] = await Promise.all([
    getMyTeamSummary(session.user.id),
    getNextMatchday(),
    getCurrentLineup(session.user.id),
    getLiveMatchdaySummary(),
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

        {/* Matchday slot: Live → Open → None */}
        {liveSummary ? (
          <Link href="/dashboard/live" className={styles.liveCard}>
            <div className={styles.liveCardHeader}>
              <div className={styles.liveIndicator}>
                <span className={styles.livePulse} />
                <span className={styles.liveLabel}>LIVE</span>
              </div>
              <span className={styles.matchdayTitle}>
                Giornata {liveSummary.matchdayNumber}
              </span>
              <span className={styles.liveArrow}>›</span>
            </div>
            <div className={styles.liveMatches}>
              {liveSummary.matches.map((m, i) => (
                <div key={i} className={styles.liveMatchRow}>
                  <span className={styles.liveTeam + " " + styles.liveTeamHome}>
                    {m.homeShort ?? m.homeName}
                  </span>
                  <span className={styles.liveScore}>
                    {m.status === "scheduled"
                      ? "vs"
                      : `${m.homeScore} - ${m.awayScore}`}
                  </span>
                  <span className={styles.liveTeam + " " + styles.liveTeamAway}>
                    {m.awayShort ?? m.awayName}
                  </span>
                  {m.status === "live" && (
                    <span className={styles.liveMatchDot} />
                  )}
                </div>
              ))}
            </div>
          </Link>
        ) : nextMatchday ? (
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
