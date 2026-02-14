import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";

function hasGoogleEnv() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

const isDev = process.env.NODE_ENV !== "production";

if (isDev && !process.env.NEXTAUTH_URL) {
  // In dev NextAuth usa NEXTAUTH_URL per validare callback/redirect.
  // Se manca, alcuni setup (proxy/IDE) possono finire in redirect loop.
  process.env.NEXTAUTH_URL = "http://localhost:3000";
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // JWT strategy works best with middleware + getToken.
  // We'll still store users/accounts in Postgres via PrismaAdapter.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(hasGoogleEnv()
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Email e password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.passwordHash) return null;

          const ok = await compare(password, user.passwordHash);
          if (!ok) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          };
        } catch (error) {
          console.error("[auth] credentials authorize error", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id && !token.sub) token.sub = user.id;
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        (session.user as { id?: string }).id =
          (typeof token?.sub === "string" ? token.sub : undefined) ??
          (user?.id ?? undefined);
      }
      return session;
    },
  },
  events: undefined,
  debug: isDev,
  // NOTE: next-auth@4 non supporta `trustHost` / `useSecureCookies` (sono v5).
  // Lasciamo che next-auth gestisca host e cookie in modo standard.
  secret: process.env.NEXTAUTH_SECRET,
  logger: undefined,
};
