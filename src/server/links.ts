import { appUrl } from "@/lib/env";

export function personalLinkPath(
  locale: string,
  slug: string,
  credential: string,
) {
  return `/${locale}/p/${slug}/claim?k=${encodeURIComponent(credential)}`;
}

export function personalLinkFor(
  locale: string,
  slug: string,
  credential: string,
) {
  return `${appUrl()}${personalLinkPath(locale, slug, credential)}`;
}

/** Manifest URL whose installed app opens at `start` (a same-origin path). */
export function manifestHref(locale: string, start?: string) {
  const q = new URLSearchParams({ lang: locale });
  if (start) q.set("start", start);
  return `/api/manifest?${q}`;
}

export function shareLinkFor(locale: string, slug: string) {
  return `${appUrl()}/${locale}/p/${slug}`;
}
