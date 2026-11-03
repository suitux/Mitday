import { aggregate, type AggResponse } from "./aggregate";
import { compareCells, cellPlanDate, type GridPlan } from "./grid";

export type Visibility = "full" | "aggregate" | "hidden";

export type ViewOption = {
  id: string;
  label: string;
  color: string;
  weight: number;
  order: number;
};

export type OthersCell = {
  score: number;
  intensity: number;
  counts: Record<string, number>;
  /** Only in `full` mode. */
  names?: Record<string, string[]>;
};

export type OthersView =
  | {
      mode: "full" | "aggregate";
      participants: number;
      cells: Record<string, OthersCell>;
      best: string[];
    }
  | { mode: "hidden" };

export type ViewParticipant = { id: string; name: string };
export type ViewResponse = AggResponse;

/**
 * Builds what the participant page may send to the browser about *other*
 * participants. In `hidden` mode nothing about anybody else leaves the server.
 */
export function buildOthersView(input: {
  visibility: Visibility;
  isOwner: boolean;
  grid: GridPlan;
  options: ViewOption[];
  participants: ViewParticipant[];
  responses: ViewResponse[];
}): OthersView {
  const mode: Visibility = input.isOwner ? "full" : input.visibility;
  if (mode === "hidden") return { mode: "hidden" };

  const agg = aggregate(
    input.options,
    input.responses,
    input.participants.length,
    (a, b) => compareCells(input.grid, a, b),
    (cell) => cellPlanDate(input.grid, cell) ?? cell.slice(0, 10),
  );

  const names = new Map(input.participants.map((p) => [p.id, p.name]));
  const cells: Record<string, OthersCell> = {};
  for (const [cell, a] of Object.entries(agg.cells)) {
    cells[cell] = { score: a.score, intensity: a.intensity, counts: a.counts };
  }
  if (mode === "full") {
    for (const r of input.responses) {
      const c = cells[r.cell];
      const name = names.get(r.participantId);
      if (!c || !name) continue;
      c.names ??= {};
      (c.names[r.optionId] ??= []).push(name);
    }
    for (const c of Object.values(cells)) {
      for (const list of Object.values(c.names ?? {}))
        list.sort((a, b) => a.localeCompare(b));
    }
  }
  return { mode, participants: agg.participants, cells, best: agg.best };
}
