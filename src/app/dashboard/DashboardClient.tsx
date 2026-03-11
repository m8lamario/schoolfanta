"use client";

import { useState } from "react";
import LineupBuilder from "./LineupBuilder";
import type { LineupPlayerData, SaveLineupResult } from "./actions";
import styles from "./page.module.css";

type Props = {
  userId: string;
  lineupData: {
    matchdayId: string;
    matchdayNumber: number;
    deadline: string;
    players: LineupPlayerData[];
  } | null;
  saveAction: (
    userId: string,
    matchdayId: string,
    starterIds: string[],
    benchIds: string[],
  ) => Promise<SaveLineupResult>;
};

export default function DashboardClient({ userId, lineupData, saveAction }: Props) {
  const [showLineup, setShowLineup] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!lineupData) {
    return (
      <div className={styles.lineupCard} style={{ opacity: 0.5 }}>
        <div className={styles.lineupCardInner}>
          <span className={styles.lineupCardIcon}>📋</span>
          <div className={styles.lineupCardText}>
            <span className={styles.lineupCardTitle}>Formazione</span>
            <span className={styles.lineupCardSub}>
              Nessuna giornata aperta
            </span>
          </div>
        </div>
      </div>
    );
  }

  const starters = lineupData.players.filter((p) => p.isStarter);
  const startersByRole = {
    GK: starters.filter((p) => p.role === "GK").length,
    DEF: starters.filter((p) => p.role === "DEF").length,
    MID: starters.filter((p) => p.role === "MID").length,
    ATT: starters.filter((p) => p.role === "ATT").length,
  };
  const formationString = `${startersByRole.DEF}-${startersByRole.MID}-${startersByRole.ATT}`;

  return (
    <>
      <button
        className={styles.lineupCard}
        onClick={() => setShowLineup(true)}
        type="button"
      >
        <div className={styles.lineupCardInner}>
          <span className={styles.lineupCardIcon}>⚽</span>
          <div className={styles.lineupCardText}>
            <span className={styles.lineupCardTitle}>
              Formazione — Giornata {lineupData.matchdayNumber}
            </span>
            <span className={styles.lineupCardSub}>
              {saved ? "✅ Salvata" : `Modulo: ${formationString}`} • Tocca per modificare
            </span>
          </div>
          <span className={styles.lineupCardArrow}>›</span>
        </div>

        {/* Mini pitch preview */}
        <div className={styles.miniPitch}>
          {["GK", "DEF", "MID", "ATT"].map((role) => {
            const rolePlayers = starters.filter((p) => p.role === role);
            return (
              <div key={role} className={styles.miniRow}>
                {rolePlayers.map((p) => (
                  <div
                    key={p.realPlayerId}
                    className={`${styles.miniDot} ${styles[`mini${role}` as keyof typeof styles]}`}
                    title={p.name}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </button>

      {showLineup && (
        <LineupBuilder
          matchdayId={lineupData.matchdayId}
          matchdayNumber={lineupData.matchdayNumber}
          deadline={lineupData.deadline}
          initialPlayers={lineupData.players}
          userId={userId}
          saveAction={saveAction}
          closeAction={() => {
            setShowLineup(false);
            setSaved(true);
          }}
        />
      )}
    </>
  );
}

