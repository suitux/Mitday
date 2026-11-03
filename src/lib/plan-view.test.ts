import { describe, expect, it } from "vitest";
import type { GridPlan } from "./grid";
import { buildOthersView } from "./plan-view";

const grid: GridPlan = {
  granularity: "day",
  dateMode: "range",
  rangeStart: "2026-11-10",
  rangeEnd: "2026-11-20",
  dates: [],
  slots: [],
  hourInterval: null,
  dayStartMinute: null,
  dayEndMinute: null,
  timezone: "Europe/Madrid",
  createdAt: "2026-11-01T00:00:00Z",
};
const options = [
  { id: "yes", label: "Sí", color: "green", weight: 1, order: 0 },
  { id: "no", label: "No", color: "red", weight: 0, order: 1 },
];
const participants = [
  { id: "p1", name: "Ana" },
  { id: "p2", name: "Berta" },
  { id: "p3", name: "Carles" },
];
const responses = [
  { participantId: "p1", cell: "2026-11-10", optionId: "yes" },
  { participantId: "p2", cell: "2026-11-10", optionId: "yes" },
  { participantId: "p3", cell: "2026-11-10", optionId: "no" },
  { participantId: "p3", cell: "2026-11-12", optionId: "yes" },
];
const input = { grid, options, participants, responses, isOwner: false };

describe("buildOthersView", () => {
  it("full: aggregates + names", () => {
    const v = buildOthersView({ ...input, visibility: "full" });
    expect(v.mode).toBe("full");
    if (v.mode === "hidden") throw new Error();
    expect(v.best).toEqual(["2026-11-10"]);
    expect(v.cells["2026-11-10"]).toMatchObject({ score: 2, intensity: 0.667 });
    expect(v.cells["2026-11-10"]?.names).toEqual({
      yes: ["Ana", "Berta"],
      no: ["Carles"],
    });
  });

  it("aggregate: no names anywhere", () => {
    const v = buildOthersView({ ...input, visibility: "aggregate" });
    const json = JSON.stringify(v);
    for (const p of participants) {
      expect(json).not.toContain(p.name);
      expect(json).not.toContain(p.id);
    }
    if (v.mode === "hidden") throw new Error();
    expect(v.cells["2026-11-12"]?.score).toBe(1);
  });

  it("hidden: nothing about other participants is serialised", () => {
    const v = buildOthersView({ ...input, visibility: "hidden" });
    expect(v).toEqual({ mode: "hidden" });
    const json = JSON.stringify(v);
    for (const p of participants) {
      expect(json).not.toContain(p.name);
      expect(json).not.toContain(p.id);
    }
    expect(json).not.toContain("2026-11-1");
  });

  it("owner always gets the full view", () => {
    expect(
      buildOthersView({ ...input, visibility: "hidden", isOwner: true }).mode,
    ).toBe("full");
  });
});
