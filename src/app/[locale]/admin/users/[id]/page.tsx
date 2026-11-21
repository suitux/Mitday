import { toLocale } from "@/i18n/routing";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { formatCell, formatDate } from "@/lib/format";
import { getAdminUser } from "@/server/admin";
import {
  getOwnedPlans,
  getParticipatingPlans,
  toGridPlan,
  type DashboardPlan,
} from "@/server/plans";
import { currentAdmin } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminUserPage({
  params,
}: PageProps<"/[locale]/admin/users/[id]">) {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const admin = await currentAdmin();
  if (!admin) notFound();
  const user = await getAdminUser(id);
  if (!user) notFound();
  const t = await getTranslations("admin");
  const [owned, joined] = await Promise.all([
    getOwnedPlans(user.id),
    getParticipatingPlans(user.id),
  ]);

  const facts: [string, string][] = [
    [t("email"), user.email ?? "—"],
    [t("locale"), user.locale.toUpperCase()],
    [t("verified"), user.emailVerified ? t("verified") : t("notVerified")],
    [
      t("providers"),
      user.providers.length ? user.providers.join(", ") : t("noProviders"),
    ],
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <Link
        href="/admin"
        className="-ml-1 inline-flex h-9 items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {user.name ?? user.email ?? t("noName")}
      </h1>
      <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="min-w-0 truncate">{v}</dd>
          </div>
        ))}
      </dl>

      <PlanSection
        id="owned"
        title={t("owned")}
        rows={owned}
        locale={locale}
        t={t}
      />
      <PlanSection
        id="joined"
        title={t("participating")}
        rows={joined}
        locale={locale}
        t={t}
      />
    </main>
  );
}

function PlanSection({
  id,
  title,
  rows,
  locale,
  t,
}: {
  id: string;
  title: string;
  rows: DashboardPlan[];
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<"admin">>>;
}) {
  return (
    <section className="mt-10" aria-labelledby={id}>
      <h2 id={id} className="text-base font-medium">
        {title}{" "}
        <span className="num font-normal text-muted-foreground">
          {rows.length}
        </span>
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          {t("noPlans")}
        </p>
      ) : (
        <div className="mt-3 rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">{t("colTitle")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="text-right">
                  {t("colParticipants")}
                </TableHead>
                <TableHead>{t("colCreated")}</TableHead>
                <TableHead>{t("colFinal")}</TableHead>
                <TableHead className="px-4">
                  <span className="sr-only">{t("viewPublic")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const { plan } = row;
                const closed = plan.status === "closed";
                return (
                  <TableRow key={plan.id}>
                    <TableCell className="max-w-72 truncate px-4 font-medium">
                      {plan.title}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          closed
                            ? "rounded-sm bg-[#dcfae5] px-1.5 py-0.5 text-xs text-[#04250e]"
                            : "rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                        }
                      >
                        {closed ? t("closed") : t("open")}
                      </span>
                    </TableCell>
                    <TableCell className="num text-right">
                      {row.participantCount}
                    </TableCell>
                    <TableCell className="num text-muted-foreground">
                      {formatDate(
                        plan.createdAt.toISOString().slice(0, 10),
                        locale,
                        "short",
                      )}
                    </TableCell>
                    <TableCell className="text-hue first-letter:uppercase">
                      {closed && plan.finalCell
                        ? formatCell(
                            toGridPlan(row.bundle),
                            plan.finalCell,
                            locale,
                          )
                        : null}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Link
                        href={`/p/${plan.slug}`}
                        target="_blank"
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label={t("viewPublic")}
                        title={t("viewPublic")}
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
