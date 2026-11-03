import { parseCell } from "./cells";
import type { GridPlan } from "./grid";

function dateFromIso(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

export function formatDate(
  date: string,
  locale: string,
  style: "long" | "short" = "long",
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: style === "long" ? "long" : "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
    ...(style === "long" ? { year: "numeric" } : {}),
  }).format(dateFromIso(date));
}

export function formatTime(instant: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instant.replace("Z", ":00Z")));
}

export function formatMonth(year: number, month: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month, 1, 12)));
}

/** Short weekday names, Monday first. */
export function weekdayNames(
  locale: string,
  style: "narrow" | "short" = "short",
) {
  const fmt = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: style,
  });
  // 2024-01-01 is a Monday.
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(Date.UTC(2024, 0, 1 + i, 12))),
  );
}

export function timeZoneLabel(
  timeZone: string,
  locale: string,
  at = new Date(),
) {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(at);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  return `${timeZone.replace(/_/g, " ")} (${name})`;
}

/** Human label of a cell, e.g. "sábado, 14 de noviembre de 2026 · Cena" or "… · 20:30". */
export function formatCell(
  grid: Pick<GridPlan, "granularity" | "slots" | "timezone">,
  cell: string,
  locale: string,
  timeZone: string = grid.timezone,
): string {
  const parsed = parseCell(cell, grid.granularity);
  if (!parsed) return cell;
  if (parsed.kind === "day") return formatDate(parsed.date, locale);
  if (parsed.kind === "slot") {
    const slot = grid.slots.find((s) => s.id === parsed.slotId);
    return `${formatDate(parsed.date, locale)} · ${slot?.label ?? "?"}`;
  }
  const d = new Date(parsed.instant.replace("Z", ":00Z"));
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function minutesToHHMM(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Compact label for table headers: "jue 10 dic", "jue 10 dic · Cena", "jue 10 dic 20:30". */
export function formatCellShort(
  grid: Pick<GridPlan, "granularity" | "slots" | "timezone">,
  cell: string,
  locale: string,
  timeZone: string = grid.timezone,
): string {
  const parsed = parseCell(cell, grid.granularity);
  if (!parsed) return cell;
  const day = (d: Date, tz: string) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(d);
  if (parsed.kind === "day") return day(dateFromIso(parsed.date), "UTC");
  if (parsed.kind === "slot") {
    const slot = grid.slots.find((s) => s.id === parsed.slotId);
    return `${day(dateFromIso(parsed.date), "UTC")} · ${slot?.label ?? "?"}`;
  }
  const d = new Date(parsed.instant.replace("Z", ":00Z"));
  return `${day(d, timeZone)} ${formatTime(parsed.instant, locale, timeZone)}`;
}
