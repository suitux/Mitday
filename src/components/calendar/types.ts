import type { HTMLAttributes } from "react";
import type { ClientPlan } from "@/lib/client-plan";
import type { CellPerson, CellVisual } from "./cell-button";

export type CellProps = (cell: string) => {
  "data-cell": string;
  onPointerDown: HTMLAttributes<HTMLElement>["onPointerDown"];
  onClick: HTMLAttributes<HTMLElement>["onClick"];
  onContextMenu: HTMLAttributes<HTMLElement>["onContextMenu"];
};

export type ViewProps = {
  plan: ClientPlan;
  now: Date;
  cellProps: CellProps;
  surfaceProps: HTMLAttributes<HTMLElement>;
  visualFor: (cell: string) => CellVisual;
  /** Accessible description of a cell's state ("Sí", "3 de 5"). */
  stateFor: (cell: string) => string;
  /** Who else answered the cell (empty unless names are visible). */
  peopleFor: (cell: string) => CellPerson[];
  /** Cell can't be painted (plan closed or inspect mode irrelevant). */
  readOnly: boolean;
};
