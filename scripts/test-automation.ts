/**
 * Script di test per verificare il flusso di automazione completo.
 * Esegui con: npx tsx scripts/test-automation.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Inizio test automazione SchoolFanta\n");

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Verifica/Crea utente admin
  // ═══════════════════════════════════════════════════════════════
  console.log("📌 STEP 1: Verifico utente admin...");
  
  let adminUser = await prisma.user.findFirst({
    where: { isAdmin: true },
  });

  if (!adminUser) {
    // Prendi il primo utente e rendilo admin
    const firstUser = await prisma.user.findFirst();
    if (firstUser) {
      adminUser = await prisma.user.update({
        where: { id: firstUser.id },
        data: { isAdmin: true },
      });
      console.log(`   ✅ Utente "${adminUser.email}" impostato come admin`);
    } else {
      console.log("   ❌ Nessun utente nel database. Crea un account prima.");
      return;
    }
  } else {
    console.log(`   ✅ Admin esistente: ${adminUser.email}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Crea/Verifica Scuole
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📌 STEP 2: Verifico scuole...");

  const schoolsData = [
    { name: "Liceo Galilei", shortName: "GAL", slug: "galilei" },
    { name: "Liceo Gioberti", shortName: "GIO", slug: "gioberti" },
  ];

  const schools = [];
  for (const s of schoolsData) {
    // Prima cerca per slug, poi per nome
    let school = await prisma.school.findFirst({
      where: { OR: [{ slug: s.slug }, { name: s.name }] },
    });
    
    if (!school) {
      school = await prisma.school.create({ data: s });
    }
    schools.push(school);
  }
  console.log(`   ✅ ${schools.length} scuole pronte`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Crea giocatori reali
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📌 STEP 3: Creo giocatori reali di test...");

  const playersData = [
    // Galilei
    { name: "Marco Rossi", role: "P", schoolId: schools[0].id, value: 10 },
    { name: "Luca Bianchi", role: "D", schoolId: schools[0].id, value: 8 },
    { name: "Andrea Verdi", role: "D", schoolId: schools[0].id, value: 7 },
    { name: "Paolo Neri", role: "C", schoolId: schools[0].id, value: 12 },
    { name: "Matteo Gialli", role: "C", schoolId: schools[0].id, value: 10 },
    { name: "Davide Blu", role: "A", schoolId: schools[0].id, value: 15 },
    // Gioberti
    { name: "Giovanni Russo", role: "P", schoolId: schools[1].id, value: 9 },
    { name: "Francesco Conti", role: "D", schoolId: schools[1].id, value: 8 },
    { name: "Alessandro Romano", role: "D", schoolId: schools[1].id, value: 7 },
    { name: "Simone Ferrari", role: "C", schoolId: schools[1].id, value: 11 },
    { name: "Lorenzo Costa", role: "C", schoolId: schools[1].id, value: 10 },
    { name: "Riccardo Marino", role: "A", schoolId: schools[1].id, value: 14 },
  ];

  const players = [];
  for (const p of playersData) {
    // Cerca giocatore esistente per nome e scuola
    let player = await prisma.realPlayer.findFirst({
      where: { name: p.name, schoolId: p.schoolId },
    });
    
    if (!player) {
      player = await prisma.realPlayer.create({ data: p });
    }
    players.push(player);
  }
  console.log(`   ✅ ${players.length} giocatori creati/verificati`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Crea Matchday di test (con deadline passata)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📌 STEP 4: Creo Matchday di test...");

  // Elimina matchday di test esistente
  await prisma.matchday.deleteMany({
    where: { number: 99 },
  });

  const testMatchday = await prisma.matchday.create({
    data: {
      number: 99,
      deadline: new Date(Date.now() - 1000 * 60 * 60), // 1 ora fa
      status: "open", // Parte come "open" per testare il lock
    },
  });
  console.log(`   ✅ Matchday #${testMatchday.number} creata (status: ${testMatchday.status})`);
  console.log(`   📅 Deadline: ${testMatchday.deadline.toISOString()} (nel passato)`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: Crea FantasyTeam e Lineup per l'admin
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📌 STEP 5: Creo FantasyTeam e Lineup di test...");

  // Verifica se l'admin ha già un team
  let fantasyTeam = await prisma.fantasyTeam.findUnique({
    where: { userId: adminUser.id },
  });

  if (!fantasyTeam) {
    fantasyTeam = await prisma.fantasyTeam.create({
      data: {
        name: "Test Team Admin",
        userId: adminUser.id,
      },
    });
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { hasTeam: true },
    });
    console.log(`   ✅ FantasyTeam "${fantasyTeam.name}" creato`);
  } else {
    console.log(`   ✅ FantasyTeam esistente: "${fantasyTeam.name}"`);
  }

  // Crea lineup per la giornata di test
  await prisma.lineup.deleteMany({
    where: {
      fantasyTeamId: fantasyTeam.id,
      matchdayId: testMatchday.id,
    },
  });

  const lineup = await prisma.lineup.create({
    data: {
      fantasyTeamId: fantasyTeam.id,
      matchdayId: testMatchday.id,
      players: {
        create: players.slice(0, 6).map((p) => ({
          realPlayerId: p.id,
          isStarter: true, // tutti titolari per il test
        })),
      },
    },
    include: { players: true },
  });
  console.log(`   ✅ Lineup creata con ${lineup.players.length} giocatori titolari`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 6: Test API lock-matchday
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📌 STEP 6: Test /api/cron/lock-matchday...");

  const cronSecret = process.env.CRON_SECRET || "schoolfanta-cron-secret-change-this-in-production";
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const lockResponse = await fetch(`${baseUrl}/api/cron/lock-matchday`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });
    const lockData = await lockResponse.json();
    console.log(`   📤 Response:`, JSON.stringify(lockData, null, 2));

    // Verifica che la matchday sia stata bloccata
    const updatedMatchday = await prisma.matchday.findUnique({
      where: { id: testMatchday.id },
    });
    console.log(`   ✅ Status matchday: ${updatedMatchday?.status}`);
  } catch (error) {
    console.log(`   ⚠️ Server non raggiungibile (avvia npm run dev prima)`);
    console.log(`   💡 Simulo il lock manualmente...`);
    await prisma.matchday.update({
      where: { id: testMatchday.id },
      data: { status: "locked" },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 7: Inserisci voti di test
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📌 STEP 7: Inserisco voti di test...");

  const testVotes = [
    { realPlayerId: players[0].id, vote: 7, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
    { realPlayerId: players[1].id, vote: 6.5, goals: 0, assists: 1, yellowCards: 1, redCards: 0 },
    { realPlayerId: players[2].id, vote: 6, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
    { realPlayerId: players[3].id, vote: 7.5, goals: 1, assists: 0, yellowCards: 0, redCards: 0 },
    { realPlayerId: players[4].id, vote: 6, goals: 0, assists: 0, yellowCards: 1, redCards: 0 },
    { realPlayerId: players[5].id, vote: 8, goals: 2, assists: 1, yellowCards: 0, redCards: 0 },
  ];

  for (const v of testVotes) {
    await prisma.playerVote.upsert({
      where: {
        realPlayerId_matchdayId: {
          realPlayerId: v.realPlayerId,
          matchdayId: testMatchday.id,
        },
      },
      update: v,
      create: {
        ...v,
        matchdayId: testMatchday.id,
      },
    });
  }
  console.log(`   ✅ ${testVotes.length} voti inseriti`);

  // Calcola punteggio atteso
  let expectedPoints = 0;
  for (const v of testVotes) {
    const pts = v.vote + 3 * v.goals + v.assists - 0.5 * v.yellowCards - 2 * v.redCards;
    expectedPoints += pts;
  }
  console.log(`   📊 Punteggio atteso: ${expectedPoints.toFixed(1)}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 8: Test API auto-score
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📌 STEP 8: Test /api/cron/auto-score...");

  // Prima assicuriamoci che la matchday sia "locked" e che non ci siano match non finiti
  await prisma.matchday.update({
    where: { id: testMatchday.id },
    data: { status: "locked" },
  });

  try {
    const scoreResponse = await fetch(`${baseUrl}/api/cron/auto-score`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });
    const scoreData = await scoreResponse.json();
    console.log(`   📤 Response:`, JSON.stringify(scoreData, null, 2));
  } catch (error) {
    console.log(`   ⚠️ Server non raggiungibile`);
    console.log(`   💡 Eseguo il calcolo manualmente...`);

    // Simulo il calcolo
    const { calculateMatchdayScores } = await import("../src/lib/scoring");
    const result = await calculateMatchdayScores(testMatchday.id);
    console.log(`   ✅ Calcolato: ${result.teamsScored} squadre`);

    await prisma.matchday.update({
      where: { id: testMatchday.id },
      data: { status: "scored" },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 9: Verifica risultati finali
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📌 STEP 9: Verifica risultati finali...");

  const finalMatchday = await prisma.matchday.findUnique({
    where: { id: testMatchday.id },
  });
  console.log(`   📅 Matchday #${finalMatchday?.number} - Status: ${finalMatchday?.status}`);

  const score = await prisma.matchdayScore.findUnique({
    where: {
      fantasyTeamId_matchdayId: {
        fantasyTeamId: fantasyTeam.id,
        matchdayId: testMatchday.id,
      },
    },
  });

  if (score) {
    console.log(`   🏆 Punteggio registrato: ${score.points}`);
    console.log(`   📊 Punteggio atteso: ${expectedPoints.toFixed(1)}`);
    
    if (Math.abs(score.points - expectedPoints) < 0.1) {
      console.log(`   ✅ CALCOLO CORRETTO!`);
    } else {
      console.log(`   ❌ ERRORE: Differenza di ${Math.abs(score.points - expectedPoints).toFixed(1)} punti`);
    }
  } else {
    console.log(`   ❌ Nessun punteggio trovato`);
  }

  // ═══════════════════════════════════════════════════════════════
  // RIEPILOGO
  // ═══════════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("📋 RIEPILOGO TEST");
  console.log("═".repeat(60));
  console.log(`
  👤 Admin: ${adminUser.email}
  🏫 Scuole: ${schools.length}
  ⚽ Giocatori: ${players.length}
  📅 Matchday: #${testMatchday.number}
  🎯 Lineup: ${lineup.players.length} titolari
  📝 Voti: ${testVotes.length}
  🏆 Punteggio: ${score?.points ?? "N/A"} (atteso: ${expectedPoints.toFixed(1)})
  📊 Status finale: ${finalMatchday?.status}
  `);

  console.log("═".repeat(60));
  console.log("🎉 Test completato!");
  console.log("═".repeat(60));
  console.log(`
  Per testare il pannello admin:
  1. Avvia: npm run dev
  2. Vai su: http://localhost:3000/admin
  3. Login con: ${adminUser.email}
  `);
}

main()
  .catch((e) => {
    console.error("❌ Errore:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

