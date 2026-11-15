import "server-only";
import { eq, inArray, or } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import {
  participants,
  pushSubscriptions,
  type PushSubscriptionRow,
} from "@/db/schema";
import { toLocale, type Locale } from "@/i18n/routing";
import { uniqueByEndpoint, type PushPayload } from "@/lib/push";

export function pushPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

let configured = false;

/** False when VAPID keys are missing: notices are printed to the console instead. */
function ensureConfigured(): boolean {
  const pub = pushPublicKey();
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:no-reply@example.com",
      pub,
      priv,
    );
    configured = true;
  }
  return true;
}

type Target = Pick<
  PushSubscriptionRow,
  "endpoint" | "p256dh" | "auth" | "locale"
>;

/** Sends one payload per subscription (built in its locale); prunes dead endpoints. */
export async function sendPush(
  targets: Target[],
  build: (locale: Locale) => PushPayload,
): Promise<void> {
  const list = uniqueByEndpoint(targets);
  if (list.length === 0) return;
  const live = ensureConfigured();
  const gone: string[] = [];

  await Promise.allSettled(
    list.map(async (s) => {
      const payload = build(toLocale(s.locale));
      if (!live) {
        console.info(
          `\n[push:dev] ${s.endpoint.slice(0, 60)}… "${payload.title}" — ${payload.body} (${payload.url})\n`,
        );
        return;
      }
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 * 7, urgency: "normal" },
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        // 404/410: the browser dropped the subscription.
        if (code === 404 || code === 410) gone.push(s.endpoint);
        else console.error("push send", code, err);
      }
    }),
  );

  if (gone.length > 0)
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, gone));
}

const targetCols = {
  endpoint: pushSubscriptions.endpoint,
  p256dh: pushSubscriptions.p256dh,
  auth: pushSubscriptions.auth,
  locale: pushSubscriptions.locale,
};

export function subscriptionsForUser(userId: string) {
  return db
    .select(targetCols)
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

/** Devices of every participant of a plan (guest or registered) plus the owner. */
export async function subscriptionsForPlan(planId: string, ownerId: string) {
  const people = await db
    .select({ id: participants.id, userId: participants.userId })
    .from(participants)
    .where(eq(participants.planId, planId));
  const participantIds = people.map((p) => p.id);
  const userIds = [
    ownerId,
    ...people.flatMap((p) => (p.userId ? [p.userId] : [])),
  ];
  return db
    .select(targetCols)
    .from(pushSubscriptions)
    .where(
      participantIds.length > 0
        ? or(
            inArray(pushSubscriptions.userId, userIds),
            inArray(pushSubscriptions.participantId, participantIds),
          )
        : inArray(pushSubscriptions.userId, userIds),
    );
}
