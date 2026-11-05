"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { buildCell } from "@/lib/cells";
import { formatDate } from "@/lib/format";
import { sortedSlots } from "@/lib/grid";
import { cn } from "@/lib/utils";
import { CellButton, heatStyle, Initials } from "./cell-button";
import { useMonthBounds } from "./day-view";
import { MonthGrid, monthOf, type MonthKey } from "./month-grid";
import type { ViewProps } from "./types";
import { SURFACE_TOUCH } from "./use-paint";

export function SlotView(props: ViewProps) {
  const locale = useLocale();
  const t = useTranslations("participate");
  const bounds = useMonthBounds(props);
  const [month, setMonth] = useState<MonthKey>(bounds.initial);
  const [openDay, setOpenDay] = useState<string | null>(
    props.plan.finalCell?.slice(0, 10) ?? null,
  );
  const slots = sortedSlots(props.plan.grid);
  const panel = useRef<HTMLDivElement>(null);
  const openSlots = (date: string | null) => {
    setOpenDay(date);
    // Phones stack the slots under the month: bring them into view.
    if (date && window.matchMedia("(max-width: 767px)").matches)
      requestAnimationFrame(() =>
        panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      );
  };

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
      <MonthGrid
        month={month}
        onMonthChange={(m) => {
          setMonth(m);
          if (openDay && monthOf(openDay).month !== m.month) setOpenDay(null);
        }}
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
          const cells = slots.map((s) =>
            buildCell({ kind: "slot", date, slotId: s.id }),
          );
          const visuals = cells.map((c) => props.visualFor(c));
          const answered = cells.filter((c) => props.stateFor(c)).length;
          return (
            <CellButton
              visual={{
                best: visuals.some((v) => v.best),
                final: visuals.some((v) => v.final),
              }}
              className={cn(
                "flex-col gap-1",
                openDay === date && "border-foreground",
              )}
              aria-expanded={openDay === date}
              aria-label={`${formatDate(date, locale)} — ${t("slotsAnswered", { count: answered, total: slots.length })}`}
              onClick={() => openSlots(openDay === date ? null : date)}
            >
              <span>{dayNumber}</span>
              <span
                className="flex w-full justify-center gap-0.5 px-1.5"
                aria-hidden="true"
              >
                {visuals.map((v, i) => (
                  <span
                    key={i}
                    className="h-1 max-w-3 flex-1 rounded-full bg-muted"
                    style={
                      v.mineColor
                        ? { backgroundColor: v.mineColor }
                        : heatStyle(v.heat)
                    }
                  />
                ))}
              </span>
            </CellButton>
          );
        }}
      />
      <div ref={panel} className="min-h-40 scroll-mb-24">
        {openDay ? (
          <div>
            <h3 className="mb-3 text-base font-medium first-letter:uppercase">
              {formatDate(openDay, locale)}
            </h3>
            <div
              {...props.surfaceProps}
              className={cn("grid gap-2", SURFACE_TOUCH)}
            >
              {slots.map((s) => {
                const cell = buildCell({
                  kind: "slot",
                  date: openDay,
                  slotId: s.id,
                });
                const state = props.stateFor(cell);
                return (
                  <div key={s.id} className="h-12">
                    <CellButton
                      visual={props.visualFor(cell)}
                      className="justify-between gap-3 px-4"
                      aria-label={`${s.label}${state ? ` — ${state}` : ""}`}
                      aria-disabled={props.readOnly || undefined}
                      {...props.cellProps(cell)}
                    >
                      <span className="truncate">{s.label}</span>
                      <span className="flex shrink-0 items-center gap-2 text-xs font-normal">
                        <span className="opacity-80">{state}</span>
                        <Initials people={props.peopleFor(cell)} />
                      </span>
                    </CellButton>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("pickDay")}</p>
        )}
      </div>
    </div>
  );
}
