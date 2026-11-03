"use client";

import { CalendarPlus, Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useViewerTimeZone } from "@/components/calendar/hour-view";
import { Button } from "@/components/ui/button";
import type { ClientPlan } from "@/lib/client-plan";
import { formatCell, timeZoneLabel } from "@/lib/format";

export function ClosedBanner({
  plan,
  googleUrl,
  icsUrl,
}: {
  plan: ClientPlan;
  googleUrl: string | null;
  icsUrl: string;
}) {
  const t = useTranslations("participate.closed");
  const locale = useLocale();
  const tz = useViewerTimeZone(plan.grid.timezone);
  if (!plan.finalCell) return null;
  return (
    <section
      className="mb-6 rounded-lg bg-foreground p-5 text-background"
      aria-labelledby="final-title"
    >
      <p className="text-sm opacity-80">{t("label")}</p>
      <h2
        id="final-title"
        className="mt-1 text-xl font-semibold tracking-tight first-letter:uppercase sm:text-2xl"
      >
        {formatCell(plan.grid, plan.finalCell, locale, tz)}
      </h2>
      {plan.grid.granularity === "hour" ? (
        <p className="mt-1 text-sm opacity-80">{timeZoneLabel(tz, locale)}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {googleUrl ? (
          <Button asChild variant="secondary">
            <a href={googleUrl} target="_blank" rel="noopener noreferrer">
              <CalendarPlus /> {t("google")}
            </a>
          </Button>
        ) : null}
        <Button asChild variant="secondary">
          <a href={icsUrl} download>
            <Download /> {t("ics")}
          </a>
        </Button>
      </div>
    </section>
  );
}
