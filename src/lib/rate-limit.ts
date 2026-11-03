import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = "magicLink" | "joinPlan" | "saveResponses";

const limits: Record<
  Bucket,
  { tokens: number; window: `${number} ${"s" | "m" | "h"}` }
> = {
  magicLink: { tokens: 5, window: "15 m" },
  joinPlan: { tokens: 10, window: "10 m" },
  saveResponses: { tokens: 60, window: "10 m" },
};

const g = globalThis as unknown as {
  __quadraLimiters?: Map<Bucket, Ratelimit>;
};

function limiter(bucket: Bucket): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  g.__quadraLimiters ??= new Map();
  let rl = g.__quadraLimiters.get(bucket);
  if (!rl) {
    const { tokens, window } = limits[bucket];
    rl = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `quadra:rl:${bucket}`,
      analytics: false,
    });
    g.__quadraLimiters.set(bucket, rl);
  }
  return rl;
}

/** No-op (always allowed) when Upstash is not configured. */
export async function rateLimit(
  bucket: Bucket,
  key: string,
): Promise<{ success: boolean }> {
  const rl = limiter(bucket);
  if (!rl) return { success: true };
  try {
    const { success } = await rl.limit(key);
    return { success };
  } catch (err) {
    // Fail open: a Redis outage must not take the app down.
    console.error("rate limit error", err);
    return { success: true };
  }
}
