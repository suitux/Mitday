import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/db";
import { participants, type Participant } from "@/db/schema";
import {
  formatGuestCredential,
  guestCookieName,
  guestCookieOptions,
  parseGuestCredential,
  verifyGuestToken,
} from "@/lib/guest";

export type CurrentParticipant = {
  participant: Participant | null;
  /** Logged-in user id, if any. */
  userId: string | null;
  userName: string | null;
  /** Valid guest participant for this plan not yet linked to the logged-in user. */
  linkable: Participant | null;
  /** Raw guest credential from the cookie (to rebuild the personal link). */
  guestCredential: string | null;
};

async function guestFromCookie(
  planId: string,
): Promise<{ participant: Participant; credential: string } | null> {
  const store = await cookies();
  const raw = store.get(guestCookieName(planId))?.value;
  const cred = parseGuestCredential(raw);
  if (!cred) return null;
  const [p] = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.id, cred.participantId),
        eq(participants.planId, planId),
      ),
    )
    .limit(1);
  if (!p || !verifyGuestToken(cred.token, p.editTokenHash)) return null;
  return {
    participant: p,
    credential: formatGuestCredential(p.id, cred.token),
  };
}

export async function getCurrentParticipant(
  planId: string,
): Promise<CurrentParticipant> {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const guest = await guestFromCookie(planId);

  if (userId) {
    const [mine] = await db
      .select()
      .from(participants)
      .where(
        and(eq(participants.planId, planId), eq(participants.userId, userId)),
      )
      .limit(1);
    const linkable =
      guest && !guest.participant.userId && !mine ? guest.participant : null;
    return {
      // Not linked yet: keep acting as the guest and offer to link.
      participant: mine ?? guest?.participant ?? null,
      userId,
      userName: session?.user?.name ?? null,
      linkable,
      guestCredential: guest?.credential ?? null,
    };
  }
  return {
    participant: guest?.participant ?? null,
    userId: null,
    userName: null,
    linkable: null,
    guestCredential: guest?.credential ?? null,
  };
}

export async function setGuestCookie(planId: string, credential: string) {
  const store = await cookies();
  store.set(guestCookieName(planId), credential, guestCookieOptions);
}
