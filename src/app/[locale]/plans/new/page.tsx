import { toLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlanWizard } from "@/components/plan-form/wizard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("wizard");
  return { title: t("title") };
}

export default async function NewPlanPage({
  params,
}: PageProps<"/[locale]/plans/new">) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations("wizard");
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        {t("title")}
      </h1>
      <PlanWizard
        defaults={{
          yes: t("defaults.yes"),
          no: t("defaults.no"),
          lunch: t("defaults.lunch"),
          dinner: t("defaults.dinner"),
        }}
      />
    </main>
  );
}
