import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { authConfig } from "@/auth.config";
import { db, getDb } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import MagicLinkEmail from "@/emails/magic-link";
import { translatorFor } from "@/i18n/messages";
import { toLocale } from "@/i18n/routing";
import { sendEmail } from "@/lib/email";
import { testLoginEnabled } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

/** The callbackUrl carries the locale prefix (`/ca/dashboard`). */
function localeFromMagicLink(url: string) {
  try {
    const callback = new URL(url).searchParams.get("callbackUrl") ?? "";
    const path = callback.startsWith("http")
      ? new URL(callback).pathname
      : callback;
    return toLocale(path.split("/")[1]);
  } catch {
    return toLocale(undefined);
  }
}

const providers: Provider[] = [
  Google,
  Resend({
    from: process.env.EMAIL_FROM,
    async sendVerificationRequest({ identifier, url }) {
      const limit = await rateLimit("magicLink", identifier.toLowerCase());
      if (!limit.success) throw new Error("rate_limited");
      const locale = localeFromMagicLink(url);
      const t = translatorFor(locale, "emails.magicLink");
      await sendEmail({
        to: identifier,
        subject: t("subject"),
        react: MagicLinkEmail({
          lang: locale,
          url,
          strings: {
            preview: t("preview"),
            heading: t("heading"),
            button: t("button"),
            ignore: t("ignore"),
          },
        }),
      });
    },
  }),
];

if (testLoginEnabled()) {
  // Playwright-only provider. `testLoginEnabled()` is false in production.
  providers.push(
    Credentials({
      id: "test-login",
      name: "Test login",
      credentials: { email: {}, name: {} },
      async authorize(credentials) {
        if (!testLoginEnabled()) return null;
        const email = String(credentials?.email ?? "").toLowerCase();
        if (!email.endsWith("@test.quadra")) return null;
        const name = String(credentials?.name ?? email.split("@")[0]);
        const existing = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (existing) return existing;
        const [created] = await db
          .insert(users)
          .values({ email, name, emailVerified: new Date() })
          .returning();
        return created ?? null;
      },
    }),
  );
}

// Lazy config: the DB client (and DATABASE_URL) is only needed on first use.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...authConfig,
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
}));
