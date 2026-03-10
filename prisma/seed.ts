import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// ─── SCHOOLS DATA ───

const schools = [
  {
    name: "Liceo Scientifico Einstein",
    shortName: "EIN",
    slug: "einstein",
    players: [
      { name: "Marco Rossi", role: "GK", value: 8 },
      { name: "Luca Ferri", role: "GK", value: 5 },
      { name: "Andrea Colombo", role: "DEF", value: 10 },
      { name: "Matteo Ricci", role: "DEF", value: 8 },
      { name: "Davide Moretti", role: "DEF", value: 7 },
      { name: "Tommaso Conti", role: "DEF", value: 6 },
      { name: "Simone Marino", role: "DEF", value: 4 },
      { name: "Federico Greco", role: "MID", value: 12 },
      { name: "Alessandro Leone", role: "MID", value: 9 },
      { name: "Lorenzo Mancini", role: "MID", value: 7 },
      { name: "Nicola Barbieri", role: "MID", value: 6 },
      { name: "Emanuele Rinaldi", role: "MID", value: 5 },
      { name: "Giovanni Pellegrini", role: "ATT", value: 15 },
      { name: "Cristian Marchetti", role: "ATT", value: 11 },
      { name: "Paolo Serra", role: "ATT", value: 8 },
    ],
  },
  {
    name: "ITIS Galilei",
    shortName: "GAL",
    slug: "galilei",
    players: [
      { name: "Riccardo Rame", role: "GK", value: 7 },
      { name: "Filippo Bassi", role: "GK", value: 4 },
      { name: "Gabriele Costa", role: "DEF", value: 9 },
      { name: "Stefano Fontana", role: "DEF", value: 8 },
      { name: "Michele Gallo", role: "DEF", value: 6 },
      { name: "Antonio Longo", role: "DEF", value: 5 },
      { name: "Francesco Villa", role: "DEF", value: 4 },
      { name: "Roberto Caruso", role: "MID", value: 11 },
      { name: "Daniele Martini", role: "MID", value: 9 },
      { name: "Giacomo Ferrara", role: "MID", value: 7 },
      { name: "Edoardo Vitale", role: "MID", value: 6 },
      { name: "Pietro Santoro", role: "MID", value: 5 },
      { name: "Diego Lombardi", role: "ATT", value: 14 },
      { name: "Samuele Monti", role: "ATT", value: 10 },
      { name: "Alessio Parisi", role: "ATT", value: 7 },
    ],
  },
  {
    name: "Liceo Classico Dante",
    shortName: "DAN",
    slug: "dante",
    players: [
      { name: "Enrico Fabbri", role: "GK", value: 9 },
      { name: "Carlo Silvestri", role: "GK", value: 5 },
      { name: "Vincenzo Bernardi", role: "DEF", value: 10 },
      { name: "Alberto Palmieri", role: "DEF", value: 7 },
      { name: "Claudio Testa", role: "DEF", value: 6 },
      { name: "Giorgio Benedetti", role: "DEF", value: 5 },
      { name: "Sergio Orlando", role: "DEF", value: 3 },
      { name: "Massimo De Luca", role: "MID", value: 13 },
      { name: "Fabrizio Rizzi", role: "MID", value: 8 },
      { name: "Domenico Grasso", role: "MID", value: 7 },
      { name: "Mauro Cattaneo", role: "MID", value: 6 },
      { name: "Ivan Mariani", role: "MID", value: 4 },
      { name: "Bruno D'Angelo", role: "ATT", value: 16 },
      { name: "Aldo Valentini", role: "ATT", value: 12 },
      { name: "Oscar Bianco", role: "ATT", value: 9 },
    ],
  },
  {
    name: "Liceo Artistico Modigliani",
    shortName: "MOD",
    slug: "modigliani",
    players: [
      { name: "Luca Bianchi", role: "GK", value: 6 },
      { name: "Mattia Romano", role: "GK", value: 4 },
      { name: "Dario Esposito", role: "DEF", value: 9 },
      { name: "Fabio Russo", role: "DEF", value: 7 },
      { name: "Giulio De Rosa", role: "DEF", value: 6 },
      { name: "Marco Gentile", role: "DEF", value: 5 },
      { name: "Elia Ferretti", role: "DEF", value: 4 },
      { name: "Simone Pozzi", role: "MID", value: 10 },
      { name: "Riccardo Sala", role: "MID", value: 8 },
      { name: "Andrea Farina", role: "MID", value: 7 },
      { name: "Lorenzo Gatti", role: "MID", value: 5 },
      { name: "Niccolò Rinaldi", role: "MID", value: 4 },
      { name: "Tommaso Mazza", role: "ATT", value: 14 },
      { name: "Christian Conti", role: "ATT", value: 11 },
      { name: "Alex Ferraro", role: "ATT", value: 8 },
    ],
  },
];

// ─── TEST USERS ───

const testUsers = [
  {
    email: "mario@test.com",
    name: "Mario Test",
    firstName: "Mario",
    lastName: "Rossi",
    password: "password123",
    schoolIndex: 0,
    teamName: "I Campioni",
  },
  {
    email: "luigi@test.com",
    name: "Luigi Test",
    firstName: "Luigi",
    lastName: "Verdi",
    password: "password123",
    schoolIndex: 1,
    teamName: "Galilei FC",
  },
  {
    email: "anna@test.com",
    name: "Anna Test",
    firstName: "Anna",
    lastName: "Bianchi",
    password: "password123",
    schoolIndex: 2,
    teamName: "Dante United",
  },
  {
    email: "sara@test.com",
    name: "Sara Test",
    firstName: "Sara",
    lastName: "Neri",
    password: "password123",
    schoolIndex: 0,
    teamName: "Le Stelle",
  },
  {
    email: "luca@test.com",
    name: "Luca Test",
    firstName: "Luca",
    lastName: "Gialli",
    password: "password123",
    schoolIndex: 3,
    teamName: "Arte e Gol",
  },
];

// ─── STADIA ───

const stadiaData = [
  {
    externalId: 1,
    name: "Cus Torino",
    address: "Via Milano, 63, 10095 Grugliasco TO",
    latitude: 45.02,
    longitude: 7.1,
  },
  {
    externalId: 2,
    name: "Campo Sportivo Lingotto",
    address: "Via Nizza, 230, 10126 Torino TO",
    latitude: 45.032,
    longitude: 7.668,
  },
];

// ── MAIN SEED ──

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── 1. Clean existing data (in order to respect FK constraints) ──
  console.log("🗑️  Cleaning existing data...");
  await prisma.matchEvent.deleteMany();
  await prisma.teamMatch.deleteMany();
  await prisma.match.deleteMany();
  await prisma.stadium.deleteMany();
  await prisma.matchdayScore.deleteMany();
  await prisma.playerVote.deleteMany();
  await prisma.lineupPlayer.deleteMany();
  await prisma.lineup.deleteMany();
  await prisma.fantasyPlayer.deleteMany();
  await prisma.fantasyTeam.deleteMany();
  await prisma.leagueMember.deleteMany();
  await prisma.league.deleteMany();
  await prisma.matchday.deleteMany();
  await prisma.realPlayer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
  console.log("  ✓ Database pulito\n");

  // ── 2. Create schools + players ──
  console.log("🏫 Creazione scuole e giocatori...");
  type CreatedSchool = Awaited<ReturnType<typeof prisma.school.create>>;
  type CreatedPlayer = Awaited<ReturnType<typeof prisma.realPlayer.create>>;

  const createdSchools: CreatedSchool[] = [];
  const allPlayers: Map<number, CreatedPlayer[]> = new Map();

  for (let i = 0; i < schools.length; i++) {
    const s = schools[i];
    const school = await prisma.school.create({
      data: { name: s.name, shortName: s.shortName, slug: s.slug },
    });
    createdSchools.push(school);

    const players: CreatedPlayer[] = [];
    for (const p of s.players) {
      const player = await prisma.realPlayer.create({
        data: { name: p.name, role: p.role, value: p.value, schoolId: school.id },
      });
      players.push(player);
    }
    allPlayers.set(i, players);
    console.log(`  ✓ ${s.name} (${s.shortName}) — ${s.players.length} giocatori`);
  }

  // ── 3. Create stadia ──
  console.log("\n🏟️  Creazione stadi...");
  type CreatedStadium = Awaited<ReturnType<typeof prisma.stadium.create>>;
  const createdStadia: CreatedStadium[] = [];
  for (const st of stadiaData) {
    const stadium = await prisma.stadium.create({ data: st });
    createdStadia.push(stadium);
    console.log(`  ✓ ${st.name}`);
  }

  // ── 4. Create matchdays ──
  console.log("\n📅 Creazione giornate...");
  type CreatedMatchday = Awaited<ReturnType<typeof prisma.matchday.create>>;
  const matchdays: CreatedMatchday[] = [];
  const matchdayData = [
    { number: 1, deadline: new Date("2026-03-01T20:00:00Z"), status: "scored" },
    { number: 2, deadline: new Date("2026-03-08T20:00:00Z"), status: "scored" },
    { number: 3, deadline: new Date("2026-03-15T20:00:00Z"), status: "open" },
  ];

  for (const md of matchdayData) {
    const matchday = await prisma.matchday.create({ data: md });
    matchdays.push(matchday);
    console.log(`  ✓ Giornata ${md.number} — ${md.status}`);
  }

  // ── 5. Create matches (real games) ──
  console.log("\n⚽ Creazione partite...");

  const einsteinPlayers = allPlayers.get(0)!;
  const galileiPlayers = allPlayers.get(1)!;
  const dantePlayers = allPlayers.get(2)!;
  const modiglianiPlayers = allPlayers.get(3)!;

  // Matchday 1: Einstein vs Galilei (2-1)
  const match1 = await prisma.match.create({
    data: {
      externalId: 1,
      datetime: new Date("2026-03-02T15:00:00Z"),
      stadiumId: createdStadia[0].id,
      matchdayId: matchdays[0].id,
      scoreText: "2 - 1",
      name: "Einstein vs Galilei",
      finished: true,
      status: "finished",
    },
  });
  const tm1Home = await prisma.teamMatch.create({
    data: { externalId: 1, matchId: match1.id, schoolId: createdSchools[0].id, isHome: true, score: 2 },
  });
  const tm1Away = await prisma.teamMatch.create({
    data: { externalId: 2, matchId: match1.id, schoolId: createdSchools[1].id, isHome: false, score: 1 },
  });
  await prisma.matchEvent.createMany({
    data: [
      { externalId: 1, teamMatchId: tm1Home.id, playerId: einsteinPlayers[12].id, minute: 23, eventType: "GOAL" },
      { externalId: 2, teamMatchId: tm1Away.id, playerId: galileiPlayers[12].id, minute: 45, eventType: "GOAL" },
      { externalId: 3, teamMatchId: tm1Home.id, playerId: einsteinPlayers[7].id, minute: 78, eventType: "GOAL" },
      { externalId: 4, teamMatchId: tm1Away.id, playerId: galileiPlayers[4].id, minute: 55, eventType: "YELLOW_CARD" },
      { externalId: 5, teamMatchId: tm1Home.id, playerId: einsteinPlayers[3].id, minute: 67, eventType: "YELLOW_CARD" },
    ],
  });
  console.log(`  ✓ ${match1.name} (2-1) — 5 eventi`);

  // Matchday 1: Dante vs Modigliani (3-0)
  const match2 = await prisma.match.create({
    data: {
      externalId: 2,
      datetime: new Date("2026-03-02T17:00:00Z"),
      stadiumId: createdStadia[1].id,
      matchdayId: matchdays[0].id,
      scoreText: "3 - 0",
      name: "Dante vs Modigliani",
      finished: true,
      status: "finished",
    },
  });
  const tm2Home = await prisma.teamMatch.create({
    data: { externalId: 3, matchId: match2.id, schoolId: createdSchools[2].id, isHome: true, score: 3 },
  });
  const tm2Away = await prisma.teamMatch.create({
    data: { externalId: 4, matchId: match2.id, schoolId: createdSchools[3].id, isHome: false, score: 0 },
  });
  await prisma.matchEvent.createMany({
    data: [
      { externalId: 6, teamMatchId: tm2Home.id, playerId: dantePlayers[12].id, minute: 10, eventType: "GOAL" },
      { externalId: 7, teamMatchId: tm2Home.id, playerId: dantePlayers[7].id, minute: 10, eventType: "ASSIST" },
      { externalId: 8, teamMatchId: tm2Home.id, playerId: dantePlayers[12].id, minute: 52, eventType: "GOAL" },
      { externalId: 9, teamMatchId: tm2Home.id, playerId: dantePlayers[13].id, minute: 80, eventType: "GOAL" },
      { externalId: 10, teamMatchId: tm2Away.id, playerId: modiglianiPlayers[2].id, minute: 35, eventType: "YELLOW_CARD" },
      { externalId: 11, teamMatchId: tm2Away.id, playerId: modiglianiPlayers[5].id, minute: 70, eventType: "RED_CARD" },
    ],
  });
  console.log(`  ✓ ${match2.name} (3-0) — 6 eventi`);

  // Matchday 2: Einstein vs Dante (1-1)
  const match3 = await prisma.match.create({
    data: {
      externalId: 3,
      datetime: new Date("2026-03-09T15:00:00Z"),
      stadiumId: createdStadia[0].id,
      matchdayId: matchdays[1].id,
      scoreText: "1 - 1",
      name: "Einstein vs Dante",
      finished: true,
      status: "finished",
    },
  });
  const tm3Home = await prisma.teamMatch.create({
    data: { externalId: 5, matchId: match3.id, schoolId: createdSchools[0].id, isHome: true, score: 1 },
  });
  const tm3Away = await prisma.teamMatch.create({
    data: { externalId: 6, matchId: match3.id, schoolId: createdSchools[2].id, isHome: false, score: 1 },
  });
  await prisma.matchEvent.createMany({
    data: [
      { externalId: 12, teamMatchId: tm3Home.id, playerId: einsteinPlayers[13].id, minute: 30, eventType: "GOAL" },
      { externalId: 13, teamMatchId: tm3Away.id, playerId: dantePlayers[12].id, minute: 60, eventType: "GOAL" },
      { externalId: 14, teamMatchId: tm3Home.id, playerId: einsteinPlayers[4].id, minute: 88, eventType: "YELLOW_CARD" },
    ],
  });
  console.log(`  ✓ ${match3.name} (1-1) — 3 eventi`);

  // Matchday 2: Galilei vs Modigliani (2-2)
  const match4 = await prisma.match.create({
    data: {
      externalId: 4,
      datetime: new Date("2026-03-09T17:00:00Z"),
      stadiumId: createdStadia[1].id,
      matchdayId: matchdays[1].id,
      scoreText: "2 - 2",
      name: "Galilei vs Modigliani",
      finished: true,
      status: "finished",
    },
  });
  const tm4Home = await prisma.teamMatch.create({
    data: { externalId: 7, matchId: match4.id, schoolId: createdSchools[1].id, isHome: true, score: 2 },
  });
  const tm4Away = await prisma.teamMatch.create({
    data: { externalId: 8, matchId: match4.id, schoolId: createdSchools[3].id, isHome: false, score: 2 },
  });
  await prisma.matchEvent.createMany({
    data: [
      { externalId: 15, teamMatchId: tm4Home.id, playerId: galileiPlayers[12].id, minute: 15, eventType: "GOAL" },
      { externalId: 16, teamMatchId: tm4Away.id, playerId: modiglianiPlayers[12].id, minute: 25, eventType: "GOAL" },
      { externalId: 17, teamMatchId: tm4Home.id, playerId: galileiPlayers[7].id, minute: 55, eventType: "GOAL" },
      { externalId: 18, teamMatchId: tm4Away.id, playerId: modiglianiPlayers[13].id, minute: 85, eventType: "GOAL" },
    ],
  });
  console.log(`  ✓ ${match4.name} (2-2) — 4 eventi`);

  // Matchday 3 (upcoming): scheduled matches
  const match5 = await prisma.match.create({
    data: {
      externalId: 5,
      datetime: new Date("2026-03-16T15:00:00Z"),
      stadiumId: createdStadia[0].id,
      matchdayId: matchdays[2].id,
      name: "Einstein vs Modigliani",
      finished: false,
      status: "scheduled",
    },
  });
  await prisma.teamMatch.createMany({
    data: [
      { externalId: 9, matchId: match5.id, schoolId: createdSchools[0].id, isHome: true, score: 0 },
      { externalId: 10, matchId: match5.id, schoolId: createdSchools[3].id, isHome: false, score: 0 },
    ],
  });
  console.log(`  ✓ ${match5.name} (programmata)`);

  const match6 = await prisma.match.create({
    data: {
      externalId: 6,
      datetime: new Date("2026-03-16T17:00:00Z"),
      stadiumId: createdStadia[1].id,
      matchdayId: matchdays[2].id,
      name: "Galilei vs Dante",
      finished: false,
      status: "scheduled",
    },
  });
  await prisma.teamMatch.createMany({
    data: [
      { externalId: 11, matchId: match6.id, schoolId: createdSchools[1].id, isHome: true, score: 0 },
      { externalId: 12, matchId: match6.id, schoolId: createdSchools[2].id, isHome: false, score: 0 },
    ],
  });
  console.log(`  ✓ ${match6.name} (programmata)`);

  // ── 6. Create test users with fantasy teams ──
  console.log("\n👤 Creazione utenti e squadre fantasy...");
  const passwordHashed = await hash("password123", 12);

  type CreatedUser = Awaited<ReturnType<typeof prisma.user.create>>;
  type CreatedTeam = Awaited<ReturnType<typeof prisma.fantasyTeam.create>>;
  const createdUsers: CreatedUser[] = [];
  const createdTeams: CreatedTeam[] = [];

  for (const u of testUsers) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: passwordHashed,
        emailVerified: new Date(),
        schoolId: createdSchools[u.schoolIndex].id,
        hasTeam: true,
        budget: 0,
      },
    });
    createdUsers.push(user);

    const team = await prisma.fantasyTeam.create({
      data: { name: u.teamName, userId: user.id },
    });
    createdTeams.push(team);

    // Pick 15 players from ALL schools (different mix per user)
    const allPlayersFlat = [...allPlayers.values()].flat();
    const gks = allPlayersFlat.filter((p) => p.role === "GK");
    const defs = allPlayersFlat.filter((p) => p.role === "DEF");
    const mids = allPlayersFlat.filter((p) => p.role === "MID");
    const atts = allPlayersFlat.filter((p) => p.role === "ATT");

    const userIdx = createdUsers.length - 1;
    const pick = <T>(arr: T[], offset: number, count: number): T[] => {
      const result: T[] = [];
      for (let i = 0; i < count; i++) {
        result.push(arr[(offset + i) % arr.length]);
      }
      return result;
    };

    const roster = [
      ...pick(gks, userIdx * 2, 2),
      ...pick(defs, userIdx * 3, 5),
      ...pick(mids, userIdx * 3, 5),
      ...pick(atts, userIdx * 2, 3),
    ];

    // Deduplicate
    const seen = new Set<string>();
    const uniqueRoster: typeof roster = [];
    for (const p of roster) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        uniqueRoster.push(p);
      }
    }
    // Fill if needed
    for (const p of allPlayersFlat) {
      if (uniqueRoster.length >= 15) break;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        uniqueRoster.push(p);
      }
    }

    for (const p of uniqueRoster.slice(0, 15)) {
      await prisma.fantasyPlayer.create({
        data: { fantasyTeamId: team.id, realPlayerId: p.id },
      });
    }

    console.log(`  ✓ ${u.name} (${u.email}) — team: "${u.teamName}" — ${Math.min(uniqueRoster.length, 15)} giocatori`);
  }

  // ── 7. Create lineups for matchday 1 and 2 ──
  console.log("\n📋 Creazione formazioni...");
  for (let mdIdx = 0; mdIdx < 2; mdIdx++) {
    for (let tIdx = 0; tIdx < createdTeams.length; tIdx++) {
      const lineup = await prisma.lineup.create({
        data: {
          fantasyTeamId: createdTeams[tIdx].id,
          matchdayId: matchdays[mdIdx].id,
        },
      });

      const rosterPlayers = await prisma.fantasyPlayer.findMany({
        where: { fantasyTeamId: createdTeams[tIdx].id },
        include: { realPlayer: true },
      });

      const byRole = (role: string) => rosterPlayers.filter((fp) => fp.realPlayer.role === role);
      const starters = [
        ...byRole("GK").slice(0, 1),
        ...byRole("DEF").slice(0, 4),
        ...byRole("MID").slice(0, 4),
        ...byRole("ATT").slice(0, 2),
      ];
      const starterIds = new Set(starters.map((s) => s.id));
      const subs = rosterPlayers.filter((fp) => !starterIds.has(fp.id));

      for (const fp of starters) {
        await prisma.lineupPlayer.create({
          data: { lineupId: lineup.id, realPlayerId: fp.realPlayerId, isStarter: true },
        });
      }
      for (const fp of subs) {
        await prisma.lineupPlayer.create({
          data: { lineupId: lineup.id, realPlayerId: fp.realPlayerId, isStarter: false },
        });
      }
    }
    console.log(`  ✓ Formazioni giornata ${mdIdx + 1} — ${createdTeams.length} squadre`);
  }

  // ── 8. Create player votes for matchday 1 and 2 ──
  console.log("\n📝 Inserimento voti giocatori...");
  const allPlayersFlat = [...allPlayers.values()].flat();

  for (let mdIdx = 0; mdIdx < 2; mdIdx++) {
    for (const player of allPlayersFlat) {
      const baseVote = 5 + Math.random() * 3.5;
      const vote = Math.round(baseVote * 2) / 2;

      let goals = 0, assists = 0, yellowCards = 0, redCards = 0;

      if (player.role === "ATT" && Math.random() > 0.5) goals = Math.ceil(Math.random() * 2);
      if (player.role === "MID" && Math.random() > 0.6) goals = 1;
      if (player.role === "MID" && Math.random() > 0.5) assists = 1;
      if (player.role === "ATT" && Math.random() > 0.6) assists = 1;
      if (Math.random() > 0.8) yellowCards = 1;
      if (Math.random() > 0.97) redCards = 1;

      await prisma.playerVote.create({
        data: {
          realPlayerId: player.id,
          matchdayId: matchdays[mdIdx].id,
          vote, goals, assists, yellowCards, redCards,
        },
      });
    }
    console.log(`  ✓ Voti giornata ${mdIdx + 1} — ${allPlayersFlat.length} giocatori`);
  }

  // ── 9. Calculate matchday scores ──
  console.log("\n🧮 Calcolo punteggi giornata...");
  for (let mdIdx = 0; mdIdx < 2; mdIdx++) {
    for (let tIdx = 0; tIdx < createdTeams.length; tIdx++) {
      const lineup = await prisma.lineup.findUnique({
        where: {
          fantasyTeamId_matchdayId: {
            fantasyTeamId: createdTeams[tIdx].id,
            matchdayId: matchdays[mdIdx].id,
          },
        },
        include: {
          players: { where: { isStarter: true }, include: { realPlayer: true } },
        },
      });

      if (!lineup) continue;

      let totalPoints = 0;
      for (const lp of lineup.players) {
        const pv = await prisma.playerVote.findUnique({
          where: {
            realPlayerId_matchdayId: {
              realPlayerId: lp.realPlayerId,
              matchdayId: matchdays[mdIdx].id,
            },
          },
        });
        if (pv) {
          totalPoints += pv.vote + 3 * pv.goals + 1 * pv.assists - 0.5 * pv.yellowCards - 2 * pv.redCards;
        }
      }

      await prisma.matchdayScore.create({
        data: {
          fantasyTeamId: createdTeams[tIdx].id,
          matchdayId: matchdays[mdIdx].id,
          points: Math.round(totalPoints * 10) / 10,
        },
      });
    }
    console.log(`  ✓ Punteggi giornata ${mdIdx + 1} calcolati`);
  }

  // ── 10. Create leagues ──
  console.log("\n🏆 Creazione leghe...");

  const globalLeague = await prisma.league.create({
    data: {
      name: "Classifica Globale",
      isGlobal: true,
      inviteCode: null,
      creatorId: createdUsers[0].id,
    },
  });
  for (const user of createdUsers) {
    await prisma.leagueMember.create({
      data: { leagueId: globalLeague.id, userId: user.id },
    });
  }
  console.log(`  ✓ ${globalLeague.name} — ${createdUsers.length} membri`);

  const privateLeague1 = await prisma.league.create({
    data: {
      name: "Lega dei Geni",
      isGlobal: false,
      inviteCode: "GENI2026",
      creatorId: createdUsers[0].id,
    },
  });
  for (const user of [createdUsers[0], createdUsers[1], createdUsers[2]]) {
    await prisma.leagueMember.create({
      data: { leagueId: privateLeague1.id, userId: user.id },
    });
  }
  console.log(`  ✓ ${privateLeague1.name} (codice: GENI2026) — 3 membri`);

  const privateLeague2 = await prisma.league.create({
    data: {
      name: "Sfida Artisti",
      isGlobal: false,
      inviteCode: "ARTE2026",
      creatorId: createdUsers[4].id,
    },
  });
  for (const user of [createdUsers[3], createdUsers[4]]) {
    await prisma.leagueMember.create({
      data: { leagueId: privateLeague2.id, userId: user.id },
    });
  }
  console.log(`  ✓ ${privateLeague2.name} (codice: ARTE2026) — 2 membri`);

  // ── Summary ──
  console.log("\n" + "═".repeat(50));
  console.log("✅ SEED COMPLETATO!");
  console.log("═".repeat(50));
  console.log(`
📊 Riepilogo:
  • ${schools.length} scuole con ${allPlayersFlat.length} giocatori reali
  • ${stadiaData.length} stadi
  • ${matchdayData.length} giornate (${matchdayData.filter((m) => m.status === "scored").length} giocate, ${matchdayData.filter((m) => m.status === "open").length} aperte)
  • 6 partite reali con eventi
  • ${testUsers.length} utenti con squadre fantasy
  • 3 leghe (1 globale + 2 private)

🔑 Credenziali di test:
  • mario@test.com / password123
  • luigi@test.com / password123
  • anna@test.com  / password123
  • sara@test.com  / password123
  • luca@test.com  / password123

🏆 Codici invito leghe private:
  • GENI2026 — "Lega dei Geni"
  • ARTE2026 — "Sfida Artisti"
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

