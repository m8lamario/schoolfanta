# 🤖 SchoolFanta — Piano di Automazione DB

> Documento creato il 12 Marzo 2026.
> Obiettivo: ridurre al minimo gli interventi manuali dell'admin, automatizzando tutto il possibile.

---

## Indice

1. [Panoramica architetturale](#1-panoramica-architetturale)
2. [Cosa rimane manuale e perché](#2-cosa-rimane-manuale-e-perché)
3. [Passo 1 — Preparazione: `isAdmin` + protezione route](#3-passo-1--preparazione-isadmin--protezione-route)
4. [Passo 2 — Logica riusabile: `scoring.ts` e `external-api.ts`](#4-passo-2--logica-riusabile-scoringts-e-external-apits)
5. [Passo 3 — Cron 1: Lock automatico formazioni](#5-passo-3--cron-1-lock-automatico-formazioni)
6. [Passo 4 — Cron 2: Sincronizzazione live partite](#6-passo-4--cron-2-sincronizzazione-live-partite)
7. [Passo 5 — Cron 3: Auto-score e chiusura giornata](#7-passo-5--cron-3-auto-score-e-chiusura-giornata)
8. [Passo 6 — Pannello Admin: struttura pagine](#8-passo-6--pannello-admin-struttura-pagine)
9. [Passo 7 — Pannello Admin: form inserimento voti](#9-passo-7--pannello-admin-form-inserimento-voti)
10. [Passo 8 — Schedulazione con GitHub Actions](#10-passo-8--schedulazione-con-github-actions)
11. [Considerazioni finali](#11-considerazioni-finali)

---

## 1. Panoramica architetturale

```
GitHub Actions (cron) ──► POST /api/cron/lock-matchday    → status: open → locked
                     ──► POST /api/cron/sync-matches       → aggiorna Match/TeamMatch/MatchEvent
                     ──► POST /api/cron/auto-score         → calcola MatchdayScore + status: scored

Admin browser       ──► /admin/votes      → inserisce PlayerVote (form)
                    ──► /admin/matchdays  → crea Matchday + associa Match
                    ──► POST /api/admin/recalculate → ricalcolo manuale
```

### Ciclo di vita automatizzato di una giornata

```
PRIMA (tutto manuale):
  Admin crea Matchday → Admin aspetta deadline → Admin fa update → Admin vede le partite
  → Admin inserisce voti → Admin calcola punteggi → Admin chiude giornata
  (6 interventi manuali)

DOPO (quasi tutto automatico):
  Admin crea Matchday ──► AUTOMATICO: lock alla deadline
                     ──► AUTOMATICO: sync live ogni 5 min
                     ──► Admin inserisce voti (UNICO step manuale rimasto)
                     ──► AUTOMATICO: calcola punteggi + chiude giornata
  (1-2 interventi manuali)
```

---

## 2. Cosa rimane manuale e perché

| Azione | Rimane manuale? | Motivazione |
|---|---|---|
| Inserimento `PlayerVote` | ✅ **Sì** | I voti sono giudizi soggettivi; nessuna API esterna li fornisce |
| Creazione `Matchday` (una volta/settimana) | ✅ **Sì** | Richiede decisione umana sul numero e la deadline |
| Associare `Match` alla giornata | ⚠️ **Parzialmente** | Se l'API esterna fornisce `matchdayNumber`, può essere automatizzato nel cron sync |
| Lock formazioni | ❌ **No — automatico** | Cron ogni 15 min controlla `deadline < now()` |
| Sync live / eventi partite | ❌ **No — automatico** | Cron ogni 5 min durante la finestra partite |
| Calcolo `MatchdayScore` | ❌ **No — automatico** | Cron orario dopo che tutti i match sono `finished` e i voti esistono |
| Chiusura giornata (`→ scored`) | ❌ **No — automatico** | Incluso nel cron auto-score |

---

## 3. Passo 1 — Preparazione: `isAdmin` + protezione route

### 3.1 Schema Prisma

```prisma
// prisma/schema.prisma
model User {
  // ...campi esistenti...
  isAdmin Boolean @default(false)   // ← aggiungere questo
}
```

Poi eseguire:
```bash
npx prisma migrate dev --name add_isAdmin
```

### 3.2 Propagare `isAdmin` nel token JWT

```typescript
// src/lib/auth.ts — nella callback jwt
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      // Al login, leggi isAdmin dal DB
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isAdmin: true, hasTeam: true, /* ...altri campi... */ }
      });
      token.isAdmin = dbUser?.isAdmin ?? false;
    }
    return token;
  },
  async session({ session, token }) {
    session.user.isAdmin = token.isAdmin as boolean;
    return session;
  }
}
```

### 3.3 Tipi TypeScript

```typescript
// src/types/next-auth.d.ts
declare module "next-auth" {
  interface Session {
    user: {
      isAdmin?: boolean;
      // ...altri campi esistenti...
    }
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    isAdmin?: boolean;
  }
}
```

### 3.4 Middleware — protezione `/admin`

```typescript
// middleware.ts — aggiungere controllo per /admin
if (pathname.startsWith("/admin")) {
  if (!token?.isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
}
```

### 3.5 Variabili d'ambiente

```env
# .env — aggiungere
CRON_SECRET=<stringa casuale lunga, almeno 32 caratteri>
EXTERNAL_API_URL=https://api-esterna.example.com
EXTERNAL_API_KEY=<chiave API esterna>
```

---

## 4. Passo 2 — Logica riusabile: `scoring.ts` e `external-api.ts`

Tutta la logica di calcolo e sync va in file di libreria, in modo che cron, admin panel e server action usino **sempre lo stesso codice**.

### 4.1 `src/lib/scoring.ts`

```typescript
import { prisma } from "@/lib/prisma";

export async function calculateMatchdayScores(matchdayId: string) {
  // 1. Prendi tutte le lineup per questa giornata (solo titolari)
  const lineups = await prisma.lineup.findMany({
    where: { matchdayId },
    include: {
      players: {
        where: { isStarter: true },
      },
    },
  });

  let teamsScored = 0;

  for (const lineup of lineups) {
    let totalPoints = 0;

    for (const lp of lineup.players) {
      const vote = await prisma.playerVote.findUnique({
        where: {
          realPlayerId_matchdayId: {
            realPlayerId: lp.realPlayerId,
            matchdayId,
          },
        },
      });

      if (vote) {
        // Formula: voto + 3*gol + assist − 0.5*giallo − 2*rosso
        totalPoints +=
          vote.vote +
          3 * vote.goals +
          1 * vote.assists -
          0.5 * vote.yellowCards -
          2 * vote.redCards;
      }
      // Se il giocatore non ha il voto → 0 punti (non ha giocato)
    }

    // Salva (o aggiorna) il punteggio — idempotente con upsert
    await prisma.matchdayScore.upsert({
      where: {
        fantasyTeamId_matchdayId: {
          fantasyTeamId: lineup.fantasyTeamId,
          matchdayId,
        },
      },
      update: { points: Math.round(totalPoints * 10) / 10 },
      create: {
        fantasyTeamId: lineup.fantasyTeamId,
        matchdayId,
        points: Math.round(totalPoints * 10) / 10,
      },
    });

    teamsScored++;
  }

  return { teamsScored };
}
```

### 4.2 `src/lib/external-api.ts`

```typescript
// Client tipizzato per l'API esterna delle partite scolastiche
// ⚠️ Adatta la struttura alla risposta reale della tua API

export type ApiMatchEvent = {
  id: number;
  minute: number;
  event_type: "GOAL" | "YELLOW_CARD" | "RED_CARD" | "ASSIST" | "SUBSTITUTION";
  player_id?: number; // ID esterno del giocatore (opzionale)
};

export type ApiTeamMatch = {
  id: number;
  team: { slug: string };
  is_home: boolean;
  score: number;
  events: ApiMatchEvent[];
};

export type ApiMatch = {
  id: number;
  datetime: string;
  status: "scheduled" | "live" | "finished";
  finished: boolean;
  score_text?: string;
  name?: string;
  stadium: { id: number; name: string; address?: string };
  teams: ApiTeamMatch[];
};

export async function fetchMatchesByMatchday(
  externalMatchdayId: number
): Promise<ApiMatch[]> {
  const res = await fetch(
    `${process.env.EXTERNAL_API_URL}/matchdays/${externalMatchdayId}/matches`,
    {
      headers: { Authorization: `Bearer ${process.env.EXTERNAL_API_KEY}` },
      signal: AbortSignal.timeout(5000), // timeout 5 secondi
    }
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

---

## 5. Passo 3 — Cron 1: Lock automatico formazioni

**Nuovo file:** `src/app/api/cron/lock-matchday/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  // 1. Autenticazione: solo chi conosce CRON_SECRET può chiamare questa route
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Trova tutte le giornate "open" con deadline già scaduta
  const expired = await prisma.matchday.findMany({
    where: {
      status: "open",
      deadline: { lt: new Date() }, // deadline < adesso
    },
  });

  if (expired.length === 0) {
    return NextResponse.json({ locked: 0, message: "Nessuna giornata da bloccare" });
  }

  // 3. Blocca tutte le giornate scadute
  await prisma.matchday.updateMany({
    where: { id: { in: expired.map((m) => m.id) } },
    data: { status: "locked" },
  });

  return NextResponse.json({
    locked: expired.length,
    ids: expired.map((m) => m.id),
    numbers: expired.map((m) => m.number),
  });
}
```

**Schedulazione:** ogni 15 minuti — precisione sufficiente per una deadline serale.

---

## 6. Passo 4 — Cron 2: Sincronizzazione live partite

**Nuovo file:** `src/app/api/cron/sync-matches/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMatchesByMatchday } from "@/lib/external-api";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trova giornate "locked" (partite in corso o da giocare)
  const lockedMatchdays = await prisma.matchday.findMany({
    where: { status: "locked" },
  });

  let matchesUpdated = 0;
  let eventsAdded = 0;

  for (const matchday of lockedMatchdays) {
    // ⚠️ Qui devi adattare il mapping tra Matchday.number e l'ID esterno della giornata
    const externalMatchdayId = matchday.number; // o un campo dedicato se diverso

    const apiMatches = await fetchMatchesByMatchday(externalMatchdayId);

    for (const apiMatch of apiMatches) {
      // Upsert stadio
      const stadium = await prisma.stadium.upsert({
        where: { externalId: apiMatch.stadium.id },
        update: { name: apiMatch.stadium.name },
        create: {
          externalId: apiMatch.stadium.id,
          name: apiMatch.stadium.name,
          address: apiMatch.stadium.address,
        },
      });

      // Upsert partita
      const match = await prisma.match.upsert({
        where: { externalId: apiMatch.id },
        update: {
          status: apiMatch.status,
          finished: apiMatch.finished,
          scoreText: apiMatch.score_text,
        },
        create: {
          externalId: apiMatch.id,
          datetime: new Date(apiMatch.datetime),
          stadiumId: stadium.id,
          matchdayId: matchday.id,
          name: apiMatch.name,
          status: apiMatch.status,
          finished: apiMatch.finished,
          scoreText: apiMatch.score_text,
        },
      });
      matchesUpdated++;

      // Upsert TeamMatch + eventi
      for (const apiTeam of apiMatch.teams) {
        const school = await prisma.school.findUnique({
          where: { slug: apiTeam.team.slug },
        });
        if (!school) continue; // scuola non trovata nel DB → skip

        const teamMatch = await prisma.teamMatch.upsert({
          where: { externalId: apiTeam.id },
          update: { score: apiTeam.score },
          create: {
            externalId: apiTeam.id,
            matchId: match.id,
            schoolId: school.id,
            isHome: apiTeam.is_home,
            score: apiTeam.score,
          },
        });

        // Upsert eventi
        for (const ev of apiTeam.events) {
          await prisma.matchEvent.upsert({
            where: { externalId: ev.id },
            update: { minute: ev.minute },
            create: {
              externalId: ev.id,
              teamMatchId: teamMatch.id,
              minute: ev.minute,
              eventType: ev.event_type,
              // playerId: trova RealPlayer da ev.player_id se disponibile
            },
          });
          eventsAdded++;
        }
      }
    }
  }

  return NextResponse.json({ matchesUpdated, eventsAdded });
}
```

**Schedulazione:** ogni 5 minuti.

> ⚠️ Attiva questo cron solo durante la finestra oraria delle partite per risparmiare chiamate API.

---

## 7. Passo 5 — Cron 3: Auto-score e chiusura giornata

**Nuovo file:** `src/app/api/cron/auto-score/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateMatchdayScores } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trova giornate bloccate (locked)
  const lockedMatchdays = await prisma.matchday.findMany({
    where: { status: "locked" },
    include: {
      matches: { select: { id: true, finished: true } },
      votes: { select: { id: true } },
    },
  });

  const results = [];

  for (const matchday of lockedMatchdays) {
    // Condizione 1: tutte le partite devono essere finite
    const allMatchesFinished =
      matchday.matches.length > 0 &&
      matchday.matches.every((m) => m.finished);

    if (!allMatchesFinished) {
      results.push({
        matchdayNumber: matchday.number,
        skipped: true,
        reason: "Non tutte le partite sono finite",
      });
      continue;
    }

    // Condizione 2: ci devono essere voti inseriti dall'admin
    if (matchday.votes.length === 0) {
      results.push({
        matchdayNumber: matchday.number,
        skipped: true,
        reason: "Nessun voto inserito ancora",
      });
      continue;
    }

    // Calcola i punteggi
    const { teamsScored } = await calculateMatchdayScores(matchday.id);

    // Chiudi la giornata → "scored"
    await prisma.matchday.update({
      where: { id: matchday.id },
      data: { status: "scored" },
    });

    results.push({
      matchdayNumber: matchday.number,
      skipped: false,
      teamsScored,
    });
  }

  return NextResponse.json({ results });
}
```

**Schedulazione:** ogni ora.

> 📌 Questo cron è **idempotente**: se i voti non sono ancora stati inseriti non fa nulla. Non appena l'admin li inserisce, al prossimo tick di un'ora calcola e chiude tutto automaticamente.

---

## 8. Passo 6 — Pannello Admin: struttura pagine

Tutte le pagine admin vivono sotto `src/app/admin/` e sono protette dal middleware.

### Struttura file

```
src/app/admin/
  layout.tsx          ← Layout con navbar admin + doppia verifica isAdmin server-side
  page.tsx            ← Dashboard: stato giornate, alert, link rapidi
  actions.ts          ← Server Actions admin
  matchdays/
    page.tsx          ← Form: crea Matchday + associa Match
  votes/
    page.tsx          ← Selezione giornata + tabella voti
    VotesForm.tsx     ← Client Component: form interattivo voti
```

### `src/app/admin/layout.tsx` (Server Component)

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions);

  // Doppio controllo: middleware + verifica server-side
  if (!session?.user?.isAdmin) redirect("/dashboard");

  return (
    <div>
      <nav>
        <a href="/admin">Dashboard</a>
        <a href="/admin/matchdays">Giornate</a>
        <a href="/admin/votes">Voti</a>
      </nav>
      <main>{children}</main>
    </div>
  );
}
```

### `src/app/admin/actions.ts` (Server Actions)

```typescript
"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateMatchdayScores } from "@/lib/scoring";

// Verifica admin — richiamata in ogni action
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) throw new Error("Non autorizzato");
  return session;
}

// Crea nuova giornata
export async function createMatchday(data: {
  number: number;
  deadline: string; // ISO string
}) {
  await requireAdmin();
  return prisma.matchday.create({
    data: {
      number: data.number,
      deadline: new Date(data.deadline),
      status: "open",
    },
  });
}

// Inserisci/aggiorna voti in blocco
export async function upsertManyPlayerVotes(
  votes: Array<{
    realPlayerId: string;
    matchdayId: string;
    vote: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  }>
) {
  await requireAdmin();
  await Promise.all(
    votes.map((v) =>
      prisma.playerVote.upsert({
        where: {
          realPlayerId_matchdayId: {
            realPlayerId: v.realPlayerId,
            matchdayId: v.matchdayId,
          },
        },
        update: {
          vote: v.vote,
          goals: v.goals,
          assists: v.assists,
          yellowCards: v.yellowCards,
          redCards: v.redCards,
        },
        create: v,
      })
    )
  );
  return { upserted: votes.length };
}

// Ricalcolo manuale punteggi (bottone di emergenza)
export async function triggerRecalculate(matchdayId: string) {
  await requireAdmin();
  return calculateMatchdayScores(matchdayId);
}
```

---

## 9. Passo 7 — Pannello Admin: form inserimento voti

### `src/app/admin/votes/page.tsx` (Server Component)

```typescript
import { prisma } from "@/lib/prisma";

export default async function VotesPage({
  searchParams,
}: {
  searchParams: { matchdayId?: string };
}) {
  // Tutte le giornate (per il selettore)
  const matchdays = await prisma.matchday.findMany({
    orderBy: { number: "desc" },
  });

  const selectedMatchdayId = searchParams.matchdayId ?? matchdays[0]?.id;

  // Tutti i giocatori reali con eventuali voti già salvati
  const players = selectedMatchdayId
    ? await prisma.realPlayer.findMany({
        include: {
          school: { select: { shortName: true } },
          votes: {
            where: { matchdayId: selectedMatchdayId },
          },
        },
        orderBy: [{ school: { name: "asc" } }, { role: "asc" }, { name: "asc" }],
      })
    : [];

  return (
    <div>
      <h1>Inserimento Voti</h1>
      {/* Selettore giornata */}
      <form method="GET">
        <select name="matchdayId" defaultValue={selectedMatchdayId}>
          {matchdays.map((md) => (
            <option key={md.id} value={md.id}>
              Giornata {md.number} ({md.status})
            </option>
          ))}
        </select>
        <button type="submit">Carica</button>
      </form>

      {/* Form voti — Client Component */}
      {selectedMatchdayId && (
        <VotesForm
          players={players}
          matchdayId={selectedMatchdayId}
        />
      )}
    </div>
  );
}
```

### `src/app/admin/votes/VotesForm.tsx` (Client Component)

```typescript
"use client";
import { useState } from "react";
import { upsertManyPlayerVotes, triggerRecalculate } from "../actions";

export default function VotesForm({ players, matchdayId }) {
  const [votes, setVotes] = useState(
    // Pre-popola con voti esistenti o valori default
    Object.fromEntries(
      players.map((p) => [
        p.id,
        {
          vote: p.votes[0]?.vote ?? 6,
          goals: p.votes[0]?.goals ?? 0,
          assists: p.votes[0]?.assists ?? 0,
          yellowCards: p.votes[0]?.yellowCards ?? 0,
          redCards: p.votes[0]?.redCards ?? 0,
          hasPlayed: p.votes.length > 0, // checkbox "ha giocato"
        },
      ])
    )
  );

  const handleSave = async () => {
    const data = Object.entries(votes)
      .filter(([, v]) => v.hasPlayed) // solo giocatori che hanno giocato
      .map(([playerId, v]) => ({
        realPlayerId: playerId,
        matchdayId,
        vote: v.vote,
        goals: v.goals,
        assists: v.assists,
        yellowCards: v.yellowCards,
        redCards: v.redCards,
      }));

    await upsertManyPlayerVotes(data);
    alert(`${data.length} voti salvati!`);
  };

  const handleRecalculate = async () => {
    const result = await triggerRecalculate(matchdayId);
    alert(`Punteggi ricalcolati per ${result.teamsScored} squadre.`);
  };

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Giocatore</th>
            <th>Scuola</th>
            <th>Ruolo</th>
            <th>Ha giocato</th>
            <th>Voto</th>
            <th>Gol</th>
            <th>Assist</th>
            <th>Giallo</th>
            <th>Rosso</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id} style={{ opacity: votes[p.id]?.hasPlayed ? 1 : 0.4 }}>
              <td>{p.name}</td>
              <td>{p.school.shortName}</td>
              <td>{p.role}</td>
              <td>
                <input
                  type="checkbox"
                  checked={votes[p.id]?.hasPlayed ?? false}
                  onChange={(e) =>
                    setVotes((v) => ({
                      ...v,
                      [p.id]: { ...v[p.id], hasPlayed: e.target.checked },
                    }))
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  max="10"
                  value={votes[p.id]?.vote ?? 6}
                  disabled={!votes[p.id]?.hasPlayed}
                  onChange={(e) =>
                    setVotes((v) => ({
                      ...v,
                      [p.id]: { ...v[p.id], vote: parseFloat(e.target.value) },
                    }))
                  }
                  style={{ width: 60 }}
                />
              </td>
              {/* Gol, Assist, Giallo, Rosso — stesso pattern */}
              <td><input type="number" min="0" value={votes[p.id]?.goals ?? 0} disabled={!votes[p.id]?.hasPlayed} onChange={(e) => setVotes(v => ({ ...v, [p.id]: { ...v[p.id], goals: +e.target.value } }))} style={{ width: 45 }} /></td>
              <td><input type="number" min="0" value={votes[p.id]?.assists ?? 0} disabled={!votes[p.id]?.hasPlayed} onChange={(e) => setVotes(v => ({ ...v, [p.id]: { ...v[p.id], assists: +e.target.value } }))} style={{ width: 45 }} /></td>
              <td><input type="number" min="0" max="2" value={votes[p.id]?.yellowCards ?? 0} disabled={!votes[p.id]?.hasPlayed} onChange={(e) => setVotes(v => ({ ...v, [p.id]: { ...v[p.id], yellowCards: +e.target.value } }))} style={{ width: 45 }} /></td>
              <td><input type="number" min="0" max="1" value={votes[p.id]?.redCards ?? 0} disabled={!votes[p.id]?.hasPlayed} onChange={(e) => setVotes(v => ({ ...v, [p.id]: { ...v[p.id], redCards: +e.target.value } }))} style={{ width: 45 }} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button onClick={handleSave}>💾 Salva tutti i voti</button>
        <button onClick={handleRecalculate} style={{ background: "#f59e0b" }}>
          🔄 Ricalcola punteggi ora
        </button>
      </div>
    </div>
  );
}
```

---

## 10. Passo 8 — Schedulazione con GitHub Actions

**Nuovo file:** `.github/workflows/cron.yml`

```yaml
name: SchoolFanta Cron Jobs

on:
  schedule:
    - cron: "*/15 * * * *"   # ogni 15 minuti → lock-matchday
    - cron: "*/5 * * * *"    # ogni 5 minuti  → sync-matches
    - cron: "0 * * * *"      # ogni ora        → auto-score
  workflow_dispatch:           # trigger manuale di emergenza dal pannello GitHub

env:
  APP_URL: ${{ secrets.APP_URL }}
  CRON_SECRET: ${{ secrets.CRON_SECRET }}

jobs:
  lock-matchday:
    if: github.event.schedule == '*/15 * * * *' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Lock expired matchdays
        run: |
          curl -sf -X POST "$APP_URL/api/cron/lock-matchday" \
               -H "Authorization: Bearer $CRON_SECRET"

  sync-matches:
    if: github.event.schedule == '*/5 * * * *' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Sync live match data from external API
        run: |
          curl -sf -X POST "$APP_URL/api/cron/sync-matches" \
               -H "Authorization: Bearer $CRON_SECRET"

  auto-score:
    if: github.event.schedule == '0 * * * *' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Auto calculate scores and close matchday
        run: |
          curl -sf -X POST "$APP_URL/api/cron/auto-score" \
               -H "Authorization: Bearer $CRON_SECRET"
```

### GitHub Secrets da configurare

Vai su **GitHub → Repository → Settings → Secrets and variables → Actions** e aggiungi:

| Secret | Valore |
|---|---|
| `APP_URL` | URL della tua app (es. `https://tuaapp.ondigitalocean.app`) |
| `CRON_SECRET` | Stessa stringa del `.env` locale |

---

## 11. Considerazioni finali

### Alternativa: DigitalOcean App Platform Jobs

Se l'app è deployata su **DigitalOcean App Platform**, puoi usare i **Job nativi** nel file `app.yaml` invece di GitHub Actions:

```yaml
# app.yaml (DigitalOcean App Platform)
jobs:
  - name: lock-matchday
    kind: POST_DEPLOY  # oppure usa un custom cron
    run_command: curl -X POST $APP_URL/api/cron/lock-matchday -H "Authorization: Bearer $CRON_SECRET"
```

### Alternativa: `node-cron` in-process

Se usi un **Droplet con PM2**, puoi aggiungere un file `src/lib/cron-worker.ts` con `node-cron`:

```typescript
import cron from "node-cron";
// ogni 15 minuti
cron.schedule("*/15 * * * *", () => {
  fetch(`${process.env.APP_URL}/api/cron/lock-matchday`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
});
```

### Sicurezza

- Le route `/api/cron/*` verificano SEMPRE `Authorization: Bearer CRON_SECRET` — senza token ritornano **401**
- Le Server Action admin verificano SEMPRE `isAdmin` a livello server — il middleware è solo un primo strato
- Il `CRON_SECRET` non va mai esposto nel client bundle

### Ordine di implementazione consigliato

```
1. ✅ isAdmin su schema + migrazione          (COMPLETATO)
2. ✅ src/lib/scoring.ts                      (COMPLETATO)
3. ✅ /api/cron/lock-matchday                 (COMPLETATO)
4. ✅ /api/cron/auto-score                    (COMPLETATO)
5. ✅ GitHub Actions workflow                 (COMPLETATO)
6. ✅ Pannello admin /admin/votes             (COMPLETATO)
7. ⏳ /api/cron/sync-matches + external-api  (dipende dall'API esterna)
```

