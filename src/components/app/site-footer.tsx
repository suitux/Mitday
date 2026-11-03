import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";

export function SiteFooter() {
  const t = useTranslations("footer");
  return (
    <footer className="mx-auto mt-16 flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm sm:px-6">
      <p className="text-muted-foreground">{t("tagline")}</p>
      <LocaleSwitcher />
    </footer>
  );
}
