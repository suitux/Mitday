"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import { isPlanDay, planDays, visibleDayWindow } from "@/lib/grid";
import { CellButton, Initials } from "./cell-button";
import { MonthGrid, monthOf, type MonthKey } from "./month-grid";
import type { ViewProps } from "./types";
import { SURFACE_TOUCH } from "./use-paint";

export function useMonthBounds(props: Pick<ViewProps, "plan" | "now">) {
  const { plan, now } = props;
  const days = planDays(plan.grid, now);
  const w = visibleDayWindow(plan.grid, now);
  const first = days[0] ?? w?.start;
  const last = days[days.length - 1] ?? w?.end;
  const preferred = plan.finalCell ? plan.finalCell.slice(0, 10) : first;
  return {
    initial: preferred
      ? monthOf(preferred)
      : monthOf(now.toISOString().slice(0, 10)),
    min: first ? monthOf(first) : undefined,
    max: last ? monthOf(last) : undefined,
    isVisibleDay: (d: string) =>
      isPlanDay(plan.grid, d, now) && (!w || d >= w.start),
  };
}

export function DayView(props: ViewProps) {
  const locale = useLocale();
  const bounds = useMonthBounds(props);
  const [month, setMonth] = useState<MonthKey>(bounds.initial);
  return (
    <div {...props.surfaceProps} className={SURFACE_TOUCH}>
      <MonthGrid
        month={month}
        onMonthChange={setMonth}
        minMonth={bounds.min}
        maxMonth={bounds.max}
        renderDay={(date) => {
          const enabled = bounds.isVisibleDay(date);
          const dayNumber = Number(date.slice(8, 10));
          if (!enabled) {
            return (
              <CellButton
                visual={{}}
                disabled
                aria-label={formatDate(date, locale)}
              >
                {dayNumber}
              </CellButton>
            );
          }
          const state = props.stateFor(date);
          const people = props.peopleFor(date);
          return (
            <CellButton
              visual={props.visualFor(date)}
              className={
                people.length > 0 ? "flex-col gap-0.5 leading-none" : undefined
              }
              aria-label={`${formatDate(date, locale)}${state ? ` — ${state}` : ""}`}
              aria-disabled={props.readOnly || undefined}
              {...props.cellProps(date)}
            >
              <span>{dayNumber}</span>
              <Initials people={people} stack />
            </CellButton>
          );
        }}
      />
    </div>
  );
}
