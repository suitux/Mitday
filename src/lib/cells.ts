import { z } from "zod";

/**
 * A "cell" is the unit a participant answers.
 *
 * - day:  `YYYY-MM-DD`
 * - slot: `YYYY-MM-DD@<slotId>`
 * - hour: `YYYY-MM-DDTHH:mmZ` — the UTC instant where the slot starts.
 *
 * Cells are stored as text, so the encoding must be canonical: the same cell
 * always produces the same string.
 */
export type Granularity = "day" | "slot" | "hour";

export type DayCell = { kind: "day"; date: string };
export type SlotCell = { kind: "slot"; date: string; slotId: string };
export type HourCell = { kind: "hour"; instant: string };
export type Cell = DayCell | SlotCell | HourCell;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HOUR_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})Z$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates a calendar date string (rejects 2025-02-30). */
export function isIsoDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}

export const isoDateSchema = z
  .string()
  .refine(isIsoDate, { message: "invalid_date" });

/** Canonical `YYYY-MM-DDTHH:mmZ` for a Date (seconds dropped). */
export function toHourCellInstant(date: Date): string {
  return `${date.toISOString().slice(0, 16)}Z`;
}

export function buildCell(cell: Cell): string {
  switch (cell.kind) {
    case "day":
      return cell.date;
    case "slot":
      return `${cell.date}@${cell.slotId.toLowerCase()}`;
    case "hour":
      return cell.instant;
  }
}

export function parseCell(
  value: string,
  granularity?: Granularity,
): Cell | null {
  if ((!granularity || granularity === "day") && isIsoDate(value)) {
    return { kind: "day", date: value };
  }
  if (!granularity || granularity === "slot") {
    const at = value.indexOf("@");
    if (at > 0) {
      const date = value.slice(0, at);
      const slotId = value.slice(at + 1);
      if (
        isIsoDate(date) &&
        UUID_RE.test(slotId) &&
        slotId === slotId.toLowerCase()
      ) {
        return { kind: "slot", date, slotId };
      }
    }
  }
  if (!granularity || granularity === "hour") {
    const m = HOUR_RE.exec(value);
    if (m && isIsoDate(value.slice(0, 10))) {
      const h = Number(m[4]);
      const min = Number(m[5]);
      if (h < 24 && min < 60) return { kind: "hour", instant: value };
    }
  }
  return null;
}

/** Calendar date a cell belongs to (in the plan's timezone for day/slot; UTC date for hour). */
export function cellDate(cell: Cell): string {
  return cell.kind === "hour" ? cell.instant.slice(0, 10) : cell.date;
}

export function cellSchema(granularity: Granularity) {
  return z
    .string()
    .max(64)
    .refine((v) => parseCell(v, granularity) !== null, {
      message: "invalid_cell",
    });
}

export function cellToDate(instant: string): Date {
  return new Date(instant.replace("Z", ":00Z"));
}
