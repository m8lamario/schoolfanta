import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLiveMatchday } from "../actions";
import styles from "./page.module.css";

export default async function LivePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const liveData = await getLiveMatchday(session.user.id);

  // If no live matchday, redirect back to dashboard
  if (!liveData) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.page}>
      <div className={styles.background}>
        <div className={styles.glowTop} />
        <div className={styles.glowBottom} />
      </div>

      <div className={styles.main}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Giornata {liveData.matchdayNumber}</h1>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              In corso
            </span>
          </div>
          <p className={styles.subtitle}>
            Risultati in tempo reale
          </p>
        </div>

        {/* User score */}
        <div className={styles.scoreCard}>
          {liveData.myScore !== null ? (
            <>
              <div className={styles.scoreValue}>
                {liveData.myScore}
                <span className={styles.scoreSuffix}> pt</span>
              </div>
              <div className={styles.scoreLabel}>Il tuo punteggio per questa giornata</div>
            </>
          ) : (
            <div className={styles.scorePending}>
              Punteggio in fase di calcolo…
            </div>
          )}
        </div>

        {/* Voted players */}
        {liveData.votedPlayers.length > 0 ? (
          <div className={styles.votesSection}>
            <h2 className={styles.votesTitle}>
              Voti giocatori ({liveData.votedPlayers.length})
            </h2>
            {liveData.votedPlayers.map((p, idx) => {
              const bonuses: string[] = [];
              if (p.goals > 0) bonuses.push(`⚽ ${p.goals}`);
              if (p.assists > 0) bonuses.push(`🅰️ ${p.assists}`);

              return (
                <div key={idx} className={styles.voteRow}>
                  <div className={styles.votePlayer}>
                    <span
                      className={`${styles.voteRoleBadge} ${
                        styles[`role${p.role}` as keyof typeof styles]
                      }`}
                    >
                      {p.role}
                    </span>
                    <div>
                      <div className={styles.voteName}>{p.name}</div>
                      {bonuses.length > 0 && (
                        <div className={styles.voteBonuses}>
                          {bonuses.join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={styles.voteValue}>{p.vote}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⏳</div>
            I voti non sono ancora stati inseriti
          </div>
        )}
      </div>
    </div>
  );
}

