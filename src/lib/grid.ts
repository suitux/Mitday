import { TZDate } from "@date-fns/tz";
import {
  buildCell,
  isIsoDate,
  parseCell,
  toHourCellInstant,
  type Granularity,
} from "./cells";

/**
 * Pure, isomorphic description of a plan's grid. Used on the server to
 * validate answers and on the client to render the calendar.
 */
export type GridPlan = {
  granularity: Granularity;
  dateMode: "range" | "dates" | "open";
  rangeStart: string | null;
  rangeEnd: string | null;
  dates: string[];
  slots: { id: string; label: string; order: number }[];
  hourInterval: number | null;
  dayStartMinute: number | null;
  dayEndMinute: number | null;
  timezone: string;
  /** ISO timestamp; anchors the `open` window so old answers stay valid. */
  createdAt: string;
};

export const OPEN_WINDOW_DAYS = 365;
export const MAX_RANGE_DAYS = 366;

// ---------------------------------------------------------------------------
// ISO date helpers (UTC arithmetic on calendar dates; no timezone involved)
// ---------------------------------------------------------------------------

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayMonday(date: string): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

/** Calendar date of `now` in `timeZone`. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const d = new TZDate(now.getTime(), timeZone);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const n = diffDays(start, end);
  for (let i = 0; i <= n; i++) out.push(addDays(start, i));
  return out;
}

// ---------------------------------------------------------------------------
// Days of a plan
// ---------------------------------------------------------------------------

/** Inclusive window of days that may hold answers. */
export function dayWindow(
  plan: GridPlan,
  now: Date = new Date(),
): { start: string; end: string } | null {
  switch (plan.dateMode) {
    case "range":
      if (!plan.rangeStart || !plan.rangeEnd) return null;
      return { start: plan.rangeStart, end: plan.rangeEnd };
    case "dates": {
      const sorted = [...plan.dates].sort();
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      return first && last ? { start: first, end: last } : null;
    }
    case "open": {
      const today = todayIn(plan.timezone, now);
      const created = todayIn(plan.timezone, new Date(plan.createdAt));
      const start = created < today ? created : today;
      return { start, end: addDays(today, OPEN_WINDOW_DAYS) };
    }
  }
}

/** Days visible to participants (open plans start today, not at creation). */
export function visibleDayWindow(plan: GridPlan, now: Date = new Date()) {
  const w = dayWindow(plan, now);
  if (!w || plan.dateMode !== "open") return w;
  return { start: todayIn(plan.timezone, now), end: w.end };
}

export function isPlanDay(
  plan: GridPlan,
  date: string,
  now: Date = new Date(),
): boolean {
  if (!isIsoDate(date)) return false;
  if (plan.dateMode === "dates") return plan.dates.includes(date);
  const w = dayWindow(plan, now);
  return !!w && date >= w.start && date <= w.end;
}

export function planDays(plan: GridPlan, now: Date = new Date()): string[] {
  if (plan.dateMode === "dates") return [...plan.dates].sort();
  const w = visibleDayWindow(plan, now);
  return w ? dateRange(w.start, w.end) : [];
}

// ---------------------------------------------------------------------------
// Cells for a day
// ---------------------------------------------------------------------------

/**
 * Start instants of the hour grid of `date` in the plan timezone.
 * Wall-clock times that do not exist (spring-forward gap) are skipped and
 * ambiguous ones (fall-back) map to their first occurrence.
 */
export function hourCellsForDate(plan: GridPlan, date: string): string[] {
  const interval = plan.hourInterval ?? 60;
  const startMin = plan.dayStartMinute ?? 9 * 60;
  const endMin = plan.dayEndMinute ?? 22 * 60;
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const out: string[] = [];
  const seen = new Set<string>();
  for (let m = startMin; m + interval <= endMin; m += interval) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    const local = new TZDate(y, mo - 1, d, hh, mm, plan.timezone);
    // Reject times that the timezone shifted (non-existent wall-clock time).
    if (
      local.getHours() !== hh ||
      local.getMinutes() !== mm ||
      local.getDate() !== d
    ) {
      continue;
    }
    const instant = toHourCellInstant(new Date(local.getTime()));
    if (!seen.has(instant)) {
      seen.add(instant);
      out.push(instant);
    }
  }
  return out;
}

export function sortedSlots(plan: Pick<GridPlan, "slots">) {
  return [...plan.slots].sort((a, b) => a.order - b.order);
}

export function cellsForDate(plan: GridPlan, date: string): string[] {
  switch (plan.granularity) {
    case "day":
      return [date];
    case "slot":
      return sortedSlots(plan).map((s) =>
        buildCell({ kind: "slot", date, slotId: s.id }),
      );
    case "hour":
      return hourCellsForDate(plan, date);
  }
}

/** Plan-local date of a cell. */
export function cellPlanDate(plan: GridPlan, cell: string): string | null {
  const parsed = parseCell(cell, plan.granularity);
  if (!parsed) return null;
  if (parsed.kind !== "hour") return parsed.date;
  return todayIn(plan.timezone, new Date(parsed.instant.replace("Z", ":00Z")));
}

export function isValidCell(
  plan: GridPlan,
  cell: string,
  now: Date = new Date(),
): boolean {
  const parsed = parseCell(cell, plan.granularity);
  if (!parsed) return false;
  const date = cellPlanDate(plan, cell);
  if (!date || !isPlanDay(plan, date, now)) return false;
  switch (parsed.kind) {
    case "day":
      return true;
    case "slot":
      return plan.slots.some((s) => s.id === parsed.slotId);
    case "hour":
      return hourCellsForDate(plan, date).includes(parsed.instant);
  }
}

/** Total order: by date, then slot order / instant. Used for tie-breaking. */
export function compareCells(
  plan: Pick<GridPlan, "granularity" | "slots">,
  a: string,
  b: string,
): number {
  if (plan.granularity === "slot") {
    const pa = parseCell(a, "slot");
    const pb = parseCell(b, "slot");
    if (pa?.kind === "slot" && pb?.kind === "slot") {
      if (pa.date !== pb.date) return pa.date < pb.date ? -1 : 1;
      const oa = plan.slots.find((s) => s.id === pa.slotId)?.order ?? 0;
      const ob = plan.slots.find((s) => s.id === pb.slotId)?.order ?? 0;
      return oa - ob;
    }
  }
  return a < b ? -1 : a > b ? 1 : 0;
}
