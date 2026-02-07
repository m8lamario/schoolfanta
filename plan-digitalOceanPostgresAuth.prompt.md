# Piano operativo: collegare PostgreSQL (DigitalOcean) + Auth (Email/Password + Google) in Next.js (App Router)

## Obiettivo
Collegare l’app Next.js a un database PostgreSQL su DigitalOcean (DB **pubblico** con SSL) e implementare un sistema di autenticazione “fatto bene” con:
- Registrazione **email/password** (password hashata su DB)
- Login con **Google OAuth**
- Sessioni persistenti (cookie HttpOnly + sessioni su DB)
- Protezione route tramite `middleware.ts` con redirect sicuro (`next` sanificato)

## Scelte tecniche consigliate
- **Prisma** come ORM/migration tool
- **NextAuth (Auth.js)** per OAuth Google + gestione sessioni
- **Prisma Adapter** per persistere `Account`/`Session` su Postgres
- Hash password con **bcrypt** (o bcryptjs)

## Checklist implementazione (passi)

### 1) DigitalOcean PostgreSQL (pubblico)
1. Crea un cluster Postgres su DigitalOcean.
2. Abilita SSL e prendi la connection string DO.
3. Configura allowlist IP (almeno: IP di sviluppo + IP/egress del deploy) oppure usa un proxy/VPC se disponibile.
4. Crea un database dedicato (es. `schoolfanta`).

### 2) Variabili d’ambiente
Crea `.env.local` (in dev) e configura le stesse variabili in produzione:
- `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"`
- `NEXTAUTH_URL="http://localhost:3000"` (in prod: URL pubblico)
- `NEXTAUTH_SECRET="<stringa lunga random>"`
- `GOOGLE_CLIENT_ID="..."`
- `GOOGLE_CLIENT_SECRET="..."`

Note:
- In build/server-side le env devono essere presenti.
- `NEXTAUTH_SECRET` va generato e tenuto segreto.

### 3) Prisma: schema + migrazioni
1. Aggiungi `prisma/schema.prisma` con modelli compatibili con NextAuth:
   - `User` (con `passwordHash` opzionale per utenti che usano Google)
   - `Account`, `Session`, `VerificationToken`
2. Genera Prisma Client.
3. Esegui migrazioni verso il DB DigitalOcean.

Edge cases:
- Email unica (`@unique`).
- User Google senza password (`passwordHash = null`).

### 4) NextAuth: providers Google + Credentials
1. Config in un file shared (es. `src/lib/auth.ts`) con:
   - PrismaAdapter
   - Provider Google (con `GOOGLE_*`)
   - Provider Credentials che:
     - trova l’utente per email
     - confronta password con bcrypt
     - ritorna `id/email/name/image` se ok
2. Route handler NextAuth in App Router:
   - `src/app/api/auth/[...nextauth]/route.ts`
   - esporta `GET`/`POST` dal handler NextAuth
3. (Consigliato) Callback `session` per aggiungere `session.user.id`.

### 5) Registrazione (signup) server-side
1. Crea route `POST /api/auth/signup`:
   - valida email
   - valida password (min 8, 1 maiuscola, 1 minuscola, 1 numero)
   - controlla email già esistente
   - hash password (bcrypt, cost 10/12)
   - crea `User`
2. Risposte:
   - `200 { ok: true }`
   - `409` se email già in uso
   - `400` per input invalido

### 6) UI login/signup (client)
Aggiorna:
- `src/app/login/StartClient.tsx`
  - “Continua con Google” → `signIn('google', { callbackUrl })`
  - Form email/password → `signIn('credentials', { email, password, redirect:false, callbackUrl })`
- `src/app/signup/SignupClient.tsx`
  - prima `fetch('/api/auth/signup')`
  - poi `signIn('credentials', ...)`

Redirect sicuro:
- Usa il tuo `sanitizeNext()` per costruire `callbackUrl` solo relativo.

### 7) Middleware: protezione route
Aggiorna `middleware.ts` per:
- considerare pubbliche `/`, `/login`, `/signup`
- per le altre route: se non autenticato → redirect a `/login?next=...`
- usare `getToken` (JWT) o session check equivalente di NextAuth

Nota:
- Mantieni la sanificazione del parametro `next` per evitare open redirect.

### 8) Cleanup / compatibilità
- Le vecchie route demo `src/app/api/auth/login` e `logout` diventano inutili.
  - Opzione A: rimuoverle
  - Opzione B: lasciarle ma non usate (consigliato rimuoverle quando tutto è stabile)

## Verifica (quality gates)
- `prisma generate`
- `prisma migrate dev` (con DATABASE_URL configurato)
- `npm run build`
- Smoke test manuale:
  - signup email/password
  - login email/password
  - login Google (se configurato)
  - reboot browser → sessione persiste
  - route protetta: redirect a /login se non autenticato

## Note di sicurezza (DB pubblico)
- Usa `sslmode=require`.
- Allowlist IP quando possibile.
- Ruoli DB: non usare l’utente admin del cluster se non necessario.
- Password hashing sempre server-side.
- Cookie session HttpOnly (NextAuth lo gestisce), SameSite adeguato.

