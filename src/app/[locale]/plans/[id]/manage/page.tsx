import { toLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import {
  ClosePanel,
  DangerPanel,
  EditPanel,
  ResponsesTable,
  ShareRow,
  type ManageData,
} from "@/components/manage/manage-client";
import type { FormState } from "@/components/plan-form/sections";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { aggregate } from "@/lib/aggregate";
import { cellPlanDate, compareCells, todayIn } from "@/lib/grid";
import type { OptionColor } from "@/lib/plan-schema";
import { shareLinkFor } from "@/server/links";
import {
  getOwnedPlan,
  getParticipantsAndResponses,
  toGridPlan,
} from "@/server/plans";
import { currentUser } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("manage");
  return { title: t("title"), robots: { index: false } };
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-border py-8 md:grid-cols-[260px_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="text-base font-medium">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function ManagePage({
  params,
}: PageProps<"/[locale]/plans/[id]/manage">) {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const user = await currentUser();
  // Anyone but the owner gets a 404.
  const b = user ? await getOwnedPlan(id, user.id) : null;
  if (!b) notFound();
  const t = await getTranslations("manage");
  const data = await getParticipantsAndResponses(b.plan.id);
  const grid = toGridPlan(b);
  const agg = aggregate(
    b.options,
    data.responses,
    data.participants.length,
    (x, y) => compareCells(grid, x, y),
    (c) => cellPlanDate(grid, c) ?? c,
  );
  const cells = Object.keys(agg.cells).sort((x, y) => compareCells(grid, x, y));
  const scores = Object.fromEntries(
    Object.entries(agg.cells).map(([c, a]) => [c, a.score]),
  );

  const form: FormState = {
    details: { title: b.plan.title, description: b.plan.description ?? "" },
    when: {
      dateMode: b.plan.dateMode,
      rangeStart: b.plan.rangeStart,
      rangeEnd: b.plan.rangeEnd,
      dates: b.dates,
      granularity: b.plan.granularity,
      slots:
        b.slots.length > 0
          ? b.slots.map((s) => ({ id: s.id, label: s.label }))
          : [{ label: "" }],
      hourInterval: (b.plan.hourInterval ?? 60) as 30 | 60,
      dayStartMinute: b.plan.dayStartMinute ?? 540,
      dayEndMinute: b.plan.dayEndMinute ?? 1380,
      timezone: b.plan.timezone,
    },
    answers: {
      options: b.options.map((o) => ({
        id: o.id,
        label: o.label,
        color: o.color as OptionColor,
        weight: o.weight,
      })),
    },
    privacy: {
      visibility: b.plan.visibility,
      notifyOnResponse: b.plan.notifyOnResponse,
    },
  };

  const manage: ManageData = {
    plan: {
      id: b.plan.id,
      slug: b.plan.slug,
      title: b.plan.title,
      description: b.plan.description,
      status: b.plan.status,
      finalCell: b.plan.finalCell,
      visibility: b.plan.visibility,
      grid,
      options: b.options.map((o) => ({
        id: o.id,
        label: o.label,
        color: o.color,
        weight: o.weight,
        order: o.order,
      })),
    },
    shareUrl: shareLinkFor(locale, b.plan.slug),
    participants: data.participants.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      linked: !!p.userId,
    })),
    responses: data.responses,
    cells,
    scores,
    best: agg.best,
    form,
    today: todayIn(b.plan.timezone),
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-balance wrap-break-word">
            {b.plan.title}
          </h1>
          <p className="num mt-1 text-sm text-muted-foreground">
            {t("summary", { count: data.participants.length })} ·{" "}
            {b.plan.status === "closed" ? t("statusClosed") : t("statusOpen")}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/p/${b.plan.slug}`}>
            <ExternalLink /> {t("participate")}
          </Link>
        </Button>
      </div>

      <div className="mt-6 max-w-xl">
        <ShareRow url={manage.shareUrl} />
      </div>

      <section className="mt-10" aria-labelledby="answers-title">
        <h2 id="answers-title" className="mb-3 text-base font-medium">
          {t("answers")}
        </h2>
        <ResponsesTable data={manage} />
      </section>

      <div className="mt-10">
        <Row title={t("closeTitle")} description={t("closeDescription")}>
          <ClosePanel data={manage} />
        </Row>
        <Row
          title={t("editTitle")}
          description={
            data.responses.length > 0 ? t("editLocked") : t("editDescription")
          }
        >
          <EditPanel data={manage} hasResponses={data.responses.length > 0} />
        </Row>
        <Row title={t("dangerTitle")}>
          <DangerPanel data={manage} />
        </Row>
      </div>
    </main>
  );
}
