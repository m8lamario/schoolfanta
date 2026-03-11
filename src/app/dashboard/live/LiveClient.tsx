"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveMatchdayData, LiveVotedPlayer, LiveMatch, MyStarter } from "../actions";
import styles from "./page.module.css";

const POLL_INTERVAL = 30_000; // 30 s

const ROLE_ORDER = ["GK", "DEF", "MID", "ATT"] as const;

const EVENT_ICONS: Record<string, string> = {
  GOAL: "⚽",
  YELLOW_CARD: "🟨",
  RED_CARD: "🟥",
  ASSIST: "🅰️",
  SUBSTITUTION: "🔄",
};

const MATCH_STATUS_LABEL: Record<string, string> = {
  scheduled: "Programmata",
  live: "In corso",
  finished: "Finita",
};

/* ─── Punteggio parziale client-side (formula da Project.md) ─── */
function computePartialScore(starters: LiveVotedPlayer[]): number {
  return starters.reduce((sum, p) => {
    return (
      sum +
      p.vote +
      p.goals * 3 +
      p.assists -
      p.yellowCards * 0.5 -
      p.redCards * 2
    );
  }, 0);
}

/* ─── Helpers ─── */
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(ts: number): string {
  const seconds = Math.round((Date.now() - ts) / 1000);
  if (seconds < 10) return "adesso";
  if (seconds < 60) return `${seconds}s fa`;
  return `${Math.floor(seconds / 60)}m fa`;
}

/* ─── Component ─── */
export default function LiveClient({ initial }: { initial: LiveMatchdayData }) {
  const [data, setData] = useState<LiveMatchdayData>(initial);
  const lastUpdateRef = useRef(0);
  const [lastUpdateDisplay, setLastUpdateDisplay] = useState("adesso");
  const [showAllVotes, setShowAllVotes] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Init lastUpdate on mount
  useEffect(() => {
    lastUpdateRef.current = Date.now();
  }, []);

  // Polling
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/live");
      if (!res.ok) return;
      const json = await res.json();
      if (json.data) {
        setData(json.data);
        lastUpdateRef.current = Date.now();
        setLastUpdateDisplay(timeAgo(lastUpdateRef.current));
      }
    } catch {
      /* silently ignore network errors */
    }
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  // Update "time ago" label every 10s
  useEffect(() => {
    const id = setInterval(() => {
      setLastUpdateDisplay(timeAgo(lastUpdateRef.current));
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  /* ─── Derived data ─── */
  const votesMap = new Map(data.votedPlayers.map((v) => [v.realPlayerId, v]));

  // Scuole che hanno una partita live in questo momento
  const liveSchoolIds = new Set(
    data.matches
      .filter((m) => m.status === "live")
      .flatMap((m) => m.teams.map((t) => t.schoolId)),
  );

  // Merge starters con eventuali voti
  type StarterWithVote = MyStarter & {
    vote: LiveVotedPlayer | null;
    isLive: boolean;
  };

  const startersWithVotes: StarterWithVote[] = data.myStarters.map((s) => ({
    ...s,
    vote: votesMap.get(s.realPlayerId) ?? null,
    isLive: liveSchoolIds.has(s.schoolId),
  }));

  const otherVotes = data.votedPlayers.filter((p) => !p.isMyStarter);

  const votedStarterCount = startersWithVotes.filter((s) => s.vote !== null).length;
  const pendingStarterCount = startersWithVotes.length - votedStarterCount;

  const hasOfficialScore = data.myScore !== null;
  const partialScore = computePartialScore(
    data.votedPlayers.filter((p) => p.isMyStarter),
  );
  const displayScore = hasOfficialScore ? data.myScore! : partialScore;

  const allMatchesFinished =
    data.matches.length > 0 &&
    data.matches.every((m) => m.status === "finished");

  // Group starters by role
  const startersByRole = ROLE_ORDER.map((role) => ({
    role,
    players: startersWithVotes.filter((p) => p.role === role),
  })).filter((g) => g.players.length > 0);

  return (
    <div className={styles.page}>
      <div className={styles.background}>
        <div className={styles.glowTop} />
        <div className={styles.glowBottom} />
      </div>

      <div className={styles.main}>
        {/* ─── HEADER ─── */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Giornata {data.matchdayNumber}</h1>
            {!allMatchesFinished ? (
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} />
                In corso
              </span>
            ) : (
              <span className={styles.finishedBadge}>Conclusa</span>
            )}
          </div>
          <p className={styles.subtitle}>
            Aggiornato {lastUpdateDisplay}
          </p>
        </div>

        {/* ─── SCORE CARD ─── */}
        <div className={styles.scoreCard}>
          <div className={styles.scoreValue}>
            {displayScore % 1 === 0 ? displayScore : displayScore.toFixed(1)}
            <span className={styles.scoreSuffix}> pt</span>
          </div>
          <div className={styles.scoreLabel}>
            {hasOfficialScore
              ? "Punteggio ufficiale"
              : pendingStarterCount > 0
                ? `Punteggio parziale · ${pendingStarterCount} titolar${pendingStarterCount === 1 ? "e" : "i"} in attesa`
                : "Punteggio parziale"}
          </div>
        </div>

        {/* ─── MATCHES ─── */}
        {data.matches.length > 0 && (
          <div className={styles.matchesSection}>
            <h2 className={styles.sectionTitle}>Partite</h2>
            {data.matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}

        {/* ─── MY STARTERS ─── */}
        <div className={styles.startersSection}>
          <h2 className={styles.sectionTitle}>
            {data.hasLineup ? "I tuoi titolari" : "La tua rosa"}
            {startersWithVotes.length > 0 && votedStarterCount > 0 && (
              <span className={styles.sectionCount}>
                {" "}
                ({votedStarterCount}/{startersWithVotes.length} votati)
              </span>
            )}
          </h2>

          {!data.hasLineup && (
            <div className={styles.pendingNotice}>
              Nessuna formazione inviata — mostriamo tutta la rosa
            </div>
          )}

          {startersByRole.length > 0 ? (
            startersByRole.map((group) => (
              <div key={group.role} className={styles.roleGroup}>
                {group.players.map((p) => (
                  <StarterRow key={p.realPlayerId} starter={p} />
                ))}
              </div>
            ))
          ) : (
            <div className={styles.pendingNotice}>
              Nessun giocatore nella tua squadra
            </div>
          )}
        </div>

        {/* ─── ALL VOTES (collapsible) ─── */}
        {otherVotes.length > 0 && (
          <div className={styles.allVotesSection}>
            <button
              className={styles.allVotesToggle}
              onClick={() => setShowAllVotes((v) => !v)}
            >
              <span>
                Tutti i voti ({data.votedPlayers.length})
              </span>
              <span className={`${styles.chevron} ${showAllVotes ? styles.chevronOpen : ""}`}>
                ▾
              </span>
            </button>

            {showAllVotes && (
              <div className={styles.allVotesList}>
                {otherVotes.map((p) => (
                  <PlayerRow key={p.realPlayerId} player={p} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Match Card ─── */
function MatchCard({ match }: { match: LiveMatch }) {
  const home = match.teams.find((t) => t.isHome);
  const away = match.teams.find((t) => !t.isHome);

  return (
    <div
      className={`${styles.matchCard} ${match.status === "live" ? styles.matchLive : ""}`}
    >
      <div className={styles.matchHeader}>
        <span
          className={`${styles.matchStatusBadge} ${
            styles[`matchStatus_${match.status}` as keyof typeof styles] ?? ""
          }`}
        >
          {MATCH_STATUS_LABEL[match.status] ?? match.status}
        </span>
        <span className={styles.matchTime}>{formatTime(match.datetime)}</span>
      </div>

      <div className={styles.matchTeams}>
        <span className={styles.matchTeamName}>
          {home?.shortName ?? home?.schoolName ?? "—"}
        </span>
        <span className={styles.matchScoreText}>
          {home?.score ?? 0} – {away?.score ?? 0}
        </span>
        <span className={styles.matchTeamName}>
          {away?.shortName ?? away?.schoolName ?? "—"}
        </span>
      </div>

      {match.events.length > 0 && (
        <div className={styles.eventTimeline}>
          {match.events.map((ev, i) => (
            <span key={i} className={styles.eventItem}>
              <span className={styles.eventMinute}>{ev.minute}&apos;</span>
              <span>{EVENT_ICONS[ev.eventType] ?? "•"}</span>
              {ev.playerName && (
                <span className={styles.eventPlayer}>{ev.playerName}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Starter Row (always visible, live border if playing) ─── */
function StarterRow({
  starter,
}: {
  starter: {
    realPlayerId: string;
    name: string;
    role: string;
    schoolName: string;
    vote: LiveVotedPlayer | null;
    isLive: boolean;
  };
}) {
  const v = starter.vote;
  const bonuses: string[] = [];
  if (v) {
    if (v.goals > 0) bonuses.push(`⚽ ${v.goals}`);
    if (v.assists > 0) bonuses.push(`🅰️ ${v.assists}`);
    if (v.yellowCards > 0) bonuses.push(`🟨 ${v.yellowCards}`);
    if (v.redCards > 0) bonuses.push(`🟥 ${v.redCards}`);
  }

  return (
    <div
      className={`${styles.voteRow} ${styles.voteRowHighlight} ${starter.isLive ? styles.voteRowLive : ""}`}
    >
      <div className={styles.votePlayer}>
        <span
          className={`${styles.voteRoleBadge} ${
            styles[`role${starter.role}` as keyof typeof styles]
          }`}
        >
          {starter.role}
        </span>
        <div>
          <div className={styles.voteName}>{starter.name}</div>
          <div className={styles.voteSchool}>
            {starter.schoolName}
            {starter.isLive && <span className={styles.liveIndicator}> ● LIVE</span>}
          </div>
          {bonuses.length > 0 && (
            <div className={styles.voteBonuses}>{bonuses.join(" · ")}</div>
          )}
        </div>
      </div>
      {v ? (
        <span className={styles.voteValue}>
          {v.vote % 1 === 0 ? v.vote : v.vote.toFixed(1)}
        </span>
      ) : (
        <span className={styles.voteValuePending}>—</span>
      )}
    </div>
  );
}

/* ─── Player Row ─── */
function PlayerRow({
  player,
  highlight = false,
}: {
  player: LiveVotedPlayer;
  highlight?: boolean;
}) {
  const bonuses: string[] = [];
  if (player.goals > 0) bonuses.push(`⚽ ${player.goals}`);
  if (player.assists > 0) bonuses.push(`🅰️ ${player.assists}`);
  if (player.yellowCards > 0) bonuses.push(`🟨 ${player.yellowCards}`);
  if (player.redCards > 0) bonuses.push(`🟥 ${player.redCards}`);

  return (
    <div
      className={`${styles.voteRow} ${highlight ? styles.voteRowHighlight : ""}`}
    >
      <div className={styles.votePlayer}>
        <span
          className={`${styles.voteRoleBadge} ${
            styles[`role${player.role}` as keyof typeof styles]
          }`}
        >
          {player.role}
        </span>
        <div>
          <div className={styles.voteName}>{player.name}</div>
          {bonuses.length > 0 && (
            <div className={styles.voteBonuses}>{bonuses.join(" · ")}</div>
          )}
        </div>
      </div>
      <span className={styles.voteValue}>
        {player.vote % 1 === 0 ? player.vote : player.vote.toFixed(1)}
      </span>
    </div>
  );
}

