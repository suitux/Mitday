import { z } from "zod";

/** Shape of `PushSubscription.toJSON()` as sent by the browser. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2048),
  keys: z.object({
    p256dh: z
      .string()
      .min(1)
      .max(256)
      .regex(/^[A-Za-z0-9_-]+=*$/),
    auth: z
      .string()
      .min(1)
      .max(256)
      .regex(/^[A-Za-z0-9_-]+=*$/),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

/** What the service worker receives and shows. */
export type PushPayload = {
  title: string;
  body: string;
  /** Same-origin path opened on click. */
  url: string;
  /** Notifications with the same tag replace each other. */
  tag?: string;
};

/** Keeps one row per endpoint (a device subscribed in several ways gets one notice). */
export function uniqueByEndpoint<T extends { endpoint: string }>(
  rows: T[],
): T[] {
  const seen = new Map<string, T>();
  for (const r of rows) if (!seen.has(r.endpoint)) seen.set(r.endpoint, r);
  return [...seen.values()];
}

/** Only same-origin absolute paths (no protocol-relative `//host`). */
export function isSafePath(path: string): boolean {
  return /^\/(?![/\\])/.test(path) && !/[\s]/.test(path);
}
