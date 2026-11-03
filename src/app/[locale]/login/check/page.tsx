import { toLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.check");
  return { title: t("title") };
}

export default async function CheckEmailPage({
  params,
}: PageProps<"/[locale]/login/check">) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations("auth.check");
  return (
    <main className="mx-auto w-full max-w-sm px-4 pt-12 pb-16 sm:pt-20">
      <MailCheck className="size-6 text-muted-foreground" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-2 leading-relaxed text-muted-foreground">{t("body")}</p>
      <Link
        href="/login"
        className="mt-8 inline-block text-sm underline underline-offset-4"
      >
        {t("back")}
      </Link>
    </main>
  );
}
