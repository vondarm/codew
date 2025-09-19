import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";

function getRequiredEnv(key: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "NEXTAUTH_SECRET") {
  const value = process.env[key];

  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${key}. Check docs/auth.md for setup instructions.`);
  }

  return value;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  session: {
    strategy: "database",
  },
  secret: getRequiredEnv("NEXTAUTH_SECRET"),
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        session.user.name = user.name;
        session.user.email = user.email;
        session.user.image = user.image;
      }

      return session;
    },
  },
  trustHost: true,
};

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

export type CurrentUser = NonNullable<Session["user"]>;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return null;
  }

  return session.user as CurrentUser;
}
