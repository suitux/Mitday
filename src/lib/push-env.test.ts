import { describe, expect, it } from "vitest";
import { detectPushEnv, iosVersion } from "./push-env";

const UA = {
  safari18:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  safari26:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  safari16_3:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1",
  chromeIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
  firefoxIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15",
  edgeIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/126.0.2592.56 Mobile/15E148 Safari/605.1.15",
  instagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.3.23.54 (iPhone14,5; iOS 17_5; es_ES; es; scale=3.00; 1170x2532; 618023787)",
  facebook:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.43.109;FBBV/607049453;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/es_ES;FBOP/5]",
  bareWebView:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  googleApp:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/322.0.648915268 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
};

const env = (
  userAgent: string,
  extra: Partial<Parameters<typeof detectPushEnv>[0]> = {},
) => detectPushEnv({ userAgent, standalone: false, hasPush: false, ...extra });

describe("iosVersion", () => {
  it("takes Version/ over the frozen OS token", () => {
    expect(iosVersion(UA.safari26)).toEqual([26, 0]);
  });
  it("reads OS when there is no Version/", () => {
    expect(iosVersion(UA.chromeIOS)).toEqual([17, 5]);
  });
});

describe("detectPushEnv", () => {
  it("anything with PushManager is supported", () => {
    expect(env(UA.android, { hasPush: true })).toEqual({ kind: "supported" });
    expect(env(UA.safari18, { hasPush: true, standalone: true })).toEqual({
      kind: "supported",
    });
  });
  it("non-iOS without push is unsupported", () => {
    expect(env(UA.android)).toEqual({ kind: "unsupported" });
  });
  it.each([
    ["safari18", "safari"],
    ["safari26", "safari"],
    ["chromeIOS", "chrome"],
    ["firefoxIOS", "firefox"],
    ["edgeIOS", "edge"],
  ] as const)("%s → install steps for %s", (key, browser) => {
    expect(env(UA[key])).toEqual({ kind: "ios-install", browser });
  });
  it("iPadOS (Mac UA + touch) gets install steps", () => {
    expect(env(UA.ipad, { platform: "MacIntel", maxTouchPoints: 5 })).toEqual({
      kind: "ios-install",
      browser: "safari",
    });
  });
  it("a real Mac stays unsupported", () => {
    expect(env(UA.ipad, { platform: "MacIntel", maxTouchPoints: 0 })).toEqual({
      kind: "unsupported",
    });
  });
  it.each(["instagram", "facebook", "bareWebView", "googleApp"] as const)(
    "%s → open in Safari",
    (key) => {
      expect(env(UA[key])).toEqual({ kind: "ios-inapp" });
    },
  );
  it("iOS before 16.4 gets nothing to install", () => {
    expect(env(UA.safari16_3)).toEqual({ kind: "ios-old" });
  });
  it("installed without PushManager: nothing to suggest", () => {
    expect(env(UA.safari18, { standalone: true })).toEqual({
      kind: "unsupported",
    });
  });
});
