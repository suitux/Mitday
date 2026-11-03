"use server";

import { and, eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { participants, responses } from "@/db/schema";
import { toLocale } from "@/i18n/routing";
import { isValidCell } from "@/lib/grid";
import {
  formatGuestCredential,
  generateGuestToken,
  guestCookieName,
} from "@/lib/guest";
import { participantNameSchema } from "@/lib/plan-schema";
import { rateLimit } from "@/lib/rate-limit";
import { personalLinkFor } from "@/server/links";
import {
  notifyNewResponse,
  sendPersonalLink,
  shouldNotifyCreator,
} from "@/server/notify";
import { getCurrentParticipant, setGuestCookie } from "@/server/participant";
import { getPlanBySlug, toGridPlan } from "@/server/plans";
import { currentUser } from "@/server/session";
import { fail, type ActionResult } from "./result";

async function clientKey(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0] ??
    h.get("x-real-ip") ??
    "local"
  ).trim();
}

export async function joinPlan(
  slug: string,
  input: { name: string; email?: string },
  localeRaw: string,
): Promise<ActionResult> {
  try {
    const locale = toLocale(localeRaw);
    const b = await getPlanBySlug(slug);
    if (!b) return { ok: false, error: "not_found" };
    if (b.plan.status === "closed") return { ok: false, error: "closed" };
    const parsed = participantNameSchema.safeParse(input);
    if (!parsed.success)
      return {
        ok: false,
        error: "invalid",
        issues: parsed.error.issues.map((i) => i.message),
      };
    const limit = await rateLimit("joinPlan", await clientKey());
    if (!limit.success) return { ok: false, error: "rate_limited" };

    const current = await getCurrentParticipant(b.plan.id);
    if (current.participant) return { ok: true, data: undefined };

    const user = await currentUser();
    if (user) {
      await db
        .insert(participants)
        .values({
          planId: b.plan.id,
          userId: user.id,
          name: parsed.data.name,
          email: parsed.data.email ?? user.email,
          locale,
        })
        .onConflictDoNothing();
      return { ok: true, data: undefined };
    }

    const { token, hash } = generateGuestToken();
    const [p] = await db
      .insert(participants)
      .values({
        planId: b.plan.id,
        name: parsed.data.name,
        email: parsed.data.email,
        locale,
        editTokenHash: hash,
      })
      .returning({ id: participants.id });
    if (!p) return { ok: false, error: "server" };
    await setGuestCookie(b.plan.id, formatGuestCredential(p.id, token));
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

const answersSchema = z
  .record(z.string().max(64), z.uuid())
  .refine((r) => Object.keys(r).length <= 5000, "too_many");

/** Replaces the participant's whole answer set. */
export async function saveResponses(
  slug: string,
  answers: Record<string, string>,
  localeRaw: string,
): Promise<ActionResult<{ firstSave: boolean; personalLink: string | null }>> {
  try {
    const locale = toLocale(localeRaw);
    const b = await getPlanBySlug(slug);
    if (!b) return { ok: false, error: "not_found" };
    if (b.plan.status === "closed") return { ok: false, error: "closed" };
    const parsed = answersSchema.safeParse(answers);
    if (!parsed.success) return { ok: false, error: "invalid" };

    const current = await getCurrentParticipant(b.plan.id);
    const me = current.participant;
    if (!me) return { ok: false, error: "unauthorized" };

    const limit = await rateLimit("saveResponses", me.id);
    if (!limit.success) return { ok: false, error: "rate_limited" };

    const grid = toGridPlan(b);
    const optionIds = new Set(b.options.map((o) => o.id));
    const now = new Date();
    const rows: {
      participantId: string;
      planId: string;
      cell: string;
      optionId: string;
    }[] = [];
    for (const [cell, optionId] of Object.entries(parsed.data)) {
      if (!optionIds.has(optionId))
        return { ok: false, error: "invalid_option" };
      if (!isValidCell(grid, cell, now))
        return { ok: false, error: "invalid_cell", issues: [cell] };
      rows.push({ participantId: me.id, planId: b.plan.id, cell, optionId });
    }

    const firstSave = !me.savedAt;
    const notify = shouldNotifyCreator({
      notifyOnResponse: b.plan.notifyOnResponse,
      isFirstSave: firstSave,
      notifiedAt: me.notifiedAt,
      isOwner:
        !!current.userId &&
        current.userId === b.plan.ownerId &&
        me.userId === current.userId,
      now,
    });

    await db.transaction(async (tx) => {
      // Lock the participant row so concurrent saves serialise.
      await tx.execute(
        sql`select 1 from ${participants} where ${participants.id} = ${me.id} for update`,
      );
      await tx.delete(responses).where(eq(responses.participantId, me.id));
      if (rows.length > 0) await tx.insert(responses).values(rows);
      await tx
        .update(participants)
        .set({
          locale,
          savedAt: me.savedAt ?? now,
          ...(notify ? { notifiedAt: now } : {}),
        })
        .where(
          and(eq(participants.id, me.id), eq(participants.planId, b.plan.id)),
        );
    });

    const personalLink =
      !me.userId && current.guestCredential
        ? personalLinkFor(locale, b.plan.slug, current.guestCredential)
        : null;

    after(async () => {
      try {
        if (notify) await notifyNewResponse(b, me.name, firstSave);
        if (firstSave && personalLink && me.email) {
          await sendPersonalLink(b, me.email, locale, personalLink, me.name);
        }
      } catch (e) {
        console.error("response emails", e);
      }
    });

    return { ok: true, data: { firstSave, personalLink } };
  } catch (err) {
    return fail(err);
  }
}

/** Logged-in user adopts the guest participant stored in their cookie. */
export async function linkGuestParticipant(
  slug: string,
): Promise<ActionResult> {
  try {
    const b = await getPlanBySlug(slug);
    if (!b) return { ok: false, error: "not_found" };
    const current = await getCurrentParticipant(b.plan.id);
    if (!current.userId) return { ok: false, error: "unauthorized" };
    if (!current.linkable) return { ok: false, error: "not_found" };
    await db
      .update(participants)
      .set({ userId: current.userId, editTokenHash: null })
      .where(
        and(
          eq(participants.id, current.linkable.id),
          eq(participants.planId, b.plan.id),
        ),
      );
    (await cookies()).delete(guestCookieName(b.plan.id));
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}
