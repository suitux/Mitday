import { describe, expect, it } from "vitest";
import { aggregate } from "./aggregate";

const yes = { id: "yes", weight: 1 };
const maybe = { id: "maybe", weight: 0.5 };
const no = { id: "no", weight: 0 };
const opts = [yes, maybe, no];
const r = (participantId: string, cell: string, optionId: string) => ({
  participantId,
  cell,
  optionId,
});

describe("aggregate", () => {
  it("scores, intensity and counts", () => {
    const a = aggregate(
      opts,
      [
        r("a", "2026-11-10", "yes"),
        r("b", "2026-11-10", "maybe"),
        r("c", "2026-11-10", "no"),
        r("a", "2026-11-11", "yes"),
      ],
      3,
    );
    expect(a.cells["2026-11-10"]).toMatchObject({
      score: 1.5,
      intensity: 0.5,
      responses: 3,
      topCount: 1,
    });
    expect(a.cells["2026-11-10"]?.counts).toEqual({ yes: 1, maybe: 1, no: 1 });
    expect(a.best).toEqual(["2026-11-10"]);
  });

  it("tie on score: more max-weight answers wins", () => {
    const a = aggregate(
      opts,
      [
        r("a", "2026-11-10", "maybe"),
        r("b", "2026-11-10", "maybe"),
        r("a", "2026-11-12", "yes"),
        r("b", "2026-11-12", "no"),
      ],
      2,
    );
    expect(a.cells["2026-11-10"]?.score).toBe(1);
    expect(a.cells["2026-11-12"]?.score).toBe(1);
    expect(a.best).toEqual(["2026-11-12"]);
  });

  it("full tie: earliest date wins", () => {
    const a = aggregate(
      opts,
      [r("a", "2026-11-12", "yes"), r("a", "2026-11-10", "yes")],
      1,
    );
    expect(a.best).toEqual(["2026-11-10"]);
  });

  it("full tie on the same date keeps every tied cell", () => {
    const a = aggregate(
      opts,
      [
        r("a", "2026-11-10T10:00Z", "yes"),
        r("a", "2026-11-10T11:00Z", "yes"),
        r("a", "2026-11-11T10:00Z", "yes"),
      ],
      1,
    );
    expect(a.best).toEqual(["2026-11-10T10:00Z", "2026-11-10T11:00Z"]);
  });

  it("no positive score → no best cell", () => {
    expect(aggregate(opts, [r("a", "2026-11-10", "no")], 1).best).toEqual([]);
    expect(aggregate(opts, [], 0).best).toEqual([]);
  });

  it("ignores unknown options", () => {
    const a = aggregate(opts, [r("a", "2026-11-10", "ghost")], 1);
    expect(a.cells).toEqual({});
  });
});
