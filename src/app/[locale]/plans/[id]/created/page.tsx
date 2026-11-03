import { toLocale } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SharePanel } from "@/components/plan-form/share-panel";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { shareLinkFor } from "@/server/links";
import { getOwnedPlan } from "@/server/plans";
import { currentUser } from "@/server/session";

export default async function CreatedPage({
  params,
}: PageProps<"/[locale]/plans/[id]/created">) {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const user = await currentUser();
  const b = user ? await getOwnedPlan(id, user.id) : null;
  if (!b) notFound();
  const t = await getTranslations("created");
  const url = shareLinkFor(locale, b.plan.slug);
  return (
    <main className="mx-auto w-full max-w-lg px-4 pt-10 pb-16 sm:pt-16">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("body", { title: b.plan.title })}
      </p>
      <div className="mt-8">
        <SharePanel url={url} title={b.plan.title} />
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link href={`/p/${b.plan.slug}`}>{t("answer")}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/plans/${b.plan.id}/manage`}>{t("manage")}</Link>
        </Button>
      </div>
    </main>
  );
}
