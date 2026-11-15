/**
 * Where can this device get Web Push, and if not, what should we tell the user?
 * Pure (no `window`) so it can be unit-tested with real user agents.
 */

export type IOSBrowser = "safari" | "chrome" | "firefox" | "edge" | "other";

export type PushEnv =
  | { kind: "supported" }
  | { kind: "unsupported" }
  /** iOS < 16.4: no Web Push even from the Home Screen. */
  | { kind: "ios-old" }
  /** Inside another app's web view (Instagram, Facebook…): no Add to Home Screen. */
  | { kind: "ios-inapp" }
  /** A real iOS browser: install to the Home Screen first. */
  | { kind: "ios-install"; browser: IOSBrowser };

export type PushEnvInput = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone: boolean;
  hasPush: boolean;
};

export function isIOSDevice(ua: string, platform = "", touch = 0): boolean {
  // iPadOS reports itself as a Mac with touch.
  return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && touch > 1);
}

/**
 * iOS version as [major, minor]. Uses the higher of `OS x_y` and
 * `Version/x.y`: iOS 26 Safari freezes `OS 18_6` but reports `Version/26.0`,
 * and iPadOS only exposes `Version/`.
 */
export function iosVersion(ua: string): [number, number] | null {
  const candidates: [number, number][] = [];
  const os = /\bOS (\d+)[_.](\d+)/.exec(ua);
  if (os) candidates.push([Number(os[1]), Number(os[2])]);
  const ver = /\bVersion\/(\d+)\.(\d+)/.exec(ua);
  if (ver) candidates.push([Number(ver[1]), Number(ver[2])]);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) =>
    b[0] > a[0] || (b[0] === a[0] && b[1] > a[1]) ? b : a,
  );
}

const IN_APP =
  /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|LinkedInApp|Snapchat|musical_ly|BytedanceWebview|TikTok|Pinterest|GSA\/|Twitter|WhatsApp|MicroMessenger/i;

/**
 * In-app web views. Known apps by marker; anything else on iOS without the
 * `Safari/` token is a bare WKWebView (real Safari, Chrome, Firefox and Edge
 * on iOS all carry it).
 */
export function isIOSInApp(ua: string): boolean {
  return IN_APP.test(ua) || !/\bSafari\//.test(ua);
}

export function iosBrowser(ua: string): IOSBrowser {
  if (/CriOS\//.test(ua)) return "chrome";
  if (/FxiOS\//.test(ua)) return "firefox";
  if (/EdgiOS\//.test(ua)) return "edge";
  if (/\bSafari\//.test(ua) && /\bVersion\//.test(ua)) return "safari";
  return "other";
}

export function detectPushEnv(input: PushEnvInput): PushEnv {
  if (input.hasPush) return { kind: "supported" };
  const ua = input.userAgent;
  if (!isIOSDevice(ua, input.platform, input.maxTouchPoints))
    return { kind: "unsupported" };
  const v = iosVersion(ua);
  if (v && (v[0] < 16 || (v[0] === 16 && v[1] < 4))) return { kind: "ios-old" };
  // Installed but still no PushManager: nothing more we can suggest.
  if (input.standalone) return { kind: "unsupported" };
  if (isIOSInApp(ua)) return { kind: "ios-inapp" };
  return { kind: "ios-install", browser: iosBrowser(ua) };
}
