import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { pushSubscriptionSchema } from "@/lib/push";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  oldEndpoint: pushSubscriptionSchema.shape.endpoint.nullable(),
  subscription: pushSubscriptionSchema,
});

/**
 * Called by the service worker on `pushsubscriptionchange`: moves the rows of
 * the old endpoint (the old endpoint acts as the credential) to the new one.
 */
export async function POST(req: NextRequest) {
  if (!(await rateLimit("pushSubscribe", await clientIp())).success)
    return new NextResponse(null, { status: 429 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.oldEndpoint)
    return new NextResponse(null, { status: 400 });
  const { oldEndpoint, subscription } = parsed.data;
  await db
    .update(pushSubscriptions)
    .set({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .where(eq(pushSubscriptions.endpoint, oldEndpoint))
    .catch((e) => console.error("push resubscribe", e));
  return new NextResponse(null, { status: 204 });
}
