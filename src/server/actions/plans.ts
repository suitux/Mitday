"use server";

import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  answerOptions,
  participants,
  planDates,
  plans,
  planSlots,
  responses,
} from "@/db/schema";
import { isValidCell } from "@/lib/grid";
import { createPlanSchema, type CreatePlanInput } from "@/lib/plan-schema";
import { sendPlanClosed } from "@/server/notify";
import { countResponses, getOwnedPlan, toGridPlan } from "@/server/plans";
import { ActionError, requireUser } from "@/server/session";
import type { ActionResult } from "./result";
import { fail } from "./result";

function newSlug() {
  return nanoid(12);
}

function planColumns(data: z.output<typeof createPlanSchema>) {
  const w = data.when;
  return {
    title: data.details.title,
    description: data.details.description || null,
    granularity: w.granularity,
    dateMode: w.dateMode,
    rangeStart: w.dateMode === "range" ? (w.rangeStart ?? null) : null,
    rangeEnd: w.dateMode === "range" ? (w.rangeEnd ?? null) : null,
    hourInterval: w.granularity === "hour" ? w.hourInterval : null,
    dayStartMinute: w.granularity === "hour" ? w.dayStartMinute : null,
    dayEndMinute: w.granularity === "hour" ? w.dayEndMinute : null,
    timezone: w.timezone,
    visibility: data.privacy.visibility,
    notifyOnResponse: data.privacy.notifyOnResponse,
  };
}

export async function createPlan(
  input: CreatePlanInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const user = await requireUser();
    const parsed = createPlanSchema.safeParse(input);
    if (!parsed.success)
      return {
        ok: false,
        error: "invalid",
        issues: parsed.error.issues.map((i) => i.message),
      };
    const data = parsed.data;
    const slug = newSlug();
    const id = await db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(plans)
        .values({ ...planColumns(data), slug, ownerId: user.id })
        .returning({ id: plans.id });
      if (!plan) throw new ActionError("db");
      await tx.insert(answerOptions).values(
        data.answers.options.map((o, order) => ({
          planId: plan.id,
          label: o.label,
          color: o.color,
          weight: o.weight,
          order,
        })),
      );
      if (data.when.granularity === "slot") {
        await tx.insert(planSlots).values(
          data.when.slots.map((s, order) => ({
            planId: plan.id,
            label: s.label,
            order,
          })),
        );
      }
      if (data.when.dateMode === "dates") {
        await tx
          .insert(planDates)
          .values(data.when.dates.map((date) => ({ planId: plan.id, date })));
      }
      return plan.id;
    });
    revalidatePath("/[locale]/dashboard", "page");
    return { ok: true, data: { id, slug } };
  } catch (err) {
    return fail(err);
  }
}

const updateSchema = createPlanSchema.extend({
  confirmRemoveDates: z.boolean().optional(),
});

/**
 * Edits a plan. Labels, colors, visibility and notifications are always
 * editable; structure (dates, granularity, hours, weights, option/slot sets)
 * only while the plan has no answers. Adding days in `dates` mode is always
 * allowed; removing days requires `confirmRemoveDates` and drops their answers.
 */
export async function updatePlan(
  planId: string,
  input: z.input<typeof updateSchema>,
): Promise<ActionResult<{ removedDates: number }>> {
  try {
    const user = await requireUser();
    const b = await getOwnedPlan(planId, user.id);
    if (!b) return { ok: false, error: "not_found" };
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success)
      return {
        ok: false,
        error: "invalid",
        issues: parsed.error.issues.map((i) => i.message),
      };
    const data = parsed.data;
    const hasResponses = (await countResponses(planId)) > 0;
    const cols = planColumns(data);
    const p = b.plan;

    const existingOptionIds = b.options.map((o) => o.id);
    const inputOptionIds = data.answers.options.map((o) => o.id);
    const optionsSetChanged =
      inputOptionIds.length !== existingOptionIds.length ||
      inputOptionIds.some((id) => !id || !existingOptionIds.includes(id));
    const weightsChanged = data.answers.options.some(
      (o) => b.options.find((e) => e.id === o.id)?.weight !== o.weight,
    );
    const existingSlotIds = b.slots.map((s) => s.id);
    const inputSlotIds =
      data.when.granularity === "slot" ? data.when.slots.map((s) => s.id) : [];
    const slotsSetChanged =
      p.granularity === "slot" &&
      data.when.granularity === "slot" &&
      (inputSlotIds.length !== existingSlotIds.length ||
        inputSlotIds.some((id) => !id || !existingSlotIds.includes(id)));

    const structuralChanged =
      cols.granularity !== p.granularity ||
      cols.dateMode !== p.dateMode ||
      cols.rangeStart !== p.rangeStart ||
      cols.rangeEnd !== p.rangeEnd ||
      cols.hourInterval !== p.hourInterval ||
      cols.dayStartMinute !== p.dayStartMinute ||
      cols.dayEndMinute !== p.dayEndMinute ||
      cols.timezone !== p.timezone ||
      optionsSetChanged ||
      weightsChanged ||
      slotsSetChanged;

    if (hasResponses && structuralChanged)
      return { ok: false, error: "locked" };

    const removed =
      p.dateMode === "dates" && cols.dateMode === "dates"
        ? b.dates.filter((d) => !data.when.dates.includes(d))
        : [];
    const added =
      cols.dateMode === "dates"
        ? data.when.dates.filter((d) => !b.dates.includes(d))
        : [];
    if (hasResponses && removed.length > 0 && !data.confirmRemoveDates) {
      return { ok: false, error: "confirm_remove_dates", issues: removed };
    }

    await db.transaction(async (tx) => {
      if (structuralChanged) {
        // No answers yet: rebuild structure from scratch.
        await tx.update(plans).set(cols).where(eq(plans.id, planId));
        await tx.delete(answerOptions).where(eq(answerOptions.planId, planId));
        await tx.insert(answerOptions).values(
          data.answers.options.map((o, order) => ({
            planId,
            label: o.label,
            color: o.color,
            weight: o.weight,
            order,
          })),
        );
        await tx.delete(planSlots).where(eq(planSlots.planId, planId));
        if (cols.granularity === "slot") {
          await tx.insert(planSlots).values(
            data.when.slots.map((s, order) => ({
              planId,
              label: s.label,
              order,
            })),
          );
        }
        await tx.delete(planDates).where(eq(planDates.planId, planId));
        if (cols.dateMode === "dates") {
          await tx
            .insert(planDates)
            .values(data.when.dates.map((date) => ({ planId, date })));
        }
        return;
      }
      await tx
        .update(plans)
        .set({
          title: cols.title,
          description: cols.description,
          visibility: cols.visibility,
          notifyOnResponse: cols.notifyOnResponse,
        })
        .where(eq(plans.id, planId));
      for (const [order, o] of data.answers.options.entries()) {
        if (!o.id) continue;
        await tx
          .update(answerOptions)
          .set({ label: o.label, color: o.color, order })
          .where(
            and(eq(answerOptions.id, o.id), eq(answerOptions.planId, planId)),
          );
      }
      if (cols.granularity === "slot") {
        for (const s of data.when.slots) {
          if (!s.id) continue;
          await tx
            .update(planSlots)
            .set({ label: s.label })
            .where(and(eq(planSlots.id, s.id), eq(planSlots.planId, planId)));
        }
      }
      if (added.length > 0) {
        await tx
          .insert(planDates)
          .values(added.map((date) => ({ planId, date })))
          .onConflictDoNothing();
      }
      if (removed.length > 0) {
        await tx
          .delete(planDates)
          .where(
            and(eq(planDates.planId, planId), inArray(planDates.date, removed)),
          );
        // Cells of a removed day: `YYYY-MM-DD` or `YYYY-MM-DD@slot`.
        await tx
          .delete(responses)
          .where(
            and(
              eq(responses.planId, planId),
              or(
                ...removed.flatMap((d) => [
                  eq(responses.cell, d),
                  like(responses.cell, `${d}@%`),
                ]),
              ),
            ),
          );
      }
    });
    revalidatePath("/[locale]/plans/[id]/manage", "page");
    revalidatePath("/[locale]/p/[slug]", "page");
    return { ok: true, data: { removedDates: removed.length } };
  } catch (err) {
    return fail(err);
  }
}

export async function regenerateSlug(
  planId: string,
): Promise<ActionResult<{ slug: string }>> {
  try {
    const user = await requireUser();
    const b = await getOwnedPlan(planId, user.id);
    if (!b) return { ok: false, error: "not_found" };
    const slug = newSlug();
    await db.update(plans).set({ slug }).where(eq(plans.id, planId));
    revalidatePath("/[locale]/plans/[id]/manage", "page");
    return { ok: true, data: { slug } };
  } catch (err) {
    return fail(err);
  }
}

export async function deletePlan(
  planId: string,
  confirmTitle: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const b = await getOwnedPlan(planId, user.id);
    if (!b) return { ok: false, error: "not_found" };
    if (confirmTitle.trim() !== b.plan.title.trim())
      return { ok: false, error: "confirm_mismatch" };
    await db.delete(plans).where(eq(plans.id, planId));
    revalidatePath("/[locale]/dashboard", "page");
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteParticipant(
  planId: string,
  participantId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const b = await getOwnedPlan(planId, user.id);
    if (!b) return { ok: false, error: "not_found" };
    if (!z.uuid().safeParse(participantId).success)
      return { ok: false, error: "not_found" };
    const deleted = await db
      .delete(participants)
      .where(
        and(
          eq(participants.id, participantId),
          eq(participants.planId, planId),
        ),
      )
      .returning({ id: participants.id });
    if (deleted.length === 0) return { ok: false, error: "not_found" };
    revalidatePath("/[locale]/plans/[id]/manage", "page");
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function closePlan(
  planId: string,
  cell: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const b = await getOwnedPlan(planId, user.id);
    if (!b) return { ok: false, error: "not_found" };
    if (b.plan.status === "closed") return { ok: false, error: "closed" };
    const grid = toGridPlan(b);
    const known = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(responses)
      .where(and(eq(responses.planId, planId), eq(responses.cell, cell)));
    if (!isValidCell(grid, cell) && (known[0]?.n ?? 0) === 0)
      return { ok: false, error: "invalid_cell" };
    const [updated] = await db
      .update(plans)
      .set({ status: "closed", finalCell: cell, closedAt: new Date() })
      .where(and(eq(plans.id, planId), eq(plans.status, "open")))
      .returning();
    if (!updated) return { ok: false, error: "closed" };
    after(() =>
      sendPlanClosed({ ...b, plan: updated }).catch((e) =>
        console.error("close email", e),
      ),
    );
    revalidatePath("/[locale]/plans/[id]/manage", "page");
    revalidatePath("/[locale]/p/[slug]", "page");
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function reopenPlan(planId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const b = await getOwnedPlan(planId, user.id);
    if (!b) return { ok: false, error: "not_found" };
    await db
      .update(plans)
      .set({ status: "open", finalCell: null, closedAt: null })
      .where(eq(plans.id, planId));
    revalidatePath("/[locale]/plans/[id]/manage", "page");
    revalidatePath("/[locale]/p/[slug]", "page");
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}
