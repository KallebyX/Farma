import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config: NO node-only providers (argon2, prisma, etc).
 * Used by middleware.ts which runs in the Edge runtime.
 */
export const authEdgeConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.id = user.id;
      return token;
    },
    session: async ({ session, token }) => {
      if (token.id && session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
