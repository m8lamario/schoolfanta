"use client";

import { useState, useTransition } from "react";
import { upsertManyPlayerVotes, triggerRecalculate } from "../actions";
import styles from "../admin.module.css";

type Player = {
  id: string;
  name: string;
  role: string;
  schoolShortName: string;
  existingVote: {
    vote: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  } | null;
};

type VoteData = {
  vote: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  hasPlayed: boolean;
};

export default function VotesForm({
  players,
  matchdayId,
}: {
  players: Player[];
  matchdayId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Inizializza stato voti
  const [votes, setVotes] = useState<Record<string, VoteData>>(() =>
    Object.fromEntries(
      players.map((p) => [
        p.id,
        {
          vote: p.existingVote?.vote ?? 6,
          goals: p.existingVote?.goals ?? 0,
          assists: p.existingVote?.assists ?? 0,
          yellowCards: p.existingVote?.yellowCards ?? 0,
          redCards: p.existingVote?.redCards ?? 0,
          hasPlayed: p.existingVote !== null,
        },
      ])
    )
  );

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const data = Object.entries(votes)
          .filter(([, v]) => v.hasPlayed)
          .map(([playerId, v]) => ({
            realPlayerId: playerId,
            matchdayId,
            vote: v.vote,
            goals: v.goals,
            assists: v.assists,
            yellowCards: v.yellowCards,
            redCards: v.redCards,
          }));

        if (data.length === 0) {
          showToast("Nessun giocatore selezionato!", "error");
          return;
        }

        const result = await upsertManyPlayerVotes(data);
        showToast(`✅ ${result.upserted} voti salvati!`, "success");
      } catch (error) {
        showToast("❌ Errore nel salvataggio", "error");
        console.error(error);
      }
    });
  };

  const handleRecalculate = () => {
    startTransition(async () => {
      try {
        const result = await triggerRecalculate(matchdayId);
        showToast(`✅ Punteggi ricalcolati per ${result.teamsScored} squadre`, "success");
      } catch (error) {
        showToast("❌ Errore nel ricalcolo", "error");
        console.error(error);
      }
    });
  };

  const updateVote = (playerId: string, field: keyof VoteData, value: number | boolean) => {
    setVotes((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value },
    }));
  };

  // Conteggio giocatori selezionati
  const selectedCount = Object.values(votes).filter((v) => v.hasPlayed).length;

  return (
    <>
      <div style={{ marginBottom: "1rem", color: "#64748b" }}>
        <strong>{selectedCount}</strong> giocatori selezionati su{" "}
        <strong>{players.length}</strong> totali
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className={styles.votesTable}>
          <thead>
            <tr>
              <th style={{ width: 50 }}>✓</th>
              <th>Giocatore</th>
              <th>Scuola</th>
              <th>Ruolo</th>
              <th style={{ width: 70 }}>Voto</th>
              <th style={{ width: 60 }}>Gol</th>
              <th style={{ width: 60 }}>Assist</th>
              <th style={{ width: 60 }}>🟨</th>
              <th style={{ width: 60 }}>🟥</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const v = votes[p.id];
              return (
                <tr
                  key={p.id}
                  className={`${styles.playerRow} ${!v?.hasPlayed ? styles.inactive : ""}`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={v?.hasPlayed ?? false}
                      onChange={(e) => updateVote(p.id, "hasPlayed", e.target.checked)}
                    />
                  </td>
                  <td className={styles.playerName}>{p.name}</td>
                  <td className={styles.playerSchool}>{p.schoolShortName}</td>
                  <td>
                    <span className={`${styles.playerRole} ${styles[p.role]}`}>
                      {p.role}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.5"
                      min="4"
                      max="10"
                      value={v?.vote ?? 6}
                      disabled={!v?.hasPlayed}
                      onChange={(e) => updateVote(p.id, "vote", parseFloat(e.target.value) || 6)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={v?.goals ?? 0}
                      disabled={!v?.hasPlayed}
                      onChange={(e) => updateVote(p.id, "goals", parseInt(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={v?.assists ?? 0}
                      disabled={!v?.hasPlayed}
                      onChange={(e) => updateVote(p.id, "assists", parseInt(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      value={v?.yellowCards ?? 0}
                      disabled={!v?.hasPlayed}
                      onChange={(e) => updateVote(p.id, "yellowCards", parseInt(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      value={v?.redCards ?? 0}
                      disabled={!v?.hasPlayed}
                      onChange={(e) => updateVote(p.id, "redCards", parseInt(e.target.value) || 0)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.actionsBar}>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Salvataggio..." : "💾 Salva tutti i voti"}
        </button>

        <button
          className={styles.recalculateButton}
          onClick={handleRecalculate}
          disabled={isPending}
        >
          {isPending ? "Calcolo..." : "🔄 Ricalcola punteggi ora"}
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}

