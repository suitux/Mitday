"use client";

import { Bell, BellOff, Check, Copy, Share } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { detectPushEnv, type IOSBrowser } from "@/lib/push-env";
import { subscribePush, unsubscribePush } from "@/server/actions/push";

type Status =
  | { kind: "loading" | "unsupported" | "denied" | "ask" | "subscribed" }
  | { kind: "ios-inapp" }
  | { kind: "ios-install"; browser: IOSBrowser };

const STEP1 = {
  safari: "iosStep1Safari",
  chrome: "iosStep1Chrome",
  firefox: "iosStep1Firefox",
  edge: "iosStep1Edge",
  other: "iosStep1Other",
} as const;

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function pushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

function readDismissed(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Private mode: dismissing just won't stick.
  }
}

/**
 * Offers Web Push on this device. `guest` = participant on a plan page (told
 * when the date is set); `owner` = signed-in creator (told about answers).
 * On iOS outside the home-screen app it explains how to install it first, or,
 * inside another app's web view, how to get to a real browser. `openUrl` is
 * the link to carry there (a guest's personal link keeps their identity).
 */
export function PushPrompt({
  mode,
  slug,
  openUrl,
  className,
}: {
  mode: "guest" | "owner";
  slug?: string;
  openUrl?: string | null;
  className?: string;
}) {
  const t = useTranslations("push.prompt");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [status, setStatusState] = useState<Status>({ kind: "loading" });
  const setStatus = (kind: "denied" | "ask" | "subscribed") =>
    setStatusState({ kind });
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();
  const dismissKey = `mitday:push-dismissed:${mode}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const set = (s: Status) => !cancelled && setStatusState(s);
      setDismissed(readDismissed(dismissKey));
      if (!VAPID_KEY) return set({ kind: "unsupported" });
      const env = detectPushEnv({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
        standalone: isStandalone(),
        hasPush: pushSupported(),
      });
      if (env.kind === "ios-install" || env.kind === "ios-inapp")
        return set(env);
      // ios-old: no Web Push even if installed, so say nothing.
      if (env.kind !== "supported") return set({ kind: "unsupported" });
      if (Notification.permission === "denied") return set({ kind: "denied" });
      try {
        const reg = await registration();
        const sub = await reg.pushManager.getSubscription();
        if (sub && Notification.permission === "granted") {
          set({ kind: "subscribed" });
          // Same device, new context (e.g. a plan joined as a guest): link it too.
          void subscribePush(sub.toJSON(), locale, slug).catch(() => {});
        } else set({ kind: "ask" });
      } catch {
        set({ kind: "unsupported" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dismissKey, locale, slug]);

  const enable = () =>
    startTransition(async () => {
      try {
        // Must run inside the tap: iOS rejects permission prompts otherwise.
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "ask");
          return;
        }
        const reg = await registration();
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_KEY!),
          }));
        const res = await subscribePush(sub.toJSON(), locale, slug);
        if (!res.ok) {
          toast.error(te(res.error as "server"));
          return;
        }
        setStatus("subscribed");
        toast.success(t("enabledToast"));
      } catch (e) {
        console.error(e);
        toast.error(t("error"));
      }
    });

  const disable = () =>
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await unsubscribePush(sub.endpoint);
          await sub.unsubscribe();
        }
        setStatus("ask");
        toast.success(t("disabledToast"));
      } catch {
        toast.error(te("server"));
      }
    });

  const dismiss = () => {
    writeDismissed(dismissKey);
    setDismissed(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(openUrl ?? window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some in-app browsers block the clipboard: show the link instead.
      window.prompt(tc("link"), openUrl ?? window.location.href);
    }
  };

  if (status.kind === "loading" || status.kind === "unsupported") return null;

  if (status.kind === "subscribed") {
    return (
      <p
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground ${className ?? ""}`}
      >
        <Bell className="size-4 shrink-0" aria-hidden="true" />
        {t("enabled")}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-sm text-muted-foreground underline"
          onClick={disable}
          disabled={pending}
        >
          {t("disable")}
        </Button>
      </p>
    );
  }

  if (status.kind === "denied") {
    return dismissed ? null : (
      <p
        className={`flex items-start gap-2 text-sm text-muted-foreground ${className ?? ""}`}
      >
        <BellOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t("denied")}
      </p>
    );
  }

  // Dismissed: keep a quiet way back in.
  if (dismissed && status.kind === "ask") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`-ml-2 text-muted-foreground ${className ?? ""}`}
        onClick={enable}
        disabled={pending}
      >
        <Bell aria-hidden="true" />
        {pending ? t("enabling") : t("enable")}
      </Button>
    );
  }
  if (dismissed) return null;

  if (status.kind === "ios-inapp") {
    return (
      <section
        className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}
        aria-labelledby="push-inapp-title"
      >
        <h2
          id="push-inapp-title"
          className="flex items-center gap-2 text-base font-medium"
        >
          <Bell className="size-4" aria-hidden="true" />
          {t("inappTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("inappBody")}{" "}
          {mode === "guest" && openUrl ? t("inappGuest") : t("inappOwner")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={copyLink}>
            {copied ? <Check /> : <Copy />}
            {copied ? tc("copied") : t("copyLink")}
          </Button>
          <Button type="button" variant="ghost" onClick={dismiss}>
            {t("dismiss")}
          </Button>
        </div>
      </section>
    );
  }

  if (status.kind === "ios-install") {
    return (
      <section
        className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}
        aria-labelledby="push-ios-title"
      >
        <h2
          id="push-ios-title"
          className="flex items-center gap-2 text-base font-medium"
        >
          <Bell className="size-4" aria-hidden="true" />
          {t("iosTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "guest" ? t("guestBody") : t("ownerBody")} {t("iosBody")}
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
          <li>
            {t(STEP1[status.browser])}{" "}
            <Share
              className="inline size-4 align-text-bottom"
              aria-hidden="true"
            />
          </li>
          <li>{t("iosStep2")}</li>
          <li>{t("iosStep3")}</li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("iosNote")}{" "}
          {mode === "guest" ? t("iosGuestNote") : t("iosOwnerNote")}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 -ml-2"
          onClick={dismiss}
        >
          {t("dismiss")}
        </Button>
      </section>
    );
  }

  return (
    <section
      className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}
      aria-labelledby="push-ask-title"
    >
      <h2
        id="push-ask-title"
        className="flex items-center gap-2 text-base font-medium"
      >
        <Bell className="size-4" aria-hidden="true" />
        {mode === "guest" ? t("guestTitle") : t("ownerTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "guest" ? t("guestBody") : t("ownerBody")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={enable} disabled={pending}>
          {pending ? t("enabling") : t("enable")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={dismiss}
          disabled={pending}
        >
          {t("dismiss")}
        </Button>
      </div>
    </section>
  );
}
