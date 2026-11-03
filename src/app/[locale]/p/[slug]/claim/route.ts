import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { toLocale } from "@/i18n/routing";
import {
  formatGuestCredential,
  guestCookieName,
  guestCookieOptions,
  parseGuestCredential,
  verifyGuestToken,
} from "@/lib/guest";
import { getPlanBySlug } from "@/server/plans";

/** Personal edit link: validates `k`, sets the guest cookie, redirects without the query. */
export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/[locale]/p/[slug]/claim">,
) {
  const { locale: rawLocale, slug } = await ctx.params;
  const locale = toLocale(rawLocale);
  const target = new URL(
    `/${locale}/p/${encodeURIComponent(slug)}`,
    req.nextUrl,
  );
  const b = await getPlanBySlug(slug);
  if (!b) return NextResponse.redirect(target);

  const cred = parseGuestCredential(req.nextUrl.searchParams.get("k"));
  if (cred) {
    const [p] = await db
      .select({ id: participants.id, hash: participants.editTokenHash })
      .from(participants)
      .where(
        and(
          eq(participants.id, cred.participantId),
          eq(participants.planId, b.plan.id),
        ),
      )
      .limit(1);
    if (p && verifyGuestToken(cred.token, p.hash)) {
      const res = NextResponse.redirect(target);
      res.cookies.set(
        guestCookieName(b.plan.id),
        formatGuestCredential(p.id, cred.token),
        guestCookieOptions,
      );
      res.headers.set("Cache-Control", "no-store");
      res.headers.set("Referrer-Policy", "no-referrer");
      return res;
    }
  }
  target.searchParams.set("claim", "invalid");
  return NextResponse.redirect(target);
}
