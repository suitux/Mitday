import { toLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { listUsers, PAGE_SIZE } from "@/server/admin";
import { currentAdmin } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false } };
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminUsersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin">) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const admin = await currentAdmin();
  if (!admin) notFound();

  const sp = await searchParams;
  const q = one(sp.q)?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const { rows, total } = await listUsers({ q, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const t = await getTranslations("admin");

  const pageHref = (p: number) => ({
    pathname: "/admin" as const,
    query: { ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="num text-sm text-muted-foreground">
          {t("total", { count: total })}
        </p>
      </div>

      <form method="get" className="mt-6 flex gap-2" role="search">
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          {t("search")}
        </Button>
        {q ? (
          <Button asChild variant="ghost">
            <Link href="/admin">{t("clear")}</Link>
          </Button>
        ) : null}
      </form>

      <section className="mt-6" aria-labelledby="users">
        <h2 id="users" className="sr-only">
          {t("users")}
        </h2>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            {q ? t("emptySearch", { q }) : t("emptyTitle")}
          </p>
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">{t("colUser")}</TableHead>
                  <TableHead>{t("colLocale")}</TableHead>
                  <TableHead className="text-right">{t("colOwned")}</TableHead>
                  <TableHead className="text-right">
                    {t("colParticipating")}
                  </TableHead>
                  <TableHead className="px-4 text-right">
                    {t("colLastPlan")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => {
                  const label = u.name ?? u.email ?? t("noName");
                  return (
                    <TableRow key={u.id} className="relative">
                      <TableCell className="px-4">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="flex items-center gap-3 outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring"
                        >
                          <Avatar className="size-7">
                            {u.image ? (
                              <AvatarImage src={u.image} alt="" />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {label.trim().charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0">
                            <span className="block max-w-64 truncate font-medium">
                              {u.name ?? t("noName")}
                            </span>
                            <span className="block max-w-64 truncate text-muted-foreground">
                              {u.email}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground uppercase">
                        {u.locale}
                      </TableCell>
                      <TableCell className="num text-right">
                        {u.ownedCount}
                      </TableCell>
                      <TableCell className="num text-right">
                        {u.participatingCount}
                      </TableCell>
                      <TableCell className="num px-4 text-right text-muted-foreground">
                        {u.lastPlanAt
                          ? formatDate(
                              u.lastPlanAt.toISOString().slice(0, 10),
                              locale,
                              "short",
                            )
                          : t("never")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {pages > 1 ? (
        <nav
          className="mt-4 flex items-center justify-between gap-4 text-sm"
          aria-label={t("users")}
        >
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>{t("prev")}</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="num text-muted-foreground">
            {t("pageOf", { page, pages })}
          </span>
          {page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>{t("next")}</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
