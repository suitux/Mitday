import { type NextRequest } from "next/server";
import { auth } from "@/auth";
import { appUrl } from "@/lib/env";
import { buildIcs, eventForCell } from "@/lib/ics";
import { getPlanById, toGridPlan } from "@/server/plans";

/** `.ics` of a closed plan. Requires the current slug (`?s=`) or the owner session. */
export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/plans/[id]/ics">,
) {
  const { id } = await ctx.params;
  const b = await getPlanById(id);
  if (!b) return new Response("Not found", { status: 404 });
  const slug = req.nextUrl.searchParams.get("s");
  const session = slug === b.plan.slug ? null : await auth();
  if (slug !== b.plan.slug && session?.user?.id !== b.plan.ownerId)
    return new Response("Not found", { status: 404 });
  if (b.plan.status !== "closed" || !b.plan.finalCell)
    return new Response("Not closed", { status: 409 });
  const grid = toGridPlan(b);
  const event = eventForCell(
    {
      ...grid,
      id: b.plan.id,
      title: b.plan.title,
      description: b.plan.description,
    },
    b.plan.finalCell,
    `${appUrl()}/p/${b.plan.slug}`,
  );
  if (!event) return new Response("Invalid", { status: 500 });
  const filename =
    b.plan.title
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "mitday";
  return new Response(buildIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
