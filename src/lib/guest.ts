import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Guest identity: `<participantId>.<token>`; only sha256(token) is stored. */

export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function guestCookieName(planId: string): string {
  return `quadra_p_${planId}`;
}

export function generateGuestToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashGuestToken(token) };
}

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of a presented token against a stored hash. */
export function verifyGuestToken(
  token: string,
  storedHash: string | null | undefined,
): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashGuestToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export function formatGuestCredential(
  participantId: string,
  token: string,
): string {
  return `${participantId}.${token}`;
}

export function parseGuestCredential(
  value: string | null | undefined,
): { participantId: string; token: string } | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  const participantId = value.slice(0, dot);
  const token = value.slice(dot + 1);
  if (!UUID_RE.test(participantId) || !TOKEN_RE.test(token)) return null;
  return { participantId: participantId.toLowerCase(), token };
}

export const guestCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: GUEST_COOKIE_MAX_AGE,
  path: "/",
};
