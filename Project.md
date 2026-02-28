
---

# 🏆 SchoolFanta – Project Overview

## 1. Visione del Progetto

SchoolFanta è una web app mobile-first (PWA-ready) che permette agli studenti delle superiori di partecipare a un fantasy game collegato al torneo scolastico reale.

Obiettivi principali:

* Esperienza semplice e coinvolgente
* Competizione tra studenti e scuole
* Sistema stile fantacalcio ma semplificato
* MVP stabile entro 6 settimane

---

# 2. Stack Tecnologico

## Frontend

* Next.js 14 (App Router)
* TypeScript
* CSS Modules
* Mobile-first UI

## Backend

* PostgreSQL (DigitalOcean Managed DB)
* Prisma ORM
* Auth.js (NextAuth)
* Server Actions (no API routes dove possibile)

## Hosting

* DigitalOcean App Platform

---

# 3. Architettura Generale

```
Login
↓
Completa Profilo
↓
Crea Squadra
↓
Dashboard
   ├── Modifica formazione settimanale
   ├── Classifica globale
   ├── Leghe private
   ├── Storico giornate
```

---

# 4. Struttura Route (App Router)

```
app/
 ├── (public)/
 │    ├── page.tsx
 │    ├── start/page.tsx
 │
 ├── (auth)/
 │    ├── login/page.tsx
 │
 ├── (game)/
 │    ├── layout.tsx
 │    ├── dashboard/page.tsx
 │    ├── create-team/page.tsx
 │    ├── lineup/page.tsx
 │    ├── leagues/page.tsx
 │    ├── leaderboard/page.tsx
 │
 ├── admin/
 │    ├── votes/page.tsx
 │    ├── matches/page.tsx
```

Middleware:

* Non loggato → login
* Loggato ma senza squadra → create-team

---

# 5. Modello di Gioco (MVP Definitivo)

## Squadra

* Budget iniziale: 100 crediti
* Rosa: 15 giocatori

    * 2 GK
    * 5 DEF
    * 5 MID
    * 3 ATT

La rosa è bloccata per tutta la competizione.

## Formazione

* Ogni domenica si gioca una giornata
* L’utente può modificare la formazione (11 titolari)
* Deadline: sabato sera
* Nessun mercato nel MVP

---

# 6. Database Schema (Prisma Concept)

## School

* id
* name
* → players (RealPlayer[])
* → users (User[])

---

## User

* id
* email
* name
* schoolId → School
* budget (default: 100)
* hasTeam (default: false)

---

## RealPlayer

* id
* name
* role (GK, DEF, MID, ATT)
* schoolId → School
* value

---

## FantasyTeam

* id
* name
* userId → User (unique, 1:1)
* → players (FantasyPlayer[])
* → lineups (Lineup[])
* → scores (MatchdayScore[])

---

## FantasyPlayer

* id
* fantasyTeamId → FantasyTeam
* realPlayerId → RealPlayer

---

## Matchday

* id
* number (unique)
* deadline (DateTime)
* status ("open" | "locked" | "scored")
* → lineups (Lineup[])
* → scores (MatchdayScore[])
* → votes (PlayerVote[])

---

## Lineup

* id
* fantasyTeamId → FantasyTeam
* matchdayId → Matchday
* @@unique([fantasyTeamId, matchdayId])
* → players (LineupPlayer[])

---

## LineupPlayer

* id
* lineupId → Lineup
* realPlayerId → RealPlayer
* isStarter (Boolean)

---

## PlayerVote

* id
* realPlayerId → RealPlayer
* matchdayId → Matchday
* vote (Float)
* goals (default: 0)
* assists (default: 0)
* yellowCards (default: 0)
* redCards (default: 0)
* @@unique([realPlayerId, matchdayId])

---

## MatchdayScore

* id
* fantasyTeamId → FantasyTeam
* matchdayId → Matchday
* points (Float)
* @@unique([fantasyTeamId, matchdayId])

---

## League

* id
* name
* isGlobal (default: false)
* inviteCode (unique, nullable — null se globale)
* creatorId → User
* → members (LeagueMember[])

---

## LeagueMember

* id
* leagueId → League
* userId → User
* @@unique([leagueId, userId])

---

# 7. Creazione Squadra – Flow UX

## Step 1 – Nome squadra

Input semplice.

## Step 2 – Draft con Budget

Flusso per ruolo:

1. Portieri (2)
2. Difensori (5)
3. Centrocampisti (5)
4. Attaccanti (3)

Durante il draft:

* Mostrare budget rimanente
* Bloccare selezione se supera budget
* Barra progresso rosa completata

Conferma finale → salva squadra → redirect dashboard

---

# 8. Calcolo Punteggi

Admin inserisce:

* Voto base
* Gol
* Assist
* Ammonizione
* Espulsione

Formula base:

```
Punteggio = voto
+ 3 gol
+ 1 assist
- 0.5 giallo
- 2 rosso
+ 2 clean sheet (solo GK, se la squadra reale non subisce gol)
```

Solo titolari (isStarter = true) prendono punteggio.

Somma → MatchdayScore.

---

# 9. Classifiche

## Lega Globale

Tutti partecipano automaticamente.

## Leghe Private

* Creazione con codice invito
* Utenti possono unirsi tramite codice

Classifica = somma punteggi giornate.

---

# 10. Dashboard Utente

Deve mostrare:

* Punteggio totale
* Posizione in classifica globale
* Prossima giornata
* Bottone modifica formazione
* Le mie leghe

Mobile-first, layout card-based.

---

# 11. Admin Panel

Funzionale, non estetico.

Funzioni:

* Inserimento risultati partita
* Inserimento voti giocatori
* Calcolo giornata
* Blocco formazione dopo deadline

---

# 12. Roadmap Operativa (7 Settimane)

## Settimana 1

* Prisma schema definitivo (tutti i modelli)
* Seed scuole e giocatori reali
* Auth completa (login/signup/sessione)

## Settimana 2

* Flow creazione squadra (nome + draft con budget)
* Dashboard base (punteggio, posizione, prossima giornata)

## Settimana 3

* Lega globale (auto-join)
* Struttura leghe private (creazione + codice invito)

## Settimana 4

* Sistema formazione settimanale
* Logica deadline (blocco automatico sabato sera)

## Settimana 5

* Admin: inserimento voti giocatori
* Calcolo punteggi automatico (formula con clean sheet)

## Settimana 6

* Classifiche aggregate (globale + leghe)
* Ottimizzazione UI mobile
* PWA base (manifest.json + service worker)

## Settimana 7

* Test con utenti reali
* Fix bug
* Preparazione lancio

---

# 13. Regole MVP (Non negoziabili)

* No mercato
* No scambi
* No modifiche rosa
* No moduli dinamici
* No funzionalità extra non necessarie

Focus: stabilità e semplicità.

---

# 14. Principio Guida

Ogni decisione deve rispettare:

> Semplice per lo studente
> Sostenibile per lo sviluppatore
> Scalabile per il futuro

---

Se vuoi, nel prossimo step possiamo creare:

* Schema Prisma definitivo pronto da copiare
* Struttura concreta delle Server Actions
* Architettura completa dello stato frontend per lineup settimanale

Dimmi da dove vuoi partire.
