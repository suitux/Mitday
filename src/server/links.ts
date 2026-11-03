import { appUrl } from "@/lib/env";

export function personalLinkFor(
  locale: string,
  slug: string,
  credential: string,
) {
  return `${appUrl()}/${locale}/p/${slug}/claim?k=${encodeURIComponent(credential)}`;
}

export function shareLinkFor(locale: string, slug: string) {
  return `${appUrl()}/${locale}/p/${slug}`;
}
