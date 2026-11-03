import { toLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Settings2 } from "lucide-react";
import { Board } from "@/components/participate/board";
import { ClosedBanner } from "@/components/participate/closed-banner";
import { JoinForm, LinkOffer } from "@/components/participate/join-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Answers, ClientPlan } from "@/lib/client-plan";
import { googleCalendarUrl, eventForCell } from "@/lib/ics";
import { buildOthersView } from "@/lib/plan-view";
import { personalLinkFor, shareLinkFor } from "@/server/links";
import { getCurrentParticipant } from "@/server/participant";
import {
  getParticipantsAndResponses,
  getPlanBySlug,
  toGridPlan,
} from "@/server/plans";
import { currentUser } from "@/server/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const b = await getPlanBySlug(slug);
  if (!b) return {};
  const t = await getTranslations("participate");
  return {
    title: b.plan.title,
    description: b.plan.description ?? t("metaDescription"),
    robots: { index: false, follow: false },
    openGraph: {
      title: b.plan.title,
      description: b.plan.description ?? t("metaDescription"),
    },
  };
}

export default async function ParticipatePage({
  params,
  searchParams,
}: PageProps<"/[locale]/p/[slug]">) {
  const { locale: rawLocale, slug } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const b = await getPlanBySlug(slug);
  if (!b) notFound();
  const claimInvalid = (await searchParams).claim === "invalid";
  const t = await getTranslations("participate");
  const [current, data, user] = await Promise.all([
    getCurrentParticipant(b.plan.id),
    getParticipantsAndResponses(b.plan.id),
    currentUser(),
  ]);
  const grid = toGridPlan(b);
  const isOwner = !!user && user.id === b.plan.ownerId;
  const me = current.participant;

  const plan: ClientPlan = {
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
  };
  const others = buildOthersView({
    visibility: b.plan.visibility,
    isOwner,
    grid,
    options: plan.options,
    participants: data.participants.map((p) => ({ id: p.id, name: p.name })),
    responses: data.responses,
  });
  const myAnswers: Answers = {};
  if (me)
    for (const r of data.responses)
      if (r.participantId === me.id) myAnswers[r.cell] = r.optionId;

  const personalLink =
    me && !me.userId && current.guestCredential
      ? personalLinkFor(locale, slug, current.guestCredential)
      : null;
  const closed = b.plan.status === "closed";
  const event =
    closed && b.plan.finalCell
      ? eventForCell(
          {
            ...grid,
            id: b.plan.id,
            title: b.plan.title,
            description: b.plan.description,
          },
          b.plan.finalCell,
          shareLinkFor(locale, slug),
        )
      : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-10 sm:px-6 sm:pt-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {b.plan.title}
          </h1>
          {b.plan.description ? (
            <p className="mt-2 max-w-prose whitespace-pre-line text-muted-foreground">
              {b.plan.description}
            </p>
          ) : null}
          {me ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("answeringAs", { name: me.name })}
            </p>
          ) : null}
        </div>
        {isOwner ? (
          <Button asChild variant="secondary" size="sm" className="shrink-0">
            <Link href={`/plans/${b.plan.id}/manage`}>
              <Settings2 /> {t("manage")}
            </Link>
          </Button>
        ) : null}
      </div>

      {closed ? (
        <ClosedBanner
          plan={plan}
          googleUrl={event ? googleCalendarUrl(event) : null}
          icsUrl={`/api/plans/${b.plan.id}/ics?s=${encodeURIComponent(slug)}`}
        />
      ) : null}

      {claimInvalid ? (
        <p
          role="alert"
          className="mb-5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {t("claimInvalid")}
        </p>
      ) : null}

      {current.linkable && current.userId ? (
        <LinkOffer slug={slug} name={current.linkable.name} />
      ) : null}

      {!me && !closed ? (
        <JoinForm slug={slug} defaultName={user?.name ?? undefined} />
      ) : (
        <Board
          plan={plan}
          me={
            me
              ? {
                  id: me.id,
                  name: me.name,
                  answers: myAnswers,
                  hasSaved: !!me.savedAt,
                }
              : null
          }
          others={others}
          personalLink={personalLink}
          nowIso={new Date().toISOString()}
        />
      )}
    </main>
  );
}
