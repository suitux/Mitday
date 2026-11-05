import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { participants, users } from "@/db/schema";
import SimpleEmail from "@/emails/simple";
import { translatorFor } from "@/i18n/messages";
import { toLocale } from "@/i18n/routing";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { formatCell } from "@/lib/format";
import { buildIcs, eventForCell } from "@/lib/ics";
import { toGridPlan, type PlanBundle } from "./plans";

export const NOTIFY_WINDOW_MS = 60 * 60 * 1000;

/** First save always notifies; edits only if the last notice is older than 60 min. */
export function shouldNotifyCreator(input: {
  notifyOnResponse: boolean;
  isFirstSave: boolean;
  notifiedAt: Date | null;
  isOwner: boolean;
  now?: Date;
}): boolean {
  if (!input.notifyOnResponse || input.isOwner) return false;
  if (input.isFirstSave || !input.notifiedAt) return true;
  return (
    (input.now ?? new Date()).getTime() - input.notifiedAt.getTime() >
    NOTIFY_WINDOW_MS
  );
}

export function planUrl(locale: string, slug: string) {
  return `${appUrl()}/${locale}/p/${slug}`;
}

async function owner(ownerId: string) {
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);
  return u ?? null;
}

export async function notifyNewResponse(
  b: PlanBundle,
  participantName: string,
  isFirstSave: boolean,
) {
  const o = await owner(b.plan.ownerId);
  if (!o?.email) return;
  const locale = toLocale(o.locale);
  const t = translatorFor(locale, "emails.newResponse");
  const vars = { name: participantName, title: b.plan.title };
  await sendEmail({
    to: o.email,
    subject: t(isFirstSave ? "subject" : "subjectEdit", vars),
    react: SimpleEmail({
      lang: locale,
      preview: t("subject", vars),
      paragraphs: [t(isFirstSave ? "body" : "bodyEdit", vars)],
      button: {
        label: t("button"),
        href: `${appUrl()}/${locale}/plans/${b.plan.id}/manage`,
      },
      footer: t("footer"),
    }),
  });
}

export async function sendPersonalLink(
  b: PlanBundle,
  to: string,
  localeRaw: string,
  link: string,
  name: string,
) {
  const locale = toLocale(localeRaw);
  const t = translatorFor(locale, "emails.personalLink");
  const vars = { name, title: b.plan.title };
  await sendEmail({
    to,
    subject: t("subject", vars),
    react: SimpleEmail({
      lang: locale,
      preview: t("subject", vars),
      paragraphs: [t("body", vars)],
      button: { label: t("button"), href: link },
      footer: t("footer"),
    }),
  });
}

export async function sendPlanClosed(b: PlanBundle) {
  if (!b.plan.finalCell) return;
  const grid = toGridPlan(b);
  const recipients = await db
    .select({ email: participants.email, locale: participants.locale })
    .from(participants)
    .where(
      and(eq(participants.planId, b.plan.id), isNotNull(participants.email)),
    );
  const o = await owner(b.plan.ownerId);
  const list = new Map<string, string>();
  for (const r of recipients)
    if (r.email) list.set(r.email.toLowerCase(), r.locale);
  if (o?.email) list.set(o.email.toLowerCase(), o.locale);

  await Promise.allSettled(
    [...list].map(async ([to, localeRaw]) => {
      const locale = toLocale(localeRaw);
      const t = translatorFor(locale, "emails.closed");
      const url = planUrl(locale, b.plan.slug);
      const event = eventForCell(
        {
          ...grid,
          id: b.plan.id,
          title: b.plan.title,
          description: b.plan.description,
        },
        b.plan.finalCell!,
        url,
      );
      const when = formatCell(grid, b.plan.finalCell!, locale);
      await sendEmail({
        to,
        subject: t("subject", { title: b.plan.title }),
        react: SimpleEmail({
          lang: locale,
          preview: t("subject", { title: b.plan.title }),
          paragraphs: [t("body", { title: b.plan.title })],
          highlight:
            grid.granularity === "hour"
              ? `${when} (${grid.timezone.replace(/_/g, " ")})`
              : when,
          button: { label: t("button"), href: url },
          footer: t("footer"),
        }),
        attachments: event
          ? [
              {
                filename: "mitday.ics",
                content: buildIcs(event),
                contentType: "text/calendar; charset=utf-8",
              },
            ]
          : undefined,
      });
    }),
  );
}
