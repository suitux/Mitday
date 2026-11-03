import { describe, expect, it } from "vitest";
import {
  buildCell,
  cellSchema,
  isIsoDate,
  parseCell,
  toHourCellInstant,
} from "./cells";

const SLOT = "3f2b8c1e-5d4a-4b6c-9e8f-1a2b3c4d5e6f";

describe("cells", () => {
  it("validates calendar dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-1-01")).toBe(false);
  });

  it("round-trips every kind", () => {
    const cells = [
      { kind: "day", date: "2026-11-03" },
      { kind: "slot", date: "2026-11-03", slotId: SLOT },
      { kind: "hour", instant: "2026-11-03T08:30Z" },
    ] as const;
    for (const c of cells) expect(parseCell(buildCell(c))).toEqual(c);
  });

  it("normalises slot ids to lower case", () => {
    expect(
      buildCell({
        kind: "slot",
        date: "2026-11-03",
        slotId: SLOT.toUpperCase(),
      }),
    ).toBe(`2026-11-03@${SLOT}`);
    expect(parseCell(`2026-11-03@${SLOT.toUpperCase()}`)).toBeNull();
  });

  it("restricts parsing to a granularity", () => {
    expect(parseCell("2026-11-03", "hour")).toBeNull();
    expect(parseCell("2026-11-03T08:30Z", "day")).toBeNull();
    expect(parseCell("2026-11-03T24:00Z", "hour")).toBeNull();
    expect(parseCell("2026-11-03@nope", "slot")).toBeNull();
  });

  it("zod schema", () => {
    expect(cellSchema("day").safeParse("2026-11-03").success).toBe(true);
    expect(cellSchema("day").safeParse("2026-11-31").success).toBe(false);
  });

  it("formats hour instants canonically", () => {
    expect(toHourCellInstant(new Date("2026-03-29T01:00:00.000Z"))).toBe(
      "2026-03-29T01:00Z",
    );
  });
});
