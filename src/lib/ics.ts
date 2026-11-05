import { parseCell } from "./cells";
import { addDays, type GridPlan } from "./grid";

export type CalendarEvent = {
  uid: string;
  title: string;
  description?: string;
  url?: string;
  allDay: boolean;
  /** all-day: YYYY-MM-DD; timed: Date */
  start: string | Date;
  /** all-day: exclusive YYYY-MM-DD; timed: Date */
  end: string | Date;
};

/** Event for the final cell of a plan, depending on its granularity. */
export function eventForCell(
  plan: Pick<GridPlan, "granularity" | "slots" | "hourInterval"> & {
    id: string;
    title: string;
    description?: string | null;
  },
  cell: string,
  url?: string,
): CalendarEvent | null {
  const parsed = parseCell(cell, plan.granularity);
  if (!parsed) return null;
  const base = {
    uid: `${plan.id}@mitday`,
    description: plan.description ?? undefined,
    url,
  };
  if (parsed.kind === "day") {
    return {
      ...base,
      title: plan.title,
      allDay: true,
      start: parsed.date,
      end: addDays(parsed.date, 1),
    };
  }
  if (parsed.kind === "slot") {
    const slot = plan.slots.find((s) => s.id === parsed.slotId);
    return {
      ...base,
      title: slot ? `${slot.label} — ${plan.title}` : plan.title,
      allDay: true,
      start: parsed.date,
      end: addDays(parsed.date, 1),
    };
  }
  const start = new Date(parsed.instant.replace("Z", ":00Z"));
  const end = new Date(start.getTime() + (plan.hourInterval ?? 60) * 60_000);
  return { ...base, title: plan.title, allDay: false, start, end };
}

function icsDate(date: string) {
  return date.replace(/-/g, "");
}

function icsDateTime(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** RFC 5545 text escaping. */
function esc(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mitday//Mitday//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${icsDateTime(now)}`,
    event.allDay
      ? `DTSTART;VALUE=DATE:${icsDate(event.start as string)}`
      : `DTSTART:${icsDateTime(event.start as Date)}`,
    event.allDay
      ? `DTEND;VALUE=DATE:${icsDate(event.end as string)}`
      : `DTEND:${icsDateTime(event.end as Date)}`,
    `SUMMARY:${esc(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${esc(event.description)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const dates = event.allDay
    ? `${icsDate(event.start as string)}/${icsDate(event.end as string)}`
    : `${icsDateTime(event.start as Date)}/${icsDateTime(event.end as Date)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
  });
  const details = [event.description, event.url].filter(Boolean).join("\n\n");
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
