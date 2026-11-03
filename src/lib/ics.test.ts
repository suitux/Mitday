import { describe, expect, it } from "vitest";
import { buildIcs, eventForCell, googleCalendarUrl } from "./ics";

const plan = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Cena, amigos; 2026",
  description: "Línea 1\nLínea 2",
  granularity: "day" as const,
  slots: [
    { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", label: "Cena", order: 0 },
  ],
  hourInterval: 30,
};
const NOW = new Date("2026-11-03T10:00:00Z");

describe("ics", () => {
  it("day → all-day event", () => {
    const e = eventForCell(plan, "2026-12-31")!;
    const ics = buildIcs(e, NOW);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231");
    expect(ics).toContain("DTEND;VALUE=DATE:20270101");
    expect(ics).toContain("SUMMARY:Cena\\, amigos\; 2026");
    expect(ics).toContain("DESCRIPTION:Línea 1\\nLínea 2");
    expect(ics.endsWith("\r\n")).toBe(true);
  });
  it("slot → all-day with slot in title", () => {
    const e = eventForCell(
      { ...plan, granularity: "slot" },
      "2026-12-24@aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    )!;
    expect(e.title).toBe("Cena — Cena, amigos; 2026");
    expect(e.allDay).toBe(true);
  });
  it("hour → timed event with interval duration", () => {
    const e = eventForCell(
      { ...plan, granularity: "hour" },
      "2026-12-24T19:30Z",
    )!;
    const ics = buildIcs(e, NOW);
    expect(ics).toContain("DTSTART:20261224T193000Z");
    expect(ics).toContain("DTEND:20261224T200000Z");
  });
  it("folds long lines", () => {
    const e = eventForCell({ ...plan, title: "x".repeat(200) }, "2026-12-31")!;
    for (const line of buildIcs(e, NOW).split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
  it("google calendar url", () => {
    const url = new URL(
      googleCalendarUrl(
        eventForCell({ ...plan, granularity: "hour" }, "2026-12-24T19:30Z")!,
      ),
    );
    expect(url.searchParams.get("dates")).toBe(
      "20261224T193000Z/20261224T200000Z",
    );
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
  });
  it("invalid cell → null", () => {
    expect(eventForCell(plan, "nope")).toBeNull();
  });
});
