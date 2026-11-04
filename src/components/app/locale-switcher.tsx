"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="flex items-center gap-2 text-muted-foreground">
      <label htmlFor="locale-switcher">{t("language")}</label>
      <Select
        value={locale}
        disabled={pending}
        onValueChange={(v) => {
          const next = v as Locale;
          startTransition(() => {
            // @ts-expect-error -- params match the current pathname
            router.replace({ pathname, params }, { locale: next });
          });
        }}
      >
        <SelectTrigger
          id="locale-switcher"
          className="bg-card text-foreground data-[size=default]:h-9"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {routing.locales.map((l) => (
            <SelectItem key={l} value={l}>
              {NAMES[l]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
