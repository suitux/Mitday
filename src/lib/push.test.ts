import { describe, expect, it } from "vitest";
import { isSafePath, pushSubscriptionSchema, uniqueByEndpoint } from "./push";

const sub = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  keys: { p256dh: "BNcR_x-1", auth: "tBHI-tw" },
};

describe("pushSubscriptionSchema", () => {
  it("accepts a browser subscription", () => {
    expect(pushSubscriptionSchema.safeParse(sub).success).toBe(true);
  });
  it("rejects non-https endpoints", () => {
    expect(
      pushSubscriptionSchema.safeParse({
        ...sub,
        endpoint: "http://example.com/x",
      }).success,
    ).toBe(false);
  });
  it("rejects keys outside base64url", () => {
    expect(
      pushSubscriptionSchema.safeParse({
        ...sub,
        keys: { ...sub.keys, auth: "a b" },
      }).success,
    ).toBe(false);
  });
});

describe("uniqueByEndpoint", () => {
  it("keeps the first row per endpoint", () => {
    const rows = [
      { endpoint: "a", locale: "es" },
      { endpoint: "b", locale: "en" },
      { endpoint: "a", locale: "ca" },
    ];
    expect(uniqueByEndpoint(rows)).toEqual([
      { endpoint: "a", locale: "es" },
      { endpoint: "b", locale: "en" },
    ]);
  });
});

describe("isSafePath", () => {
  it.each([
    ["/es/p/abc", true],
    ["/es/p/abc/claim?k=x.y", true],
    ["//evil.com", false],
    ["/\\evil.com", false],
    ["https://evil.com", false],
    ["/a b", false],
  ])("%s → %s", (path, ok) => {
    expect(isSafePath(path)).toBe(ok);
  });
});
