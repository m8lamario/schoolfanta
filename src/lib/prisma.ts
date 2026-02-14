import { PrismaClient } from "@prisma/client";

// In Next.js `.env*` viene caricato automaticamente a runtime.
// Su Windows/JetBrains e negli script (Prisma CLI, node -e) puo' non essere presente:
// carichiamo `.env.local` come fallback.
if (process.env.NODE_ENV !== "production") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("dotenv").config({ path: ".env.local" });
  } catch {
    // ignore: dotenv e' opzionale, ma consigliata per ambiente locale
  }
}

declare global {
  // biome-ignore lint/style/noVar: required for globalThis caching in dev
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
