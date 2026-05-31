import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config: NO node-only providers (argon2, prisma, etc).
 * Used by middleware.ts which runs in the Edge runtime.
 */
export const authEdgeConfig = {
  // Read the secret from either env name (Auth.js v5 defaults to AUTH_SECRET;
  // this project documents NEXTAUTH_SECRET) so it works regardless of which is set.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Trust the deployment host (Vercel sets VERCEL_URL); avoids UntrustedHost.
  trustHost: true,
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
