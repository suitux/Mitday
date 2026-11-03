import { toLocale } from "@/i18n/routing";
import { eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { after } from "next/server";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { aggregate } from "@/lib/aggregate";
import { formatCell } from "@/lib/format";
import { cellPlanDate, compareCells } from "@/lib/grid";
import {
  getOwnedPlans,
  getParticipatingPlans,
  toGridPlan,
  type DashboardPlan,
} from "@/server/plans";
import { currentUser } from "@/server/session";
import { redirect } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

function summary(row: DashboardPlan, locale: string) {
  const grid = toGridPlan(row.bundle);
  if (row.plan.status === "closed" && row.plan.finalCell) {
    return {
      kind: "final" as const,
      text: formatCell(grid, row.plan.finalCell, locale),
    };
  }
  const agg = aggregate(
    row.bundle.options,
    row.responses,
    row.participantCount,
    (a, b) => compareCells(grid, a, b),
    (c) => cellPlanDate(grid, c) ?? c,
  );
  const best = agg.best[0];
  return best
    ? { kind: "best" as const, text: formatCell(grid, best, locale) }
    : null;
}

export default async function Dashboard({
  params,
}: PageProps<"/[locale]/dashboard">) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const user = await currentUser();
  if (!user) return redirect({ href: "/login", locale });
  after(() =>
    db
      .update(users)
      .set({ locale })
      .where(eq(users.id, user.id))
      .catch(() => {}),
  );
  const t = await getTranslations("dashboard");
  const [mine, joined] = await Promise.all([
    getOwnedPlans(user.id),
    getParticipatingPlans(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Button asChild>
          <Link href="/plans/new">
            <Plus /> {t("newPlan")}
          </Link>
        </Button>
      </div>

      <section className="mt-8" aria-labelledby="mine">
        <h2 id="mine" className="text-base font-medium">
          {t("mine")}{" "}
          <span className="num font-normal text-muted-foreground">
            {mine.length}
          </span>
        </h2>
        {mine.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border p-6">
            <p className="font-medium">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("emptyBody")}
            </p>
            <Button asChild className="mt-4">
              <Link href="/plans/new">{t("emptyCta")}</Link>
            </Button>
          </div>
        ) : (
          <PlanList rows={mine} locale={locale} owned t={t} />
        )}
      </section>

      <section className="mt-10" aria-labelledby="joined">
        <h2 id="joined" className="text-base font-medium">
          {t("participating")}{" "}
          <span className="num font-normal text-muted-foreground">
            {joined.length}
          </span>
        </h2>
        {joined.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            {t("participatingEmpty")}
          </p>
        ) : (
          <PlanList rows={joined} locale={locale} owned={false} t={t} />
        )}
      </section>
    </main>
  );
}

function PlanList({
  rows,
  locale,
  owned,
  t,
}: {
  rows: DashboardPlan[];
  locale: string;
  owned: boolean;
  t: Awaited<ReturnType<typeof getTranslations<"dashboard">>>;
}) {
  return (
    <ul className="mt-3 divide-y divide-[var(--rule)] rounded-lg border border-border bg-card">
      {rows.map((row) => {
        const s = summary(row, locale);
        const href = owned
          ? `/plans/${row.plan.id}/manage`
          : `/p/${row.plan.slug}`;
        return (
          <li key={row.plan.id}>
            <Link
              href={href}
              className="flex flex-col gap-1 px-4 py-3 outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {row.plan.title}
                </span>
                <span className="block truncate text-sm text-muted-foreground first-letter:uppercase">
                  {s
                    ? s.kind === "final"
                      ? t("final", { when: s.text })
                      : t("best", { when: s.text })
                    : t("noAnswers")}
                </span>
              </span>
              <span className="flex items-center gap-3 text-sm">
                <span className="num text-muted-foreground">
                  {t("participants", { count: row.participantCount })}
                </span>
                <span
                  className={
                    row.plan.status === "closed"
                      ? "rounded-sm bg-[#dcfae5] px-1.5 py-0.5 text-xs text-[#04250e]"
                      : "rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                  }
                >
                  {row.plan.status === "closed" ? t("closed") : t("open")}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
