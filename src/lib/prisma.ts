import { PrismaClient } from "@prisma/client";

declare global {
  // biome-ignore lint/style/noVar: required for globalThis caching in dev
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
