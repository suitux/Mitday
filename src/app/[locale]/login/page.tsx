import { toLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  EmailForm,
  GoogleButton,
  TestLoginForm,
} from "@/components/auth/login-forms";
import { testLoginEnabled } from "@/lib/env";
import { currentUser } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title") };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const sp = await searchParams;
  const raw = typeof sp.callbackUrl === "string" ? sp.callbackUrl : "";
  const callbackUrl =
    raw.startsWith("/") && !raw.startsWith("//") ? raw : `/${locale}/dashboard`;
  if (await currentUser()) redirect(callbackUrl);
  const t = await getTranslations("auth");
  const error = typeof sp.error === "string" ? sp.error : null;
  return (
    <main className="mx-auto w-full max-w-sm px-4 pt-12 pb-16 sm:pt-20">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {t("error")}
        </p>
      ) : null}
      <div className="mt-8 grid gap-6">
        <GoogleButton callbackUrl={callbackUrl} />
        <div
          className="flex items-center gap-3 text-sm text-muted-foreground"
          aria-hidden="true"
        >
          <span className="h-px flex-1 bg-border" />
          {t("or")}
          <span className="h-px flex-1 bg-border" />
        </div>
        <EmailForm callbackUrl={callbackUrl} />
        {testLoginEnabled() ? (
          <TestLoginForm callbackUrl={callbackUrl} />
        ) : null}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">{t("guestNote")}</p>
    </main>
  );
}
