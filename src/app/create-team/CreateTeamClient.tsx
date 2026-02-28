"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import type { RealPlayerDTO } from "./actions";
import { createTeam } from "./actions";
import styles from "./page.module.css";

// Steps: 0 = nome, 1 = GK, 2 = DEF, 3 = MID, 4 = ATT, 5 = conferma
const DRAFT_STEPS = [
  { role: "GK", label: "Portieri", required: 2 },
  { role: "DEF", label: "Difensori", required: 5 },
  { role: "MID", label: "Centrocampisti", required: 5 },
  { role: "ATT", label: "Attaccanti", required: 3 },
] as const;

const TOTAL_STEPS = 1 + DRAFT_STEPS.length + 1; // name + 4 roles + confirm

type Props = {
  players: RealPlayerDTO[];
  initialBudget: number;
};

export default function CreateTeamClient({ players, initialBudget }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search filter (matches name or school)
  const [search, setSearch] = useState("");

  // Group players by role
  const playersByRole = useMemo(() => {
    const map: Record<string, RealPlayerDTO[]> = {};
    for (const p of players) {
      if (!map[p.role]) map[p.role] = [];
      map[p.role].push(p);
    }
    return map;
  }, [players]);

  // Filter players by search query (name or school)
  const filterPlayers = useCallback(
    (list: RealPlayerDTO[]) => {
      const q = search.trim().toLowerCase();
      if (!q) return list;
      return list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.schoolName.toLowerCase().includes(q),
      );
    },
    [search],
  );

  // Calculate spent budget
  const spent = useMemo(() => {
    let total = 0;
    for (const p of players) {
      if (selectedIds.has(p.id)) total += p.value;
    }
    return total;
  }, [players, selectedIds]);

  const remaining = initialBudget - spent;

  // For a given draft step (1-4), how many are selected of that role
  const countForRole = useCallback(
    (role: string) => {
      let count = 0;
      for (const p of players) {
        if (p.role === role && selectedIds.has(p.id)) count++;
      }
      return count;
    },
    [players, selectedIds],
  );

  // Toggle player selection
  const togglePlayer = useCallback(
    (player: RealPlayerDTO, maxForRole: number) => {
      setError(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(player.id)) {
          next.delete(player.id);
        } else {
          // Check if we've reached the max for this role
          let roleCount = 0;
          for (const p of players) {
            if (p.role === player.role && next.has(p.id)) roleCount++;
          }
          if (roleCount >= maxForRole) return prev; // don't add

          // Check budget
          if (player.value > remaining) return prev;

          next.add(player.id);
        }
        return next;
      });
    },
    [players, remaining],
  );

  // Can we go next?
  const canGoNext = useMemo(() => {
    if (step === 0) return teamName.trim().length >= 2;
    if (step >= 1 && step <= 4) {
      const ds = DRAFT_STEPS[step - 1];
      return countForRole(ds.role) === ds.required;
    }
    return true; // confirm step
  }, [step, teamName, countForRole]);

  // Submit
  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    const ids = Array.from(selectedIds);
    const result = await createTeam(teamName.trim(), ids);

    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  // Selected players for confirm step
  const selectedPlayers = useMemo(
    () => players.filter((p) => selectedIds.has(p.id)),
    [players, selectedIds],
  );

  return (
    <div className={styles.page}>
      <div className={styles.background}>
        <div className={styles.glowTop} />
        <div className={styles.glowBottom} />
      </div>

      <div className={styles.main}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            {step === 0
              ? "Crea la tua squadra"
              : step <= 4
                ? `Scegli i ${DRAFT_STEPS[step - 1].label}`
                : "Conferma squadra"}
          </h1>
          <p className={styles.subtitle}>
            {step === 0
              ? "Scegli un nome per la tua squadra fantasy"
              : step <= 4
                ? `Seleziona ${DRAFT_STEPS[step - 1].required} giocatori`
                : "Controlla la tua rosa prima di confermare"}
          </p>
        </div>

        {/* Progress */}
        <div className={styles.progressBar}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`${styles.progressStep} ${i <= step ? styles.active : ""}`}
            />
          ))}
        </div>

        {/* Budget (visible during draft) */}
        {step >= 1 && (
          <div className={styles.budgetBar}>
            <span className={styles.budgetLabel}>Budget rimanente</span>
            <span
              className={`${styles.budgetValue} ${
                remaining < 10
                  ? styles.danger
                  : remaining < 25
                    ? styles.warning
                    : ""
              }`}
            >
              {remaining} crediti
            </span>
          </div>
        )}

        {/* Error */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Step 0: Team Name */}
        {step === 0 && (
          <div className={styles.nameStep}>
            <div className={styles.inputGroup}>
              <label htmlFor="teamName">Nome squadra</label>
              <input
                id="teamName"
                className={styles.input}
                type="text"
                maxLength={30}
                placeholder="Es. I Leoni del Liceo"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  setError(null);
                }}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Steps 1-4: Draft by role */}
        {step >= 1 && step <= 4 && (() => {
          const ds = DRAFT_STEPS[step - 1];
          const rolePlayers = playersByRole[ds.role] || [];
          const filteredPlayers = filterPlayers(rolePlayers);
          const currentCount = countForRole(ds.role);

          return (
            <div className={styles.draftStep}>
              <div className={styles.roleHeader}>
                <span className={styles.roleTitle}>{ds.label}</span>
                <span className={styles.roleCount}>
                  {currentCount}/{ds.required}
                </span>
              </div>

              {/* Search */}
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Cerca per nome o scuola..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className={styles.playerList}>
                {filteredPlayers.length === 0 && (
                  <div className={styles.noResults}>
                    Nessun giocatore trovato
                  </div>
                )}
                {filteredPlayers.map((player) => {
                  const isSelected = selectedIds.has(player.id);
                  const isFull = currentCount >= ds.required && !isSelected;
                  const tooExpensive = player.value > remaining && !isSelected;
                  const isDisabled = isFull || tooExpensive;

                  return (
                    <div
                      key={player.id}
                      className={`${styles.playerCard} ${
                        isSelected ? styles.selected : ""
                      } ${isDisabled ? styles.disabled : ""}`}
                      onClick={() => {
                        if (!isDisabled) togglePlayer(player, ds.required);
                      }}
                    >
                      <div className={styles.playerCheckbox}>
                        {isSelected && <span className={styles.checkmark}>✓</span>}
                      </div>
                      <div className={styles.playerInfo}>
                        <div className={styles.playerName}>{player.name}</div>
                        <div className={styles.playerSchool}>{player.schoolName}</div>
                      </div>
                      <div className={styles.playerValue}>{player.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Step 5: Confirm */}
        {step === 5 && (
          <div className={styles.confirmStep}>
            <div className={styles.summaryRow}>
              <span>Squadra</span>
              <span className="value">{teamName}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Costo totale</span>
              <span className="value">{spent} crediti</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Budget rimanente</span>
              <span className="value">{remaining} crediti</span>
            </div>

            {DRAFT_STEPS.map((ds) => {
              const rolePlayers = selectedPlayers.filter(
                (p) => p.role === ds.role,
              );
              return (
                <div key={ds.role} className={styles.confirmSection}>
                  <h3>
                    {ds.label} ({rolePlayers.length})
                  </h3>
                  {rolePlayers.map((p) => (
                    <div key={p.id} className={styles.confirmPlayer}>
                      <span>{p.name}</span>
                      <span>{p.value}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div className={styles.nav}>
          {step > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setError(null);
                setSearch("");
                setStep((s) => s - 1);
              }}
            >
              ← Indietro
            </Button>
          )}

          {step < TOTAL_STEPS - 1 ? (
            <Button
              variant="primary"
              disabled={!canGoNext}
              onClick={() => {
                setError(null);
                setSearch("");
                setStep((s) => s + 1);
              }}
            >
              Avanti →
            </Button>
          ) : (
            <button
              className={`${styles.confirmButton} ${isSubmitting ? styles.confirmDisabled : ""}`}
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              <span className={styles.confirmIcon}>🏆</span>
              <span>{isSubmitting ? "Creazione in corso..." : "Conferma squadra"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

