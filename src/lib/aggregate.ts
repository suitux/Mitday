export type AggOption = { id: string; weight: number };
export type AggResponse = {
  participantId: string;
  cell: string;
  optionId: string;
};

export type CellAggregate = {
  cell: string;
  /** Sum of option weights. */
  score: number;
  /** score / participants, 0..1. */
  intensity: number;
  /** Count of answers per option id. */
  counts: Record<string, number>;
  /** Answers with the maximum-weight option (tie-breaker). */
  topCount: number;
  responses: number;
};

export type Aggregation = {
  participants: number;
  cells: Record<string, CellAggregate>;
  best: string[];
};

/**
 * Score per cell, intensity and best cell(s).
 * Ties: more answers with the maximum weight win, then the earliest cell
 * (`compare`). Every cell that stays tied after both criteria is "best".
 */
export function aggregate(
  options: AggOption[],
  responses: AggResponse[],
  participantCount: number,
  compare: (a: string, b: string) => number = defaultCompare,
  dateOf: (cell: string) => string = (cell) => cell.slice(0, 10),
): Aggregation {
  const weight = new Map(options.map((o) => [o.id, o.weight]));
  const maxWeight = options.reduce((m, o) => Math.max(m, o.weight), 0);
  const cells: Record<string, CellAggregate> = {};

  for (const r of responses) {
    const w = weight.get(r.optionId);
    if (w === undefined) continue;
    const agg = (cells[r.cell] ??= {
      cell: r.cell,
      score: 0,
      intensity: 0,
      counts: {},
      topCount: 0,
      responses: 0,
    });
    agg.score += w;
    agg.responses += 1;
    agg.counts[r.optionId] = (agg.counts[r.optionId] ?? 0) + 1;
    if (w === maxWeight && maxWeight > 0) agg.topCount += 1;
  }

  const n = Math.max(participantCount, 1);
  for (const agg of Object.values(cells)) {
    agg.score = round(agg.score);
    agg.intensity = Math.min(1, round(agg.score / n));
  }

  return {
    participants: participantCount,
    cells,
    best: bestCells(Object.values(cells), compare, dateOf),
  };
}

function defaultCompare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function round(x: number) {
  return Math.round(x * 1000) / 1000;
}

export function bestCells(
  cells: CellAggregate[],
  compare: (a: string, b: string) => number,
  dateOf: (cell: string) => string,
): string[] {
  const candidates = cells.filter((c) => c.score > 0);
  if (candidates.length === 0) return [];
  const maxScore = Math.max(...candidates.map((c) => c.score));
  const byScore = candidates.filter((c) => c.score === maxScore);
  const maxTop = Math.max(...byScore.map((c) => c.topCount));
  const byTop = byScore.filter((c) => c.topCount === maxTop).map((c) => c.cell);
  byTop.sort(compare);
  // Earliest date decides; every still-tied cell on that date is "best".
  const first = byTop[0];
  if (!first) return [];
  const day = dateOf(first);
  return byTop.filter((c) => dateOf(c) === day);
}
