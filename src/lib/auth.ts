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

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // JWT strategy works best with middleware + getToken.
  // We'll still store users/accounts in Postgres via PrismaAdapter.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
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

        if (isDev) {
          console.log("[auth][credentials][authorize]", {
            hasEmail: Boolean(email),
            hasPassword: Boolean(password),
          });
        }

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        if (isDev) {
          console.log("[auth][credentials][authorize] user lookup", {
            email,
            found: Boolean(user),
            hasPasswordHash: Boolean(user?.passwordHash),
          });
        }

        if (!user?.passwordHash) return null;

        const ok = await compare(password, user.passwordHash);

        if (isDev) {
          console.log("[auth][credentials][authorize] password match", { ok });
        }

        if (!ok) return null;

        const safeUser = {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };

        if (isDev) {
          console.log("[auth][credentials][authorize] success", {
            id: safeUser.id,
            email: safeUser.email,
          });
        }

        return safeUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (isDev) {
        console.log("[auth][callback][jwt]", {
          trigger,
          hasUser: Boolean(user),
          provider: account?.provider,
          sub: token?.sub,
        });
      }

      // Ensure the user id ends up in token.sub for credentials flows.
      if (user?.id && !token.sub) {
        token.sub = user.id;
      }

      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        (session.user as { id?: string }).id =
          (typeof token?.sub === "string" ? token.sub : undefined) ??
          (user?.id ?? undefined);
      }

      if (isDev) {
        console.log("[auth][callback][session]", {
          hasSession: Boolean(session),
          userId: (session.user as { id?: string } | undefined)?.id,
          email: session.user?.email,
          tokenSub: token?.sub,
        });
      }

      return session;
    },
  },
  events: isDev
    ? {
        async signIn({ user, account, isNewUser }) {
          console.log("[auth][event][signIn]", {
            userId: user?.id,
            provider: account?.provider,
            isNewUser,
          });
        },
        async signOut({ token, session }) {
          console.log("[auth][event][signOut]", {
            tokenSub: token?.sub,
            hasSession: Boolean(session),
          });
        },
      }
    : undefined,
  debug: isDev,
  trustHost: true,
  cookies: {
    sessionToken: {
      name: isDev ? "next-auth.session-token" : "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: !isDev,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
