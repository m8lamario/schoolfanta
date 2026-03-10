# 🗄️ SchoolFanta — Guida al Database

> Documento aggiornato al 10 Marzo 2026.
> Stack: **PostgreSQL** (DigitalOcean) + **Prisma ORM** + **Next.js Server Actions**

---

## Indice

1. [Panoramica visuale](#1-panoramica-visuale)
2. [Tabelle Auth (gestite da NextAuth)](#2-tabelle-auth)
3. [Tabelle di Gioco (il cuore del fantasy)](#3-tabelle-di-gioco)
4. [Tabelle Partite Reali (dati dall'API esterna)](#4-tabelle-partite-reali)
5. [Tabelle Leghe e Classifiche](#5-tabelle-leghe-e-classifiche)
6. [Relazioni chiave e come leggerle](#6-relazioni-chiave)
7. [Flusso dei dati: dalla partita reale al punteggio](#7-flusso-dei-dati)
8. [Query comuni e dove trovarle](#8-query-comuni)
9. [Comandi Prisma utili](#9-comandi-prisma)
10. [Checklist Admin — Cosa fare giornata per giornata](#10-checklist-admin--cosa-fare-giornata-per-giornata)

---

## 1. Panoramica visuale

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTENTICAZIONE                           │
│  User ──┬── Account (OAuth providers)                           │
│         ├── Session (sessioni attive)                           │
│         └── VerificationToken (verifica email)                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ userId
┌──────────────────────────▼──────────────────────────────────────┐
│                     MONDO FANTASY                               │
│                                                                 │
│  User ──── FantasyTeam ──┬── FantasyPlayer ── RealPlayer        │
│                          ├── Lineup ── LineupPlayer              │
│                          └── MatchdayScore                      │
│                                                                 │
│  Matchday ──┬── Lineup                                          │
│             ├── MatchdayScore                                   │
│             ├── PlayerVote                                      │
│             └── Match (partite reali)                           │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   PARTITE REALI                                 │
│                                                                 │
│  Stadium ── Match ── TeamMatch ── MatchEvent                    │
│                        │                         │              │
│                      School                  RealPlayer          │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      LEGHE                                      │
│  League ── LeagueMember ── User                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Tabelle Auth

Queste tabelle sono **gestite automaticamente da NextAuth/Auth.js** tramite il `PrismaAdapter`. Non le tocchi quasi mai manualmente.

### `User`
Il fulcro di tutto. Ogni persona registrata.

| Campo | Tipo | A cosa serve |
|---|---|---|
| `id` | String (cuid) | ID univoco |
| `email` | String? | Email di login (unique) |
| `passwordHash` | String? | Hash bcrypt della password (solo per Credentials login) |
| `name` | String? | Nome visualizzato |
| `firstName`, `lastName` | String? | Nome/cognome separati (profilo) |
| `emailVerified` | DateTime? | `null` = email non verificata, altrimenti data di verifica |
| `schoolId` | String? | FK → `School`. A quale scuola reale è associato |
| `budget` | Int (default 100) | Crediti rimasti dopo il draft |
| `hasTeam` | Boolean | `true` dopo che ha completato la creazione squadra |

**Relazioni:**
- `fantasyTeam` → ha **una sola** FantasyTeam (1:1)
- `school` → la scuola reale di appartenenza
- `createdLeagues` → leghe create da questo utente
- `leagueMemberships` → leghe a cui partecipa
- `accounts`, `sessions` → gestiti da NextAuth

### `Account`
Provider OAuth (Google, ecc.). Un utente può avere più account collegati.

### `Session`
Sessioni attive. Con strategia JWT non viene usata molto, ma il PrismaAdapter la richiede.

### `VerificationToken`
Token per verifica email e reset password. Scadono automaticamente.

---

## 3. Tabelle di Gioco

Queste sono le tabelle che **TU gestisci** per il fantasy game.

### `School`
Le scuole reali del torneo.

| Campo | Tipo | A cosa serve |
|---|---|---|
| `name` | String (unique) | "Liceo Scientifico Einstein" |
| `shortName` | String? | "EIN" — per badge, tabellini |
| `slug` | String? (unique) | "einstein" — per URL e match con API esterna |

**Relazioni:**
- `players` → tutti i `RealPlayer` di questa scuola
- `users` → utenti iscritti a questa scuola
- `teamMatches` → partecipazioni di questa scuola alle partite reali

### `RealPlayer`
I giocatori veri del torneo scolastico.

| Campo | Tipo | A cosa serve |
|---|---|---|
| `name` | String | "Giovanni Pellegrini" |
| `role` | String | `GK`, `DEF`, `MID`, `ATT` |
| `value` | Int | Prezzo di acquisto nel draft (in crediti) |
| `schoolId` | FK → School | A quale scuola appartiene |

**Relazioni:**
- `fantasyPlayers` → in quali squadre fantasy è stato comprato
- `lineupPlayers` → in quali formazioni è stato schierato
- `votes` → i voti ricevuti per ogni giornata
- `matchEvents` → eventi reali (gol, cartellini) nelle partite

### `FantasyTeam`
La squadra fantasy di un utente. **Relazione 1:1 con User** (ogni utente ha max 1 squadra).

| Campo | Tipo | A cosa serve |
|---|---|---|
| `name` | String | "I Campioni" |
| `userId` | String (unique) | FK → User (vincolo 1:1) |

**Relazioni:**
- `players` → rosa di 15 `FantasyPlayer`
- `lineups` → formazioni inviate per ogni giornata
- `scores` → punteggi ottenuti per ogni giornata

### `FantasyPlayer`
Tabella ponte: **quale giocatore reale è nella rosa di quale squadra fantasy**.

| Campo | Tipo | A cosa serve |
|---|---|---|
| `fantasyTeamId` | FK → FantasyTeam | La squadra che lo possiede |
| `realPlayerId` | FK → RealPlayer | Il giocatore reale acquistato |

> ⚠️ Nel MVP non c'è mercato: la rosa è fissata al momento del draft e non cambia mai.

### `Matchday`
Una giornata del torneo fantasy.

| Campo | Tipo | A cosa serve |
|---|---|---|
| `number` | Int (unique) | Numero giornata (1, 2, 3...) |
| `deadline` | DateTime | Dopo questa data le formazioni si bloccano |
| `status` | String | `open` → `locked` → `scored` |

**Ciclo di vita di una Matchday:**
```
open ──────────────► locked ──────────────► scored
 │                     │                      │
 │ Gli utenti          │ Si giocano le        │ Admin inserisce
 │ modificano la       │ partite reali.       │ i voti, il sistema
 │ formazione          │ Nessuno può più      │ calcola i punteggi
 │                     │ cambiare formazione  │
```

**Relazioni:**
- `lineups` → le formazioni inviate per questa giornata
- `scores` → i punteggi calcolati per questa giornata
- `votes` → i voti dei giocatori per questa giornata
- `matches` → le partite reali associate a questa giornata

### `Lineup`
La formazione inviata da una squadra per una giornata specifica.

| Campo | Vincolo | A cosa serve |
|---|---|---|
| `fantasyTeamId` | FK → FantasyTeam | Chi ha inviato la formazione |
| `matchdayId` | FK → Matchday | Per quale giornata |
| | `@@unique([fantasyTeamId, matchdayId])` | **Una sola formazione per squadra per giornata** |

### `LineupPlayer`
I giocatori schierati in una formazione.

| Campo | Tipo | A cosa serve |
|---|---|---|
| `lineupId` | FK → Lineup | In quale formazione |
| `realPlayerId` | FK → RealPlayer | Quale giocatore |
| `isStarter` | Boolean | `true` = titolare (prende punti), `false` = panchinaro |
| | `@@unique([lineupId, realPlayerId])` | **Niente duplicati nella stessa formazione** |

> 📌 Solo gli 11 titolari (`isStarter = true`) prendono punti. I 4 panchinari no.

### `PlayerVote`
Il voto assegnato (dall'admin) a un giocatore reale per una giornata.

| Campo | Tipo | A cosa serve |
|---|---|---|
| `realPlayerId` | FK → RealPlayer | Chi ha ricevuto il voto |
| `matchdayId` | FK → Matchday | Per quale giornata |
| `vote` | Float | Voto base (es. 6.5) |
| `goals` | Int | Gol segnati |
| `assists` | Int | Assist fatti |
| `yellowCards` | Int | Ammonizioni |
| `redCards` | Int | Espulsioni |

**Formula punteggio:**
```
punteggio = voto + (3 × gol) + (1 × assist) − (0.5 × giallo) − (2 × rosso)
```

### `MatchdayScore`
Il punteggio finale della squadra fantasy per una giornata (somma dei punteggi dei titolari).

| Campo | Vincolo | A cosa serve |
|---|---|---|
| `fantasyTeamId` | FK → FantasyTeam | Di chi è il punteggio |
| `matchdayId` | FK → Matchday | Per quale giornata |
| `points` | Float | Somma dei punteggi dei titolari |
| | `@@unique([fantasyTeamId, matchdayId])` | **Un solo score per squadra per giornata** |

---

## 4. Tabelle Partite Reali

Queste tabelle memorizzano i **dati delle partite del torneo scolastico reale** (provenienti da un'API esterna). Servono per la sezione Live e per lo storico partite.

### `Stadium`
Gli stadi/campi dove si giocano le partite.

| Campo | Tipo | A cosa serve |
|---|---|---|
| `externalId` | Int? (unique) | ID dall'API esterna (per sync) |
| `name` | String | "Cus Torino" |
| `address` | String? | Indirizzo completo |
| `latitude`, `longitude` | Float? | Per eventuale mappa |

### `Match`
Una partita reale del torneo.

| Campo | Tipo | A cosa serve |
|---|---|---|
| `externalId` | Int? (unique) | ID dall'API esterna |
| `datetime` | DateTime | Quando si gioca |
| `stadiumId` | FK → Stadium | Dove si gioca |
| `matchdayId` | FK → Matchday | A quale giornata fantasy è collegata |
| `scoreText` | String? | "2 - 1" (testo per display) |
| `name` | String? | "Einstein vs Galilei" |
| `finished` | Boolean | La partita è terminata? |
| `status` | String | `scheduled` → `live` → `finished` |

**Relazioni:**
- `teams` → le 2 squadre (scuole) che giocano (`TeamMatch[]`)
- `stadium` → lo stadio
- `matchday` → la giornata fantasy collegata

### `TeamMatch`
Il lato di **una squadra** in una partita (home/away). Ogni `Match` ha esattamente 2 `TeamMatch`.

| Campo | Tipo | A cosa serve |
|---|---|---|
| `externalId` | Int? (unique) | ID dall'API |
| `matchId` | FK → Match | Quale partita |
| `schoolId` | FK → School | Quale scuola gioca |
| `isHome` | Boolean | Gioca in casa? |
| `score` | Int | Gol segnati da questa squadra |
| `penalties` | Int | Rigori (se previsti) |
| | `@@unique([matchId, schoolId])` | **Una scuola non può giocare 2 volte nella stessa partita** |

**Relazioni:**
- `events` → eventi di questa squadra nella partita (`MatchEvent[]`)

### `MatchEvent`
Un singolo evento durante la partita (gol, cartellino, ecc.).

| Campo | Tipo | A cosa serve |
|---|---|---|
| `externalId` | Int? (unique) | ID dall'API |
| `teamMatchId` | FK → TeamMatch | Di quale squadra nella partita |
| `playerId` | FK? → RealPlayer | Chi ha fatto l'evento (nullable se sconosciuto) |
| `minute` | Int | Minuto dell'evento |
| `eventType` | String | `GOAL`, `YELLOW_CARD`, `RED_CARD`, `ASSIST`, `SUBSTITUTION` |

---

## 5. Tabelle Leghe e Classifiche

### `League`
Una lega (competizione tra squadre fantasy).

| Campo | Tipo | A cosa serve |
|---|---|---|
| `name` | String | "Classifica Globale", "Lega dei Geni" |
| `isGlobal` | Boolean | `true` = tutti partecipano automaticamente |
| `inviteCode` | String? (unique) | Codice per entrare (solo leghe private, `null` per la globale) |
| `creatorId` | FK → User | Chi l'ha creata |

### `LeagueMember`
Tabella ponte: **quale utente è in quale lega**.

| Campo | Vincolo | A cosa serve |
|---|---|---|
| `leagueId` | FK → League | Quale lega |
| `userId` | FK → User | Quale utente |
| | `@@unique([leagueId, userId])` | **Un utente non può entrare 2 volte nella stessa lega** |

> 📌 La **classifica di una lega** non è una tabella: si calcola **aggregando i `MatchdayScore`** degli utenti che sono membri di quella lega.

---

## 6. Relazioni chiave

### Come funziona la proprietà dei giocatori
```
User (1) ──── (1) FantasyTeam (1) ──── (N) FantasyPlayer (N) ──── (1) RealPlayer
```
- Un utente ha UNA squadra
- La squadra ha N giocatori fantasy
- Ogni giocatore fantasy punta a UN giocatore reale
- Lo stesso giocatore reale PUÒ essere in più squadre fantasy (non c'è vincolo di unicità)

### Come funzionano le formazioni
```
FantasyTeam + Matchday ──── (1) Lineup (1) ──── (N) LineupPlayer ──── RealPlayer
                                                      │
                                                   isStarter?
```
- Per ogni giornata, la squadra può avere UNA formazione
- La formazione contiene 15 giocatori (11 titolari + 4 panchinari)

### Come funzionano i punteggi
```
Matchday ──── (N) PlayerVote ──── RealPlayer
    │
    └──── (N) MatchdayScore ──── FantasyTeam
```
1. Admin inserisce `PlayerVote` per ogni giocatore in quella giornata
2. Il sistema calcola il punteggio di ogni `LineupPlayer` titolare
3. La somma va in `MatchdayScore`

### Come funzionano le partite reali
```
Matchday ──── (N) Match ──── (2) TeamMatch ──── (N) MatchEvent
                    │              │
                 Stadium         School
```
- Ogni giornata ha N partite reali
- Ogni partita ha esattamente 2 TeamMatch (home + away)
- Ogni TeamMatch può avere N eventi (gol, cartellini...)

---

## 7. Flusso dei dati: dalla partita reale al punteggio

```
1. SETUP
   ├── Admin crea Matchday (number=3, status="open", deadline=sabato 20:00)
   └── Sistema importa Match dall'API esterna (Einstein vs Modigliani, ecc.)

2. FORMAZIONI (status = "open")
   └── Ogni utente sceglie 11 titolari → crea/aggiorna Lineup + LineupPlayer

3. DEADLINE (status = "locked")
   ├── Automaticamente sabato sera
   └── Nessuno può più cambiare formazione

4. PARTITE LIVE (Match.status = "live")
   ├── API esterna aggiorna Match, TeamMatch, MatchEvent in tempo reale
   └── Tab "Live" nella dashboard mostra risultati e eventi

5. VOTI (status = "scored")
   ├── Admin inserisce PlayerVote per ogni giocatore
   ├── Sistema calcola punteggio per ogni FantasyTeam:
   │     per ogni titolare in Lineup:
   │       punteggio += voto + 3*gol + assist - 0.5*giallo - 2*rosso
   └── Risultato salvato in MatchdayScore

6. CLASSIFICA
   └── Somma di tutti i MatchdayScore per ogni squadra → ranking
```

---

## 8. Query comuni e dove trovarle

Tutte le query del gioco sono in **Server Actions** (`src/app/dashboard/actions.ts`).

| Operazione | Funzione | Cosa fa |
|---|---|---|
| Punteggio totale squadra | `getMyTeamSummary()` | Somma `MatchdayScore.points`, calcola rank globale |
| Rosa giocatori | `getMyRoster()` | `FantasyTeam → FantasyPlayer → RealPlayer + School` |
| Prossima giornata | `getNextMatchday()` | Primo `Matchday` con `status = "open"` |
| C'è una partita live? | `hasLiveMatchday()` | Esiste un `Matchday` con `status = "locked"`? |
| Le mie leghe | `getUserLeagues()` | `LeagueMember → League → members → FantasyTeam → scores` |
| Classifica di una lega | `getLeagueStandings()` | Come sopra ma con tutti i dettagli e ranking |
| Dati live | `getLiveMatchday()` | `Matchday(locked) + PlayerVote + MatchdayScore` |

### Esempio: calcolo classifica di una lega
```typescript
// 1. Prendi tutti i membri della lega
const league = await prisma.league.findUnique({
  where: { id: leagueId },
  include: {
    members: {
      include: {
        user: {
          include: {
            fantasyTeam: {
              include: { scores: true }
            }
          }
        }
      }
    }
  }
});

// 2. Per ogni membro, somma i MatchdayScore
const standings = league.members.map(m => ({
  userName: m.user.name,
  teamName: m.user.fantasyTeam?.name,
  totalPoints: m.user.fantasyTeam?.scores.reduce((sum, s) => sum + s.points, 0) ?? 0,
})).sort((a, b) => b.totalPoints - a.totalPoints);
```

### Esempio: importazione partita dall'API esterna
```typescript
// Il JSON dall'API ha questa struttura:
// { id, datetime, stadium: {...}, teams: [{ team: { slug }, score, events: [...] }] }

// 1. Upsert dello stadio
const stadium = await prisma.stadium.upsert({
  where: { externalId: apiMatch.stadium.id },
  update: { name: apiMatch.stadium.name },
  create: { externalId: apiMatch.stadium.id, name: apiMatch.stadium.name, ... },
});

// 2. Upsert della partita
const match = await prisma.match.upsert({
  where: { externalId: apiMatch.id },
  update: { scoreText: apiMatch.score_text, finished: apiMatch.finished, status: ... },
  create: { externalId: apiMatch.id, datetime: apiMatch.datetime, stadiumId: stadium.id, ... },
});

// 3. Per ogni squadra nella partita
for (const apiTeam of apiMatch.teams) {
  const school = await prisma.school.findUnique({ where: { slug: apiTeam.team.slug } });
  const teamMatch = await prisma.teamMatch.upsert({
    where: { externalId: apiTeam.id },
    update: { score: apiTeam.score },
    create: { externalId: apiTeam.id, matchId: match.id, schoolId: school.id, ... },
  });

  // 4. Upsert eventi
  for (const ev of apiTeam.events) {
    await prisma.matchEvent.upsert({
      where: { externalId: ev.id },
      update: { minute: ev.minute },
      create: { externalId: ev.id, teamMatchId: teamMatch.id, eventType: ev.event_type, ... },
    });
  }
}
```

---

## 9. Comandi Prisma utili

```bash
# Generare il client dopo modifiche allo schema
npx prisma generate

# Creare e applicare una migrazione
npx prisma migrate dev --name nome_migrazione

# Applicare migrazioni in produzione
npx prisma migrate deploy

# Aprire Prisma Studio (GUI per esplorare i dati)
npx prisma studio

# Eseguire il seed
npx prisma db seed
# oppure direttamente:
npx tsx prisma/seed.ts

# Validare lo schema
npx prisma validate

# Reset completo del DB (⚠️ cancella tutto!)
npx prisma migrate reset
```

### Dati di test attualmente nel DB

```
📊 Riepilogo seed:
  • 4 scuole (Einstein, Galilei, Dante, Modigliani) con 60 giocatori
  • 2 stadi
  • 3 giornate (2 scored, 1 open)
  • 6 partite reali con 18 eventi
  • 5 utenti con squadre fantasy da 15 giocatori
  • 3 leghe (1 globale + 2 private)

🔑 Credenziali:
  • mario@test.com / password123
  • luigi@test.com / password123
  • anna@test.com  / password123
  • sara@test.com  / password123
  • luca@test.com  / password123

🏆 Codici invito:
  • GENI2026 — "Lega dei Geni"
  • ARTE2026 — "Sfida Artisti"
```

---

## 10. Checklist Admin — Cosa fare giornata per giornata

Questa è la guida operativa: ogni settimana l'admin deve seguire questi step nell'ordine esatto.

---

### 📋 Timeline settimanale

```
Lunedì/Martedì ──► STEP 1: Creare la giornata
Mercoledì-Venerdì ──► Gli utenti modificano la formazione
Sabato 20:00 ──► STEP 2: Bloccare le formazioni (deadline)
Domenica ──► STEP 3: Le partite si giocano (live)
Domenica sera ──► STEP 4: Inserire i voti
                  STEP 5: Calcolare i punteggi
                  STEP 6: Chiudere la giornata
```

---

### STEP 1 — Creare la nuova giornata

**Tabella:** `Matchday`

Crea un record nella tabella `Matchday` con lo status `open` e la deadline (di solito sabato sera).

```typescript
await prisma.matchday.create({
  data: {
    number: 4,                                    // numero progressivo
    deadline: new Date("2026-03-22T20:00:00Z"),   // sabato sera
    status: "open",
  },
});
```

> 📌 Da questo momento gli utenti possono modificare la formazione per questa giornata.

**Opzionale — Importare le partite reali:**

Se hai i dati dall'API esterna, crea anche i record `Match` + `TeamMatch` per le partite programmate (così gli utenti vedono il calendario).

```typescript
// Per ogni partita prevista in questa giornata:
const match = await prisma.match.create({
  data: {
    externalId: 7,
    datetime: new Date("2026-03-23T15:00:00Z"),
    stadiumId: "...",
    matchdayId: "...id della matchday appena creata...",
    name: "Einstein vs Dante",
    status: "scheduled",
    finished: false,
  },
});

// Le 2 squadre che giocano:
await prisma.teamMatch.createMany({
  data: [
    { matchId: match.id, schoolId: "...einstein...", isHome: true, score: 0 },
    { matchId: match.id, schoolId: "...dante...", isHome: false, score: 0 },
  ],
});
```

---

### STEP 2 — Bloccare le formazioni (deadline)

**Tabella:** `Matchday`

Quando scade la deadline (sabato sera), cambia lo status da `open` a `locked`.

```typescript
await prisma.matchday.update({
  where: { number: 4 },
  data: { status: "locked" },
});
```

> ⚠️ Da questo momento nessun utente può più modificare la formazione.
> Questo step andrà automatizzato con un cron job o un check server-side.

---

### STEP 3 — Aggiornare le partite live (durante le partite)

**Tabelle:** `Match`, `TeamMatch`, `MatchEvent`

Durante le partite, aggiorna i dati in tempo reale (o importali dall'API esterna).

```typescript
// Aggiorna stato partita → LIVE
await prisma.match.update({
  where: { externalId: 7 },
  data: { status: "live" },
});

// Aggiorna il punteggio di una squadra
await prisma.teamMatch.update({
  where: { externalId: 13 },
  data: { score: 1 },
});

// Aggiorna il testo del risultato
await prisma.match.update({
  where: { externalId: 7 },
  data: { scoreText: "1 - 0" },
});

// Aggiungi un evento (gol, cartellino...)
await prisma.matchEvent.create({
  data: {
    teamMatchId: "...id del teamMatch...",
    playerId: "...id del giocatore (opzionale)...",
    minute: 34,
    eventType: "GOAL",  // oppure YELLOW_CARD, RED_CARD, ASSIST, SUBSTITUTION
  },
});
```

**A fine partita:**

```typescript
await prisma.match.update({
  where: { externalId: 7 },
  data: {
    status: "finished",
    finished: true,
    scoreText: "2 - 1",
  },
});
```

---

### STEP 4 — Inserire i voti dei giocatori

**Tabella:** `PlayerVote`

Dopo che tutte le partite sono finite, l'admin inserisce i voti per **ogni giocatore che ha giocato** in quella giornata.

```typescript
// Per ogni giocatore reale che ha giocato:
await prisma.playerVote.create({
  data: {
    realPlayerId: "...id giocatore...",
    matchdayId: "...id giornata...",
    vote: 7.0,          // voto base (da 4.0 a 10.0)
    goals: 1,           // gol segnati
    assists: 0,          // assist
    yellowCards: 0,      // ammonizioni
    redCards: 0,         // espulsioni
  },
});
```

> 💡 I giocatori che NON hanno giocato **non devono avere un `PlayerVote`**.
> Se un titolare nella formazione fantasy non ha il voto, semplicemente non prende punti.

**In blocco (più veloce):**

```typescript
await prisma.playerVote.createMany({
  data: [
    { realPlayerId: "p1", matchdayId: "md4", vote: 6.5, goals: 0, assists: 1, yellowCards: 0, redCards: 0 },
    { realPlayerId: "p2", matchdayId: "md4", vote: 7.0, goals: 1, assists: 0, yellowCards: 0, redCards: 0 },
    { realPlayerId: "p3", matchdayId: "md4", vote: 5.0, goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
    // ... tutti i giocatori che hanno giocato
  ],
});
```

---

### STEP 5 — Calcolare i punteggi delle squadre fantasy

**Tabelle lette:** `Lineup`, `LineupPlayer`, `PlayerVote`
**Tabella scritta:** `MatchdayScore`

Per ogni squadra fantasy che ha una formazione per questa giornata, calcola il punteggio sommando i voti dei titolari.

```typescript
const matchday = await prisma.matchday.findUnique({ where: { number: 4 } });

// Prendi tutte le lineup per questa giornata
const lineups = await prisma.lineup.findMany({
  where: { matchdayId: matchday.id },
  include: {
    players: {
      where: { isStarter: true },  // solo titolari!
    },
  },
});

for (const lineup of lineups) {
  let totalPoints = 0;

  for (const lp of lineup.players) {
    const vote = await prisma.playerVote.findUnique({
      where: {
        realPlayerId_matchdayId: {
          realPlayerId: lp.realPlayerId,
          matchdayId: matchday.id,
        },
      },
    });

    if (vote) {
      // Formula:
      totalPoints += vote.vote
        + 3 * vote.goals
        + 1 * vote.assists
        - 0.5 * vote.yellowCards
        - 2 * vote.redCards;
    }
    // Se il giocatore non ha il voto → 0 punti (non ha giocato)
  }

  // Salva il punteggio
  await prisma.matchdayScore.upsert({
    where: {
      fantasyTeamId_matchdayId: {
        fantasyTeamId: lineup.fantasyTeamId,
        matchdayId: matchday.id,
      },
    },
    update: { points: Math.round(totalPoints * 10) / 10 },
    create: {
      fantasyTeamId: lineup.fantasyTeamId,
      matchdayId: matchday.id,
      points: Math.round(totalPoints * 10) / 10,
    },
  });
}
```

> 📌 Si usa `upsert` così se devi ricalcolare (es. voto corretto) basta rieseguire.

---

### STEP 6 — Chiudere la giornata

**Tabella:** `Matchday`

Cambia lo status da `locked` a `scored`. Da questo momento la giornata è archiviata.

```typescript
await prisma.matchday.update({
  where: { number: 4 },
  data: { status: "scored" },
});
```

> ✅ Fatto! Le classifiche si aggiornano automaticamente (sono calcolate aggregando i `MatchdayScore`).

---

### Riepilogo tabelle toccate dall'admin per step

| Step | Azione | Tabelle modificate |
|---|---|---|
| **1** | Creare giornata | `Matchday` (create) |
| **1b** | Importare partite | `Match`, `TeamMatch` (create) |
| **2** | Bloccare formazioni | `Matchday` (update status → locked) |
| **3** | Aggiornare live | `Match`, `TeamMatch`, `MatchEvent` (update/create) |
| **4** | Inserire voti | `PlayerVote` (create) |
| **5** | Calcolare punteggi | `MatchdayScore` (upsert) — legge `Lineup`, `LineupPlayer`, `PlayerVote` |
| **6** | Chiudere giornata | `Matchday` (update status → scored) |

### Tabelle che l'admin NON tocca mai

| Tabella | Perché |
|---|---|
| `User`, `Account`, `Session` | Gestite da NextAuth |
| `FantasyTeam`, `FantasyPlayer` | Create dall'utente durante il draft |
| `Lineup`, `LineupPlayer` | Create dall'utente quando sceglie la formazione |
| `League`, `LeagueMember` | Create dall'utente quando crea/entra in una lega |
| `School`, `RealPlayer` | Create una volta sola nel seed iniziale |
| `Stadium` | Creato nel seed o importato dall'API (una tantum) |

