"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const NAMES: Record<Locale, string> = {
  es: "Español",
  ca: "Català",
  en: "English",
};

export function LocaleSwitcher() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 text-muted-foreground">
      <span>{t("language")}</span>
      <select
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Locale;
          startTransition(() => {
            // @ts-expect-error -- params match the current pathname
            router.replace({ pathname, params }, { locale: next });
          });
        }}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
