"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { toLocale } from "@/i18n/routing";
import { pushSubscriptionSchema } from "@/lib/push";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getCurrentParticipant } from "@/server/participant";
import { getPlanBySlug } from "@/server/plans";
import { currentUser } from "@/server/session";
import { pushPublicKey } from "@/server/push";
import { fail, type ActionResult } from "./result";

/**
 * Links this device's push subscription to whoever is here: the signed-in
 * user and, on a plan page, the guest participant of that plan. Idempotent.
 */
export async function subscribePush(
  subscription: unknown,
  localeRaw: string,
  slug?: string,
): Promise<ActionResult<{ linked: number }>> {
  try {
    if (!pushPublicKey()) return { ok: false, error: "unavailable" };
    const parsed = pushSubscriptionSchema.safeParse(subscription);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const limit = await rateLimit("pushSubscribe", await clientIp());
    if (!limit.success) return { ok: false, error: "rate_limited" };

    const locale = toLocale(localeRaw);
    const { endpoint, keys } = parsed.data;
    const base = { endpoint, p256dh: keys.p256dh, auth: keys.auth, locale };
    const user = await currentUser();
    const rows: (typeof pushSubscriptions.$inferInsert)[] = [];
    if (user) rows.push({ ...base, userId: user.id });

    if (slug) {
      const b = await getPlanBySlug(slug);
      if (b) {
        const me = (await getCurrentParticipant(b.plan.id)).participant;
        // Registered participants are reached through their user row.
        if (me && !me.userId) rows.push({ ...base, participantId: me.id });
      }
    }
    if (rows.length === 0) return { ok: false, error: "unauthorized" };

    for (const row of rows) {
      await db
        .insert(pushSubscriptions)
        .values(row)
        .onConflictDoUpdate({
          target: row.userId
            ? [pushSubscriptions.endpoint, pushSubscriptions.userId]
            : [pushSubscriptions.endpoint, pushSubscriptions.participantId],
          targetWhere: row.userId
            ? sql`${pushSubscriptions.userId} is not null`
            : sql`${pushSubscriptions.participantId} is not null`,
          set: { p256dh: base.p256dh, auth: base.auth, locale },
        });
    }
    return { ok: true, data: { linked: rows.length } };
  } catch (err) {
    return fail(err);
  }
}

/** Forgets this device everywhere (the endpoint itself is the capability). */
export async function unsubscribePush(
  endpoint: unknown,
): Promise<ActionResult> {
  try {
    const parsed = pushSubscriptionSchema.shape.endpoint.safeParse(endpoint);
    if (!parsed.success) return { ok: false, error: "invalid" };
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, parsed.data));
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}
