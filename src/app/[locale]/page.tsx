import { toLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GroupChat } from "@/components/landing/group-chat";
import { LandingDemo } from "@/components/landing/demo";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const TYPES = ["adapts", "noSignup", "dinner", "secret", "late"] as const;

export default async function Landing({ params }: PageProps<"/[locale]">) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <section className="pt-10 pb-24 lg:pt-20">
          <h1 className="max-w-[16ch] text-4xl leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
            {t("title")}
          </h1>
          <div className="mt-8 grid items-start gap-10 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
            <div>
              <p className="max-w-lg text-lg leading-relaxed">
                {t("subtitle")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
                <Button asChild size="lg" className="h-12 px-6 text-base">
                  <Link href="/plans/new">{t("cta")}</Link>
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("ctaNote")}
                </span>
              </div>
            </div>
            <LandingDemo todayIso={new Date().toISOString()} />
          </div>
        </section>

        <section
          aria-labelledby="chat"
          className="grid items-center gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-24"
        >
          <div className="lg:order-2">
            <h2
              id="chat"
              className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl"
            >
              {t("chat.title")}
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed">
              {t("chat.body")}
            </p>
          </div>
          <GroupChat />
        </section>

        <section aria-labelledby="types" className="py-16 lg:py-24">
          <h2
            id="types"
            className="max-w-[20ch] text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl"
          >
            {t("types.title")}
          </h2>
          <dl className="mt-12 grid gap-y-10 sm:mt-16">
            {TYPES.map((k) => (
              <div
                key={k}
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] sm:gap-12"
              >
                <dt className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                  {t(`types.${k}.title`)}
                </dt>
                <dd className="max-w-prose text-base leading-relaxed sm:text-lg">
                  {t(`types.${k}.body`)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section
        aria-labelledby="end"
        className="mt-16 bg-primary text-primary-foreground"
      >
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:py-28">
          <h2
            id="end"
            className="text-4xl leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-6xl"
          >
            {t("end.title")}
          </h2>
          <div>
            <p className="max-w-md text-lg leading-relaxed">{t("end.body")}</p>
            <Button
              asChild
              size="lg"
              className="mt-6 h-12 bg-background px-6 text-base text-foreground hover:bg-background/85"
            >
              <Link href="/plans/new">{t("end.cta")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
