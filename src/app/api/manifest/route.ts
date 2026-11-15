import type { MetadataRoute } from "next";
import type { NextRequest } from "next/server";
import { toLocale } from "@/i18n/routing";
import { translatorFor } from "@/i18n/messages";
import { isSafePath } from "@/lib/push";
import { BRAND_GROUND } from "@/lib/pwa-icon";

/**
 * Web app manifest. `start` lets a page choose where the installed app opens:
 * iOS home-screen apps do not share cookies with Safari, so a guest's plan
 * page points it at their personal link to keep their identity.
 */
export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const locale = toLocale(params.get("lang"));
  const startRaw = params.get("start");
  const start =
    startRaw && isSafePath(startRaw) && startRaw.length <= 512
      ? startRaw
      : `/${locale}`;
  const t = translatorFor(locale, "meta");
  const manifest: MetadataRoute.Manifest = {
    // Same id everywhere: one app, whatever page it was installed from.
    id: "/",
    name: "Mitday",
    short_name: "Mitday",
    description: t("description"),
    lang: locale,
    start_url: start,
    scope: "/",
    display: "standalone",
    background_color: BRAND_GROUND,
    theme_color: BRAND_GROUND,
    icons: [
      { src: "/api/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/api/pwa-icon/512", sizes: "512x512", type: "image/png" },
      {
        src: "/api/pwa-icon/maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      // Personal links may be inside `start`.
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
