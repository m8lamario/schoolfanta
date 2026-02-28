import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const schools = [
  {
    name: "Liceo Scientifico Einstein",
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
];

async function main() {
  console.log("🌱 Seeding database...");

  for (const s of schools) {
    const school = await prisma.school.upsert({
      where: { name: s.name },
      update: {},
      create: { name: s.name },
    });

    for (const p of s.players) {
      // Evita duplicati se il seed gira più volte
      const existing = await prisma.realPlayer.findFirst({
        where: { name: p.name, schoolId: school.id },
      });
      if (!existing) {
        await prisma.realPlayer.create({
          data: { ...p, schoolId: school.id },
        });
      }
    }

    console.log(`  ✓ ${s.name} — ${s.players.length} giocatori`);
  }

  console.log("✅ Seed completato!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

