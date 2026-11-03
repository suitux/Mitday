"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { testLoginEnabled } from "@/lib/env";

export async function signOutAction() {
  const locale = await getLocale();
  await signOut({ redirectTo: `/${locale}` });
}

function safeCallback(raw: unknown, locale: string) {
  const v = typeof raw === "string" ? raw : "";
  // Only same-origin relative paths.
  return v.startsWith("/") && !v.startsWith("//") ? v : `/${locale}/dashboard`;
}

export async function signInWithGoogle(formData: FormData) {
  const locale = await getLocale();
  await signIn("google", {
    redirectTo: safeCallback(formData.get("callbackUrl"), locale),
  });
}

export type EmailSignInState =
  { error?: "invalid_email" | "rate_limited" | "server" } | undefined;

export async function signInWithEmail(
  _prev: EmailSignInState,
  formData: FormData,
): Promise<EmailSignInState> {
  const locale = await getLocale();
  const email = z.email().safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!email.success) return { error: "invalid_email" };
  try {
    await signIn("resend", {
      email: email.data,
      redirectTo: safeCallback(formData.get("callbackUrl"), locale),
    });
  } catch (err) {
    // signIn() redirects by throwing; let that through.
    if (err && typeof err === "object" && "digest" in err) throw err;
    const message =
      err instanceof Error
        ? `${err.message} ${String((err as { cause?: { err?: Error } }).cause?.err?.message ?? "")}`
        : "";
    return {
      error: message.includes("rate_limited") ? "rate_limited" : "server",
    };
  }
  return undefined;
}

/** Playwright-only. Disabled unless AUTH_TEST_LOGIN=1 outside production. */
export async function signInForTests(formData: FormData) {
  if (!testLoginEnabled()) throw new Error("not available");
  const locale = await getLocale();
  await signIn("test-login", {
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    redirectTo: safeCallback(formData.get("callbackUrl"), locale),
  });
}
