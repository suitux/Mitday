import { toLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LandingDemo } from "@/components/landing/demo";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function Landing({ params }: PageProps<"/[locale]">) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const points = ["guests", "grain", "privacy", "close"] as const;
  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <section className="grid items-start gap-10 pt-10 pb-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:pt-20">
        <div className="md:pt-6">
          <h1 className="max-w-[14ch] text-4xl leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link href="/plans/new">{t("cta")}</Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("ctaNote")}
            </span>
          </div>
        </div>
        <LandingDemo todayIso={new Date().toISOString()} />
      </section>

      <section className="pb-12" aria-labelledby="how">
        <h2
          id="how"
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("how.title")}
        </h2>
        <dl className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {points.map((p) => (
            <div key={p}>
              <dt className="text-base font-medium">{t(`how.${p}.title`)}</dt>
              <dd className="mt-1 max-w-prose leading-relaxed text-muted-foreground">
                {t(`how.${p}.body`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
