import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getLeagueStandings } from "../../actions";
import styles from "../page.module.css";

type Props = {
  params: Promise<{ leagueId: string }>;
};

export default async function LeagueDetailPage({ params }: Props) {
  const { leagueId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const league = await getLeagueStandings(leagueId, session.user.id);

  if (!league) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={styles.background}>
        <div className={styles.glowTop} />
        <div className={styles.glowBottom} />
      </div>

      <div className={styles.main}>
        <Link href="/dashboard/standings" className={styles.backLink}>
          ← Classifiche
        </Link>

        <div className={styles.header}>
          <h1 className={styles.title}>
            {league.name}
            {league.isGlobal && (
              <>{" "}<span className={styles.globalBadge} style={{ fontSize: 10, verticalAlign: "middle" }}>Globale</span></>
            )}
          </h1>
          <p className={styles.subtitle}>
            {league.standings.length} partecipant{league.standings.length === 1 ? "e" : "i"}
          </p>
        </div>

        <div className={styles.standingsTable}>
          {league.standings.map((entry) => (
            <div
              key={entry.userId}
              className={`${styles.standingsRow} ${
                entry.isCurrentUser ? styles.standingsRowMe : ""
              }`}
            >
              <span
                className={`${styles.standingsRank} ${
                  entry.rank === 1
                    ? styles.standingsRank1
                    : entry.rank === 2
                      ? styles.standingsRank2
                      : entry.rank === 3
                        ? styles.standingsRank3
                        : ""
                }`}
              >
                {entry.rank}
              </span>
              <div className={styles.standingsInfo}>
                <div className={styles.standingsTeam}>{entry.teamName}</div>
                <div className={styles.standingsUser}>{entry.userName}</div>
              </div>
              <span className={styles.standingsPoints}>
                {entry.totalPoints}{" "}
                <span className={styles.standingsPts}>pt</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

