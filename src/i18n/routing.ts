import { defineRouting } from "next-intl/routing";

export const locales = ["es", "ca", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "es",
  localePrefix: "always",
});

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : routing.defaultLocale;
}
