"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LineupPlayerData, SaveLineupResult } from "./actions";
import styles from "./LineupBuilder.module.css";

/* ─── TYPES ─── */

type Props = {
  matchdayId: string;
  matchdayNumber: number;
  deadline: string;
  initialPlayers: LineupPlayerData[];
  userId: string;
  saveAction: (
    userId: string,
    matchdayId: string,
    starterIds: string[],
    benchIds: string[],
  ) => Promise<SaveLineupResult>;
  closeAction: () => void;
};

const ROLE_LABELS: Record<string, string> = {
  GK: "POR",
  DEF: "DIF",
  MID: "CEN",
  ATT: "ATT",
};


/* ─── FORMATION FIELD (visual) ─── */

function getFieldRows(starters: LineupPlayerData[]) {
  const gk = starters.filter((p) => p.role === "GK");
  const def = starters.filter((p) => p.role === "DEF");
  const mid = starters.filter((p) => p.role === "MID");
  const att = starters.filter((p) => p.role === "ATT");
  return [gk, def, mid, att];
}

/* ─── SORTABLE PLAYER ITEM ─── */

function SortablePlayer({
  player,
  zone,
}: {
  player: LineupPlayerData;
  zone: "starter" | "bench";
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: player.realPlayerId,
    data: { zone, player },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.playerChip} ${styles[`chip${player.role}`]}`}
      {...attributes}
      {...listeners}
    >
      <span className={styles.chipRole}>{ROLE_LABELS[player.role]}</span>
      <span className={styles.chipName}>{player.name.split(" ").pop()}</span>
    </div>
  );
}

/* ─── PLAYER OVERLAY (during drag) ─── */

function DragOverlayPlayer({ player }: { player: LineupPlayerData }) {
  return (
    <div
      className={`${styles.playerChip} ${styles[`chip${player.role}`]} ${styles.dragging}`}
    >
      <span className={styles.chipRole}>{ROLE_LABELS[player.role]}</span>
      <span className={styles.chipName}>{player.name.split(" ").pop()}</span>
    </div>
  );
}

/* ─── FIELD PITCH PLAYER (visual circles on the pitch) ─── */

function FieldPlayer({ player }: { player: LineupPlayerData }) {
  return (
    <div className={`${styles.fieldPlayer} ${styles[`field${player.role}`]}`}>
      <div className={styles.fieldPlayerCircle}>
        <span className={styles.fieldPlayerRole}>{ROLE_LABELS[player.role]}</span>
      </div>
      <span className={styles.fieldPlayerName}>
        {player.name.split(" ").pop()}
      </span>
    </div>
  );
}

/* ─── MAIN COMPONENT ─── */

export default function LineupBuilder({
  matchdayId,
  matchdayNumber,
  deadline,
  initialPlayers,
  userId,
  saveAction,
  closeAction,
}: Props) {
  const [players, setPlayers] = useState<LineupPlayerData[]>(initialPlayers);
  const [activePlayer, setActivePlayer] = useState<LineupPlayerData | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [view, setView] = useState<"field" | "list">("field");

  const starters = players.filter((p) => p.isStarter);
  const bench = players.filter((p) => !p.isStarter);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = event.active.id as string;
      const player = players.find((p) => p.realPlayerId === id);
      setActivePlayer(player ?? null);
    },
    [players],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActivePlayer(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Handle dropping on zones
      if (overId === "starter-zone" || overId === "bench-zone") {
        const targetIsStarter = overId === "starter-zone";
        setPlayers((prev) => {
          const player = prev.find((p) => p.realPlayerId === activeId);
          if (!player) return prev;
          // Only swap if moving to different zone
          if (player.isStarter === targetIsStarter) return prev;
          // Check constraints
          const currentStarters = prev.filter((p) => p.isStarter);
          if (targetIsStarter && currentStarters.length >= 11) return prev;
          if (!targetIsStarter && currentStarters.length <= 1) return prev;

          return prev.map((p) =>
            p.realPlayerId === activeId ? { ...p, isStarter: targetIsStarter } : p,
          );
        });
        return;
      }

      // Swap two players
      setPlayers((prev) => {
        const activePlayer = prev.find((p) => p.realPlayerId === activeId);
        const overPlayer = prev.find((p) => p.realPlayerId === overId);
        if (!activePlayer || !overPlayer) return prev;

        // If both in same zone, just reorder (no-op for our purposes)
        if (activePlayer.isStarter === overPlayer.isStarter) return prev;

        // Swap their starter status
        return prev.map((p) => {
          if (p.realPlayerId === activeId)
            return { ...p, isStarter: overPlayer.isStarter };
          if (p.realPlayerId === overId)
            return { ...p, isStarter: activePlayer.isStarter };
          return p;
        });
      });
    },
    [],
  );

  const handleSave = async () => {
    setMessage(null);
    setSaving(true);

    const starterIds = starters.map((p) => p.realPlayerId);
    const benchIds = bench.map((p) => p.realPlayerId);

    try {
      const result = await saveAction(userId, matchdayId, starterIds, benchIds);
      if (result.success) {
        setMessage({ type: "success", text: "Formazione salvata! ✅" });
        setTimeout(() => closeAction(), 1200);
      } else {
        setMessage({ type: "error", text: result.error ?? "Errore sconosciuto" });
      }
    } catch {
      setMessage({ type: "error", text: "Errore di rete, riprova." });
    } finally {
      setSaving(false);
    }
  };

  const formatDeadline = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fieldRows = getFieldRows(starters);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <button className={styles.closeBtn} onClick={closeAction} aria-label="Chiudi">
            ✕
          </button>
          <div className={styles.modalTitle}>
            <h2>Giornata {matchdayNumber}</h2>
            <span className={styles.deadlineText}>
              Deadline: {formatDeadline(deadline)}
            </span>
          </div>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleBtn} ${view === "field" ? styles.toggleActive : ""}`}
              onClick={() => setView("field")}
            >
              ⚽
            </button>
            <button
              className={`${styles.toggleBtn} ${view === "list" ? styles.toggleActive : ""}`}
              onClick={() => setView("list")}
            >
              ☰
            </button>
          </div>
        </div>

        {/* Counter */}
        <div className={styles.counter}>
          <span className={starters.length === 11 ? styles.counterValid : styles.counterInvalid}>
            {starters.length}/11 titolari
          </span>
          <span className={bench.length === 4 ? styles.counterValid : styles.counterInvalid}>
            {bench.length}/4 panchina
          </span>
        </div>

        {/* Field View */}
        {view === "field" && (
          <div className={styles.pitchContainer}>
            <div className={styles.pitch}>
              <div className={styles.pitchLines}>
                <div className={styles.centerCircle} />
                <div className={styles.centerLine} />
                <div className={styles.penaltyAreaTop} />
                <div className={styles.penaltyAreaBottom} />
              </div>
              {fieldRows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className={styles.pitchRow}
                  style={{
                    top: `${8 + rowIdx * 24}%`,
                  }}
                >
                  {row.map((player) => (
                    <FieldPlayer key={player.realPlayerId} player={player} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drag & Drop List */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.listsContainer}>
            {/* Starters */}
            <div className={styles.zoneSection}>
              <div className={styles.zoneHeader}>
                <span className={styles.zoneTitle}>⚽ Titolari</span>
                <span className={styles.zoneCount}>{starters.length}/11</span>
              </div>
              <SortableContext
                items={starters.map((p) => p.realPlayerId)}
                strategy={verticalListSortingStrategy}
              >
                <div className={styles.zoneList} id="starter-zone">
                  {starters.length === 0 ? (
                    <div className={styles.zonePlaceholder}>
                      Trascina qui i titolari
                    </div>
                  ) : (
                    starters.map((player) => (
                      <SortablePlayer
                        key={player.realPlayerId}
                        player={player}
                        zone="starter"
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </div>

            {/* Bench */}
            <div className={styles.zoneSection}>
              <div className={styles.zoneHeader}>
                <span className={styles.zoneTitle}>🪑 Panchina</span>
                <span className={styles.zoneCount}>{bench.length}/4</span>
              </div>
              <SortableContext
                items={bench.map((p) => p.realPlayerId)}
                strategy={verticalListSortingStrategy}
              >
                <div className={styles.zoneList} id="bench-zone">
                  {bench.length === 0 ? (
                    <div className={styles.zonePlaceholder}>
                      Trascina qui i panchinari
                    </div>
                  ) : (
                    bench.map((player) => (
                      <SortablePlayer
                        key={player.realPlayerId}
                        player={player}
                        zone="bench"
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </div>
          </div>

          <DragOverlay>
            {activePlayer ? <DragOverlayPlayer player={activePlayer} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Message */}
        {message && (
          <div
            className={
              message.type === "success" ? styles.msgSuccess : styles.msgError
            }
          >
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || starters.length !== 11 || bench.length !== 4}
        >
          {saving ? "Salvataggio..." : "Conferma formazione"}
        </button>
      </div>
    </div>
  );
}

