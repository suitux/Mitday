"use client";

import { TZDate } from "@date-fns/tz";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cellToDate } from "@/lib/cells";
import { formatDate, timeZoneLabel } from "@/lib/format";
import {
  addDays,
  hourCellsForDate,
  isPlanDay,
  visibleDayWindow,
  weekdayMonday,
} from "@/lib/grid";
import { cn } from "@/lib/utils";
import { CellButton } from "./cell-button";
import { gridKeyNav } from "./month-grid";
import type { ViewProps } from "./types";

const noop = () => () => {};

/** Visitor's timezone; the plan's on the server render. */
export function useViewerTimeZone(fallback: string) {
  return useSyncExternalStore(
    noop,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || fallback,
    () => fallback,
  );
}

type LocalCell = { cell: string; date: string; minutes: number; label: string };

function localParts(instant: string, tz: string, locale: string): LocalCell {
  const d = new TZDate(cellToDate(instant).getTime(), tz);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return {
    cell: instant,
    date,
    minutes: d.getHours() * 60 + d.getMinutes(),
    label,
  };
}

/** Cells of a local week (Mon..Sun in the viewer's timezone). */
function weekCells(
  props: ViewProps,
  weekStart: string,
  tz: string,
  locale: string,
) {
  const { grid } = props.plan;
  const w = visibleDayWindow(grid, props.now);
  const out: LocalCell[] = [];
  // Plan days that can overlap the local week (timezones shift by at most a day).
  for (let i = -1; i <= 7; i++) {
    const planDate = addDays(weekStart, i);
    if (!isPlanDay(grid, planDate, props.now) || (w && planDate < w.start))
      continue;
    for (const cell of hourCellsForDate(grid, planDate)) {
      const lc = localParts(cell, tz, locale);
      if (lc.date >= weekStart && lc.date <= addDays(weekStart, 6))
        out.push(lc);
    }
  }
  return out.sort((a, b) => (a.cell < b.cell ? -1 : 1));
}

function mondayOf(date: string) {
  return addDays(date, -weekdayMonday(date));
}

export function HourView(props: ViewProps) {
  const locale = useLocale();
  const t = useTranslations("participate");
  const { grid } = props.plan;
  const tz = useViewerTimeZone(grid.timezone);
  const w = visibleDayWindow(grid, props.now);
  const firstDay =
    props.plan.finalCell?.slice(0, 10) ??
    (grid.dateMode === "dates" ? [...grid.dates].sort()[0] : w?.start) ??
    props.now.toISOString().slice(0, 10);
  const minWeek = w
    ? mondayOf(
        grid.dateMode === "dates"
          ? ([...grid.dates].sort()[0] ?? w.start)
          : w.start,
      )
    : undefined;
  const maxWeek = w ? mondayOf(w.end) : undefined;
  const [week, setWeek] = useState(() => mondayOf(firstDay));
  const cells = useMemo(
    () => weekCells(props, week, tz, locale),
    [props, week, tz, locale],
  );
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));

  // Rows: the union of local start times of the week.
  const rows = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of cells) if (!map.has(c.minutes)) map.set(c.minutes, c.label);
    return [...map].sort((a, b) => a[0] - b[0]);
  }, [cells]);
  const lookup = useMemo(() => {
    const m = new Map<string, LocalCell>();
    for (const c of cells) {
      const k = `${c.date}|${c.minutes}`;
      if (!m.has(k)) m.set(k, c);
    }
    return m;
  }, [cells]);
  const daysWithCells = days.filter((d) => cells.some((c) => c.date === d));
  const [openDay, setOpenDay] = useState<string | null>(null);
  const shownOpen =
    openDay && daysWithCells.includes(openDay)
      ? openDay
      : (daysWithCells[0] ?? null);

  const tzDiffers = tz !== grid.timezone;
  const weekLabel = `${formatDate(days[0]!, locale, "short")} – ${formatDate(days[6]!, locale, "short")}`;

  const cellButton = (c: LocalCell, className?: string, showState = false) => {
    const state = props.stateFor(c.cell);
    return (
      <CellButton
        visual={props.visualFor(c.cell)}
        className={cn("text-xs", className)}
        aria-label={`${formatDate(c.date, locale)} ${c.label}${state ? ` — ${state}` : ""}`}
        aria-disabled={props.readOnly || undefined}
        {...props.cellProps(c.cell)}
      >
        {showState ? <span className="truncate">{state}</span> : null}
      </CellButton>
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-medium" aria-live="polite">
            {weekLabel}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("timesIn", { zone: timeZoneLabel(tz, locale) })}
            {tzDiffers
              ? ` · ${t("planZone", { zone: timeZoneLabel(grid.timezone, locale) })}`
              : ""}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("prevWeek")}
            disabled={!!minWeek && week <= minWeek}
            onClick={() => setWeek(addDays(week, -7))}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("nextWeek")}
            disabled={!!maxWeek && week >= maxWeek}
            onClick={() => setWeek(addDays(week, 7))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {cells.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t("emptyWeek")}
        </p>
      ) : (
        <>
          {/* Desktop: weekly grid, days in columns, hours in rows. */}
          <div className="hidden md:block">
            <div
              {...props.surfaceProps}
              className="grid touch-none gap-1"
              style={{
                gridTemplateColumns: "3.5rem repeat(7, minmax(0, 1fr))",
              }}
              onKeyDown={(e) => gridKeyNav(e, 7)}
            >
              <div />
              {days.map((d) => (
                <div
                  key={d}
                  className="pb-1 text-center text-xs text-muted-foreground first-letter:uppercase"
                >
                  {formatDate(d, locale, "short")}
                </div>
              ))}
              {rows.map(([minutes, label]) => (
                <div key={minutes} className="contents">
                  <div className="num flex h-8 items-center justify-end pr-2 text-xs text-muted-foreground">
                    {label}
                  </div>
                  {days.map((d) => {
                    const c = lookup.get(`${d}|${minutes}`);
                    return (
                      <div key={d} className="h-8">
                        {c ? (
                          cellButton(c)
                        ) : (
                          <button
                            type="button"
                            data-nav=""
                            disabled
                            className="size-full"
                            aria-hidden="true"
                            tabIndex={-1}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Phone: list of days; the open one shows its column of hours. */}
          <ul className="grid gap-2 md:hidden">
            {daysWithCells.map((d) => {
              const open = shownOpen === d;
              const dayCells = cells.filter((c) => c.date === d);
              const answered = dayCells.filter((c) =>
                props.stateFor(c.cell),
              ).length;
              return (
                <li key={d} className="rounded-md border border-border bg-card">
                  <button
                    type="button"
                    className="flex h-12 w-full items-center justify-between px-4 text-left text-sm"
                    aria-expanded={open}
                    onClick={() => setOpenDay(open ? "" : d)}
                  >
                    <span className="font-medium first-letter:uppercase">
                      {formatDate(d, locale)}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {t("hoursAnswered", {
                        count: answered,
                        total: dayCells.length,
                      })}
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform",
                          open && "rotate-180",
                        )}
                      />
                    </span>
                  </button>
                  {open ? (
                    <div
                      {...props.surfaceProps}
                      className="grid grid-cols-[1fr] gap-1 px-3 pb-3"
                      onKeyDown={(e) => gridKeyNav(e, 1)}
                    >
                      {dayCells.map((c) => (
                        <div
                          key={c.cell}
                          className="flex h-11 items-stretch gap-2"
                        >
                          {/* The time label stays scrollable: start a vertical scroll here. */}
                          <span className="num flex w-12 shrink-0 items-center text-xs text-muted-foreground">
                            {c.label}
                          </span>
                          <div className="flex-1 touch-none">
                            {cellButton(c, "justify-start px-3", true)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
