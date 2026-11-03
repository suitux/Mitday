import type { GridPlan } from "./grid";
import type { OthersView, ViewOption } from "./plan-view";

/** Everything the participant page sends to the browser. */
export type ClientPlan = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: "open" | "closed";
  finalCell: string | null;
  visibility: "full" | "aggregate" | "hidden";
  grid: GridPlan;
  options: ViewOption[];
};

export type Answers = Record<string, string>;

export type BoardProps = {
  plan: ClientPlan;
  me: { id: string; name: string; answers: Answers; hasSaved: boolean } | null;
  others: OthersView;
  personalLink: string | null;
  /** Server "now" so client and server agree on the open window. */
  nowIso: string;
};
