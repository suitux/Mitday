import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  answerOptions,
  participants,
  planDates,
  plans,
  planSlots,
  responses,
  type AnswerOption,
  type Plan,
  type PlanSlot,
} from "@/db/schema";
import type { GridPlan } from "@/lib/grid";

export type PlanBundle = {
  plan: Plan;
  options: AnswerOption[];
  slots: PlanSlot[];
  dates: string[];
};

async function bundle(plan: Plan | undefined): Promise<PlanBundle | null> {
  if (!plan) return null;
  const [options, slots, dates] = await Promise.all([
    db
      .select()
      .from(answerOptions)
      .where(eq(answerOptions.planId, plan.id))
      .orderBy(asc(answerOptions.order)),
    db
      .select()
      .from(planSlots)
      .where(eq(planSlots.planId, plan.id))
      .orderBy(asc(planSlots.order)),
    db
      .select({ date: planDates.date })
      .from(planDates)
      .where(eq(planDates.planId, plan.id))
      .orderBy(asc(planDates.date)),
  ]);
  return { plan, options, slots, dates: dates.map((d) => d.date) };
}

export async function getPlanBySlug(slug: string): Promise<PlanBundle | null> {
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(slug)) return null;
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, slug))
    .limit(1);
  return bundle(plan);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPlanById(id: string): Promise<PlanBundle | null> {
  if (!UUID_RE.test(id)) return null;
  const [plan] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
  return bundle(plan);
}

/** Owner-scoped lookup: anyone else gets `null` (→ 404). */
export async function getOwnedPlan(
  id: string,
  userId: string,
): Promise<PlanBundle | null> {
  if (!UUID_RE.test(id)) return null;
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, id), eq(plans.ownerId, userId)))
    .limit(1);
  return bundle(plan);
}

export function toGridPlan(b: PlanBundle): GridPlan {
  return {
    granularity: b.plan.granularity,
    dateMode: b.plan.dateMode,
    rangeStart: b.plan.rangeStart,
    rangeEnd: b.plan.rangeEnd,
    dates: b.dates,
    slots: b.slots.map((s) => ({ id: s.id, label: s.label, order: s.order })),
    hourInterval: b.plan.hourInterval,
    dayStartMinute: b.plan.dayStartMinute,
    dayEndMinute: b.plan.dayEndMinute,
    timezone: b.plan.timezone,
    createdAt: b.plan.createdAt.toISOString(),
  };
}

export async function getParticipantsAndResponses(planId: string) {
  const [ps, rs] = await Promise.all([
    db
      .select({
        id: participants.id,
        name: participants.name,
        email: participants.email,
        userId: participants.userId,
        createdAt: participants.createdAt,
      })
      .from(participants)
      .where(eq(participants.planId, planId))
      .orderBy(asc(participants.createdAt)),
    db
      .select({
        participantId: responses.participantId,
        cell: responses.cell,
        optionId: responses.optionId,
      })
      .from(responses)
      .where(eq(responses.planId, planId)),
  ]);
  return { participants: ps, responses: rs };
}

export async function countResponses(planId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(responses)
    .where(eq(responses.planId, planId));
  return row?.n ?? 0;
}

export type DashboardPlan = {
  plan: Plan;
  participantCount: number;
  bundle: PlanBundle;
  responses: { participantId: string; cell: string; optionId: string }[];
};

async function dashboardRows(rows: Plan[]): Promise<DashboardPlan[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((p) => p.id);
  const [opts, slots, dates, counts, resps] = await Promise.all([
    db.select().from(answerOptions).where(inArray(answerOptions.planId, ids)),
    db.select().from(planSlots).where(inArray(planSlots.planId, ids)),
    db.select().from(planDates).where(inArray(planDates.planId, ids)),
    db
      .select({ planId: participants.planId, n: sql<number>`count(*)::int` })
      .from(participants)
      .where(inArray(participants.planId, ids))
      .groupBy(participants.planId),
    db
      .select({
        planId: responses.planId,
        participantId: responses.participantId,
        cell: responses.cell,
        optionId: responses.optionId,
      })
      .from(responses)
      .where(inArray(responses.planId, ids)),
  ]);
  return rows.map((plan) => ({
    plan,
    participantCount: counts.find((c) => c.planId === plan.id)?.n ?? 0,
    bundle: {
      plan,
      options: opts
        .filter((o) => o.planId === plan.id)
        .sort((a, b) => a.order - b.order),
      slots: slots
        .filter((s) => s.planId === plan.id)
        .sort((a, b) => a.order - b.order),
      dates: dates.filter((d) => d.planId === plan.id).map((d) => d.date),
    },
    responses: resps.filter((r) => r.planId === plan.id),
  }));
}

export async function getOwnedPlans(userId: string) {
  const rows = await db
    .select()
    .from(plans)
    .where(eq(plans.ownerId, userId))
    .orderBy(sql`${plans.createdAt} desc`);
  return dashboardRows(rows);
}

export async function getParticipatingPlans(userId: string) {
  const rows = await db
    .select({ plan: plans })
    .from(participants)
    .innerJoin(plans, eq(plans.id, participants.planId))
    .where(
      and(eq(participants.userId, userId), sql`${plans.ownerId} <> ${userId}`),
    )
    .orderBy(sql`${plans.updatedAt} desc`);
  return dashboardRows(rows.map((r) => r.plan));
}
