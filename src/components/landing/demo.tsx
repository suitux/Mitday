"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  BestMark,
  CellButton,
  Initials,
  type CellPerson,
} from "@/components/calendar/cell-button";
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
import { cn } from "@/lib/utils";
import { addDays, todayIn, weekdayMonday } from "@/lib/grid";
import { colorValue } from "@/lib/plan-schema";

/** Example friends; their initials show on the cells they answered. */
const FRIENDS = ["Ana", "Marc", "Laura", "Pol", "Sara"];

/** Landing "live thing": paint your days over five example friends' answers. */
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
  // Next month, four of its weekend days answered by five example friends.
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
    // Only four days get answers; `null` = that friend left it blank.
    // The third Saturday is the clear winner: everyone can.
    const nth = (wd: number, n: number) =>
      days.filter((d) => weekdayMonday(d) === wd)[n];
    const plan: [string | undefined, (string | null)[]][] = [
      [nth(5, 0), ["yes", "maybe", "no", null, "yes"]],
      [nth(4, 1), ["no", "yes", "maybe", "yes", null]],
      [nth(5, 2), ["yes", "yes", "yes", "yes", "yes"]],
      [nth(6, 3), ["maybe", null, "yes", "no", "maybe"]],
    ];
    const out: { participantId: string; cell: string; optionId: string }[] = [];
    for (const [d, votes] of plan) {
      if (!d) continue;
      votes.forEach((opt, f) => {
        if (opt) out.push({ participantId: `f${f}`, cell: d, optionId: opt });
      });
    }
    return out;
  }, [first]);

  const [shown, setShown] = useState(FRIENDS.length);
  useEffect(() => {
    if (!animate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const raf = requestAnimationFrame(() => setShown(0));
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= FRIENDS.length) clearInterval(id);
    }, 450);
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
    const arrived = friends.filter((f) => Number(f.participantId.slice(1)) < shown);
    return aggregate(
      options,
      [...arrived, ...mine],
      Math.max(1, shown + (Object.keys(answers).length > 0 ? 1 : 0)),
    );
  }, [answers, friends, options, shown]);
  const bestDay = agg.best[0];
  // Arrived friends per day, "yes" first, like the real board.
  const people = useMemo(() => {
    const byCell: Record<string, CellPerson[]> = {};
    for (const o of options) {
      for (const f of friends) {
        if (f.optionId !== o.id) continue;
        const idx = Number(f.participantId.slice(1));
        if (idx >= shown) continue;
        (byCell[f.cell] ??= []).push({
          name: FRIENDS[idx]!,
          color: colorValue(o.color),
        });
      }
    }
    return byCell;
  }, [friends, options, shown]);

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
            const who = people[date] ?? [];
            const isBest = agg.best.includes(date);
            return (
              <CellButton
                className={cn(
                  who.length > 0 && "flex-col gap-0.5 leading-none",
                  // The winner stands out: thick ring lifted off the grid.
                  isBest &&
                    "z-10 ring-2 ring-hue ring-offset-2 ring-offset-card shadow-md",
                )}
                visual={{
                  mineColor: o ? colorValue(o.color) : undefined,
                  heat: a
                    ? { color: colorValue("green"), intensity: a.intensity }
                    : undefined,
                  best: isBest,
                }}
                aria-label={`${formatDate(date, locale)}${o ? ` — ${o.label}` : ""}`}
                {...cellProps(date)}
              >
                <span>{Number(date.slice(8, 10))}</span>
                <Initials people={who} stack />
              </CellButton>
            );
          }}
        />
      </div>
      <p className="mt-4 text-sm font-medium" aria-live="polite">
        {bestDay ? (
          <>
            <BestMark className="mr-2 align-middle" />
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
