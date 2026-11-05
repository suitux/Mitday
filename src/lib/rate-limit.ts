import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

type Bucket =
  | "magicLink"
  | "magicLinkIp"
  | "joinPlan"
  | "saveResponses"
  | "planStatus"
  | "closeEmail";

const limits: Record<
  Bucket,
  { tokens: number; window: `${number} ${"s" | "m" | "h"}` }
> = {
  magicLink: { tokens: 5, window: "15 m" },
  joinPlan: { tokens: 10, window: "10 m" },
  saveResponses: { tokens: 60, window: "10 m" },
  /** close/reopen per owner. */
  planStatus: { tokens: 10, window: "1 h" },
  /** "plan closed" email blasts per plan; over the limit the plan still closes, silently. */
  closeEmail: { tokens: 3, window: "24 h" },
  magicLinkIp: { tokens: 10, window: "15 m" },
};

/** Client IP (Vercel sets `x-forwarded-for` itself; it is not client-controlled there). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0] ??
    h.get("x-real-ip") ??
    "local"
  ).trim();
}

const g = globalThis as unknown as {
  __mitdayLimiters?: Map<Bucket, Ratelimit>;
};

function limiter(bucket: Bucket): Ratelimit | null {
  // Marketplace integration may expose either naming.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  g.__mitdayLimiters ??= new Map();
  let rl = g.__mitdayLimiters.get(bucket);
  if (!rl) {
    const { tokens, window } = limits[bucket];
    rl = new Ratelimit({
      // Few retries: on an outage we'd rather let the request through fast.
      redis: new Redis({ url, token, retry: { retries: 1 } }),
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `mitday:rl:${bucket}`,
      analytics: false,
      // If Redis is slow/unreachable, allow the request after this many ms.
      timeout: 1000,
    });
    g.__mitdayLimiters.set(bucket, rl);
  }
  return rl;
}

/**
 * Fails open: when Upstash is not configured, errors out or times out, the
 * request is allowed. Only an actual limit hit returns `success: false`.
 */
export async function rateLimit(
  bucket: Bucket,
  key: string,
): Promise<{ success: boolean }> {
  try {
    const rl = limiter(bucket);
    if (!rl) return { success: true };
    const { success } = await rl.limit(key);
    return { success };
  } catch (err) {
    // Fail open: a Redis outage must not take the app down.
    console.error("rate limit error", err);
    return { success: true };
  }
}
