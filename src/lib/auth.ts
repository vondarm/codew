import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";

type RequiredEnvKey =
  | "CREDENTIALS_LOGIN"
  | "CREDENTIALS_PASSWORD"
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET"
  | "NEXTAUTH_SECRET";

function getRequiredEnv(key: RequiredEnvKey) {
  const value = process.env[key];

  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${key}. Check docs/auth.md for setup instructions.`,
    );
  }

  return value;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        login: { label: "Login", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const login = credentials?.login?.trim();
        const password = credentials?.password;

        if (!login || !password) {
          return null;
        }

        const requiredLogin = getRequiredEnv("CREDENTIALS_LOGIN");
        const requiredPassword = getRequiredEnv("CREDENTIALS_PASSWORD");

        if (login !== requiredLogin || password !== requiredPassword) {
          return null;
        }

        const fallbackEmail = `${requiredLogin}@codew.local`;
        const email = process.env.CREDENTIALS_EMAIL?.trim() || fallbackEmail;
        const name = process.env.CREDENTIALS_NAME?.trim() || requiredLogin;

        const user = await prisma.user.upsert({
          where: { email },
          update: { name },
          create: {
            email,
            name,
          },
        });

        return {
          id: user.id,
          name: user.name ?? name,
          email: user.email ?? email,
        };
      },
    }),
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
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    session: async ({ session, user }) => {
      if (!session.user) {
        return session;
      }

      if (user) {
        session.user.id = user.id;
        session.user.name = user.name;
        session.user.email = user.email;
        session.user.image = user.image;
      }

      return session;
    },
  },
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
