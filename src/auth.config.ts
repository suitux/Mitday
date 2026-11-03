import type { NextAuthConfig } from "next-auth";

/**
 * Edge/proxy-safe part of the Auth.js config (no DB, no email provider).
 * The full config lives in `src/auth.ts`.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login", verifyRequest: "/login/check", error: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
