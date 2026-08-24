import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
// import FacebookProvider from "next-auth/providers/facebook"; // add when ready
// import AzureADProvider from "next-auth/providers/azure-ad";  // Microsoft — add when ready
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Uncomment once you have Facebook app credentials:
    // FacebookProvider({
    //   clientId: process.env.FACEBOOK_CLIENT_ID!,
    //   clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    // }),

    // Uncomment once you have the Microsoft (Azure AD) app credentials:
    // AzureADProvider({
    //   clientId: process.env.MICROSOFT_CLIENT_ID!,
    //   clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    //   tenantId: "common", // allows personal + org Microsoft accounts
    // }),
  ],
  session: {
    strategy: "database", // sessions live in the Session table, not just a JWT cookie
    maxAge: 60 * 60 * 24 * 30, // 30 days — keeps you signed in without repeated logins
  },
  callbacks: {
    // The site owner's email (OWNER_EMAIL env var) is auto-promoted to ADMIN
    // on every sign-in, so there's no manual "make me admin" step. Everyone
    // else keeps whatever role they already have (default: USER).
    async signIn({ user }) {
      if (user.email && process.env.OWNER_EMAIL && user.email.toLowerCase() === process.env.OWNER_EMAIL.toLowerCase()) {
        if ((user as any).role !== "ADMIN") {
          await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
        }
      }
      return true;
    },
    // Attach id + role onto the session object so pages/components can
    // read `session.user.role` without an extra database call.
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        (session.user as any).role = (user as any).role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
