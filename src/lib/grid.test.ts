import { describe, expect, it } from "vitest";
import {
  addDays,
  cellPlanDate,
  compareCells,
  dayWindow,
  diffDays,
  hourCellsForDate,
  isValidCell,
  planDays,
  todayIn,
  weekdayMonday,
  type GridPlan,
} from "./grid";

const base: GridPlan = {
  granularity: "day",
  dateMode: "range",
  rangeStart: "2026-11-10",
  rangeEnd: "2026-11-12",
  dates: [],
  slots: [],
  hourInterval: null,
  dayStartMinute: null,
  dayEndMinute: null,
  timezone: "Europe/Madrid",
  createdAt: "2026-11-01T10:00:00.000Z",
};
const NOW = new Date("2026-11-03T12:00:00Z");

describe("date helpers", () => {
  it("adds and diffs days across month/year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
    expect(weekdayMonday("2026-11-02")).toBe(0); // Monday
    expect(weekdayMonday("2026-11-08")).toBe(6); // Sunday
  });
  it("today in a timezone", () => {
    expect(todayIn("Europe/Madrid", new Date("2026-11-03T23:30:00Z"))).toBe(
      "2026-11-04",
    );
    expect(todayIn("America/New_York", new Date("2026-11-04T02:00:00Z"))).toBe(
      "2026-11-03",
    );
  });
});

describe("day mode", () => {
  it("range", () => {
    expect(planDays(base, NOW)).toEqual([
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
    ]);
    expect(isValidCell(base, "2026-11-11", NOW)).toBe(true);
    expect(isValidCell(base, "2026-11-13", NOW)).toBe(false);
    expect(isValidCell(base, "2026-11-11T10:00Z", NOW)).toBe(false);
  });
  it("dates", () => {
    const p: GridPlan = {
      ...base,
      dateMode: "dates",
      dates: ["2026-11-20", "2026-11-05"],
    };
    expect(planDays(p, NOW)).toEqual(["2026-11-05", "2026-11-20"]);
    expect(isValidCell(p, "2026-11-05", NOW)).toBe(true);
    expect(isValidCell(p, "2026-11-06", NOW)).toBe(false);
    expect(dayWindow(p, NOW)).toEqual({
      start: "2026-11-05",
      end: "2026-11-20",
    });
  });
  it("open: today to one year ahead, still accepting days since creation", () => {
    const p: GridPlan = {
      ...base,
      dateMode: "open",
      rangeStart: null,
      rangeEnd: null,
    };
    const days = planDays(p, NOW);
    expect(days[0]).toBe("2026-11-03");
    expect(days.at(-1)).toBe("2027-11-03");
    expect(isValidCell(p, "2026-11-01", NOW)).toBe(true);
    expect(isValidCell(p, "2026-10-31", NOW)).toBe(false);
    expect(isValidCell(p, "2027-11-04", NOW)).toBe(false);
  });
});

describe("slot mode", () => {
  const slots = [
    { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", label: "Cena", order: 1 },
    { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", label: "Comida", order: 0 },
  ];
  const p: GridPlan = { ...base, granularity: "slot", slots };
  it("validates slot ids", () => {
    expect(
      isValidCell(p, "2026-11-10@aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", NOW),
    ).toBe(true);
    expect(
      isValidCell(p, "2026-11-10@cccccccc-cccc-4ccc-8ccc-cccccccccccc", NOW),
    ).toBe(false);
    expect(isValidCell(p, "2026-11-10", NOW)).toBe(false);
  });
  it("orders by date then slot order", () => {
    const a = "2026-11-10@aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const b = "2026-11-10@bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    expect(compareCells(p, b, a)).toBeGreaterThan(0);
    expect(
      compareCells(p, "2026-11-11@aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", b),
    ).toBeGreaterThan(0);
  });
});

describe("hour mode", () => {
  const p: GridPlan = {
    ...base,
    granularity: "hour",
    rangeStart: "2026-03-28",
    rangeEnd: "2026-10-26",
    hourInterval: 60,
    dayStartMinute: 0,
    dayEndMinute: 24 * 60,
  };
  it("normal day has 24 slots, in UTC", () => {
    const cells = hourCellsForDate(p, "2026-03-28");
    expect(cells).toHaveLength(24);
    expect(cells[0]).toBe("2026-03-27T23:00Z"); // 00:00 CET
    expect(cellPlanDate(p, cells[0]!)).toBe("2026-03-28");
  });
  it("spring forward (Europe/Madrid, 2026-03-29) skips 02:00", () => {
    const cells = hourCellsForDate(p, "2026-03-29");
    expect(cells).toHaveLength(23);
    expect(cells[1]).toBe("2026-03-29T00:00Z"); // 01:00 CET
    expect(cells[2]).toBe("2026-03-29T01:00Z"); // 03:00 CEST
    expect(new Set(cells).size).toBe(23);
  });
  it("fall back (Europe/Madrid, 2026-10-25) keeps 24 wall-clock slots", () => {
    const cells = hourCellsForDate(p, "2026-10-25");
    expect(cells).toHaveLength(24);
    expect(cells[2]).toBe("2026-10-25T00:00Z"); // first 02:00 (CEST)
    expect(cells[3]).toBe("2026-10-25T02:00Z"); // 03:00 CET
  });
  it("30-minute grid between 09:00 and 23:00", () => {
    const q: GridPlan = {
      ...p,
      hourInterval: 30,
      dayStartMinute: 540,
      dayEndMinute: 1380,
    };
    const cells = hourCellsForDate(q, "2026-06-01");
    expect(cells).toHaveLength(28);
    expect(cells[0]).toBe("2026-06-01T07:00Z");
    expect(cells.at(-1)).toBe("2026-06-01T20:30Z");
    expect(isValidCell(q, "2026-06-01T07:30Z", NOW)).toBe(true);
    expect(isValidCell(q, "2026-06-01T07:15Z", NOW)).toBe(false);
    expect(isValidCell(q, "2026-06-01T06:30Z", NOW)).toBe(false);
  });
});
