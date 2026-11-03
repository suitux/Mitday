"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { KeyboardEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatMonth, weekdayNames } from "@/lib/format";
import { addDays, weekdayMonday } from "@/lib/grid";
import { cn } from "@/lib/utils";

export type MonthKey = { year: number; month: number }; // month 0-11

export function monthOf(date: string): MonthKey {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)) - 1,
  };
}

export function shiftMonth(m: MonthKey, delta: number): MonthKey {
  const d = new Date(Date.UTC(m.year, m.month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

export function monthIndex(m: MonthKey) {
  return m.year * 12 + m.month;
}

function monthDays(m: MonthKey): (string | null)[] {
  const first = `${m.year}-${String(m.month + 1).padStart(2, "0")}-01`;
  const lead = weekdayMonday(first);
  const days: (string | null)[] = Array.from({ length: lead }, () => null);
  let d = first;
  while (Number(d.slice(5, 7)) - 1 === m.month) {
    days.push(d);
    d = addDays(d, 1);
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

/** Arrow-key navigation between `[data-nav]` buttons laid out on a 7-column grid. */
export function gridKeyNav(e: KeyboardEvent<HTMLElement>, columns = 7) {
  const keys: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -columns,
    ArrowDown: columns,
  };
  const delta = keys[e.key];
  if (delta === undefined) return;
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>("[data-nav]"),
  );
  const index = items.indexOf(document.activeElement as HTMLElement);
  if (index < 0) return;
  // Walk over disabled positions in the direction of travel.
  let i = index + delta;
  while (i >= 0 && i < items.length) {
    const el = items[i];
    if (el && !el.hasAttribute("disabled")) {
      e.preventDefault();
      el.focus();
      return;
    }
    i += delta > 0 ? 1 : -1;
  }
}

export function MonthGrid({
  month,
  onMonthChange,
  minMonth,
  maxMonth,
  renderDay,
  className,
}: {
  month: MonthKey;
  onMonthChange: (m: MonthKey) => void;
  minMonth?: MonthKey;
  maxMonth?: MonthKey;
  renderDay: (date: string) => ReactNode;
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("calendar");
  const days = monthDays(month);
  const canPrev = !minMonth || monthIndex(month) > monthIndex(minMonth);
  const canNext = !maxMonth || monthIndex(month) < monthIndex(maxMonth);
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3
          className="text-base font-medium first-letter:uppercase"
          aria-live="polite"
        >
          {formatMonth(month.year, month.month, locale)}
        </h3>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("prevMonth")}
            disabled={!canPrev}
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("nextMonth")}
            disabled={!canNext}
            onClick={() => onMonthChange(shiftMonth(month, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div
        className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground"
        aria-hidden="true"
      >
        {weekdayNames(locale).map((d) => (
          <div key={d} className="py-1 capitalize">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" onKeyDown={(e) => gridKeyNav(e)}>
        {days.map((d, i) => (
          <div key={d ?? `blank-${i}`} className="aspect-square min-h-11">
            {d ? renderDay(d) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
