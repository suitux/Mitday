"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { CellButton } from "@/components/calendar/cell-button";
import {
  MonthGrid,
  monthOf,
  type MonthKey,
} from "@/components/calendar/month-grid";
import { Palette } from "@/components/calendar/palette";
import {
  SURFACE_TOUCH,
  usePaint,
  type Brush,
} from "@/components/calendar/use-paint";
import { aggregate } from "@/lib/aggregate";
import type { Answers } from "@/lib/client-plan";
import { formatDate } from "@/lib/format";
import { addDays, todayIn, weekdayMonday } from "@/lib/grid";
import { colorValue } from "@/lib/plan-schema";

/** Landing "live thing": paint your days over four example friends' answers. */
export function LandingDemo({
  todayIso,
  animate,
}: {
  todayIso: string;
  /** Friends' answers arrive one by one. */
  animate?: boolean;
}) {
  const t = useTranslations("landing.demo");
  const locale = useLocale();
  const options = useMemo(
    () => [
      { id: "yes", label: t("yes"), color: "green", weight: 1, order: 0 },
      { id: "maybe", label: t("maybe"), color: "amber", weight: 0.5, order: 1 },
      { id: "no", label: t("no"), color: "red", weight: 0, order: 2 },
    ],
    [t],
  );
  // Next month's Fridays and Saturdays, answered by four example friends.
  const first = useMemo(() => {
    const d = todayIn("UTC", new Date(todayIso));
    const nextMonth = new Date(
      Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)), 1),
    )
      .toISOString()
      .slice(0, 10);
    return nextMonth;
  }, [todayIso]);
  const friends = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i < 31; i++) {
      const d = addDays(first, i);
      if (d.slice(5, 7) !== first.slice(5, 7)) break;
      days.push(d);
    }
    const pattern = ["yes", "maybe", "yes", "no", "yes", "yes", "maybe", "no"];
    const out: { participantId: string; cell: string; optionId: string }[] = [];
    days.forEach((d, i) => {
      const wd = weekdayMonday(d);
      if (wd < 4) return;
      for (let f = 0; f < 4; f++) {
        const opt = pattern[(i * 3 + f * 5 + wd) % pattern.length]!;
        out.push({ participantId: `f${f}`, cell: d, optionId: opt });
      }
    });
    return out;
  }, [first]);

  const [shown, setShown] = useState(4);
  useEffect(() => {
    if (!animate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const raf = requestAnimationFrame(() => setShown(0));
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= 4) clearInterval(id);
    }, 900);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [animate]);
  const [answers, setAnswers] = useState<Answers>({});
  const [brush, setBrush] = useState<Brush>({
    kind: "option",
    optionId: "yes",
  });
  const [month, setMonth] = useState<MonthKey>(monthOf(first));
  const { cellProps, surfaceProps } = usePaint({
    answers,
    setAnswers: (u) => setAnswers(u),
    brush,
    disabled: false,
  });
  const agg = useMemo(() => {
    const mine = Object.entries(answers).map(([cell, optionId]) => ({
      participantId: "me",
      cell,
      optionId,
    }));
    const arrived = friends.filter((f) => Number(f.participantId[1]) < shown);
    return aggregate(
      options,
      [...arrived, ...mine],
      Math.max(1, shown + (Object.keys(answers).length > 0 ? 1 : 0)),
    );
  }, [answers, friends, options, shown]);
  const bestDay = agg.best[0];

  return (
    <div data-ui className="rounded-lg border border-border bg-card p-4 sm:p-6">
      <Palette
        options={options}
        brush={brush}
        onBrush={setBrush}
        allowInspect={false}
      />
      <div {...surfaceProps} className={`mt-4 ${SURFACE_TOUCH}`}>
        <MonthGrid
          month={month}
          onMonthChange={setMonth}
          minMonth={monthOf(first)}
          maxMonth={monthOf(first)}
          renderDay={(date) => {
            const mine = answers[date];
            const a = agg.cells[date];
            const o = options.find((x) => x.id === mine);
            return (
              <CellButton
                visual={{
                  mineColor: o ? colorValue(o.color) : undefined,
                  heat: a
                    ? { color: colorValue("green"), intensity: a.intensity }
                    : undefined,
                  best: agg.best.includes(date),
                }}
                aria-label={`${formatDate(date, locale)}${o ? ` — ${o.label}` : ""}`}
                {...cellProps(date)}
              >
                {Number(date.slice(8, 10))}
              </CellButton>
            );
          }}
        />
      </div>
      <p className="mt-4 text-sm" aria-live="polite">
        {bestDay ? (
          <>
            <span
              className="mr-2 inline-block size-2 rounded-full bg-hue align-middle"
              aria-hidden="true"
            />
            {t("best", { date: formatDate(bestDay, locale) })}
          </>
        ) : null}
      </p>
      <p className="mt-1 text-[0.8125rem] text-muted-foreground">
        {t("sample")}
      </p>
    </div>
  );
}
