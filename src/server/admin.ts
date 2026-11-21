import "server-only";
import { asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";

export const PAGE_SIZE = 50;

export type AdminUserRow = Awaited<
  ReturnType<typeof listUsers>
>["rows"][number];

function escapeLike(q: string) {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function listUsers({ q, page }: { q?: string; page: number }) {
  const term = q?.trim();
  const where = term
    ? or(
        ilike(users.email, `%${escapeLike(term)}%`),
        ilike(users.name, `%${escapeLike(term)}%`),
      )
    : undefined;

  // Raw, fully qualified column names: inside select fields Drizzle drops the
  // table prefix, so `"id"` would resolve to the subquery's table.
  const userId = sql.raw(`"users"."id"`);
  const ownedCount = sql<number>`(select count(*)::int from "plans" where "plans"."owner_id" = ${userId})`;
  const participatingCount = sql<number>`(select count(*)::int from "participants" where "participants"."user_id" = ${userId})`;
  const lastPlanAt = sql<
    string | null
  >`(select max("plans"."created_at") from "plans" where "plans"."owner_id" = ${userId})`;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        locale: users.locale,
        emailVerified: users.emailVerified,
        ownedCount,
        participatingCount,
        lastPlanAt,
      })
      .from(users)
      .where(where)
      .orderBy(sql`${lastPlanAt} desc nulls last`, asc(users.email))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      lastPlanAt: r.lastPlanAt ? new Date(r.lastPlanAt) : null,
    })),
    total: totalRow?.n ?? 0,
  };
}

export async function getAdminUser(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) return null;
  const providers = await db
    .selectDistinct({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, id));
  return { ...user, providers: providers.map((p) => p.provider) };
}
