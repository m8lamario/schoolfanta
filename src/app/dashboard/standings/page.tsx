import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getUserLeagues } from "../actions";
import styles from "./page.module.css";

export default async function StandingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const leagues = await getUserLeagues(session.user.id);

  // Sort: global league first, then by name
  const sorted = [...leagues].sort((a, b) => {
    if (a.isGlobal && !b.isGlobal) return -1;
    if (!a.isGlobal && b.isGlobal) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={styles.page}>
      <div className={styles.background}>
        <div className={styles.glowTop} />
        <div className={styles.glowBottom} />
      </div>

      <div className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Classifiche</h1>
          <p className={styles.subtitle}>
            Le tue leghe · tocca per vedere la classifica
          </p>
        </div>

        {sorted.length > 0 ? (
          <div className={styles.leagueList}>
            {sorted.map((league) => (
              <Link
                key={league.id}
                href={`/dashboard/standings/${league.id}`}
                className={`${styles.leagueCard} ${
                  league.isGlobal ? styles.leagueCardGlobal : ""
                }`}
              >
                <div className={styles.leagueInfo}>
                  <span className={styles.leagueName}>
                    {league.name}
                    {league.isGlobal && (
                      <span className={styles.globalBadge}>Globale</span>
                    )}
                  </span>
                  <span className={styles.leagueMeta}>
                    {league.memberCount} partecipant{league.memberCount === 1 ? "e" : "i"} · {league.userPoints} pt
                  </span>
                </div>
                <div className={styles.leagueRank}>
                  <span className={styles.rankValue}>#{league.userRank}</span>
                  <span className={styles.rankLabel}>Posizione</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Non fai parte di nessuna lega.
          </div>
        )}
      </div>
    </div>
  );
}

