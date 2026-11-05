"use client";

import { Crown } from "lucide-react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type CellVisual = {
  /** Solid colour of the viewer's own answer. */
  mineColor?: string;
  /** Others' answers: tint colour and 0..1 intensity. */
  heat?: { color: string; intensity: number };
  best?: boolean;
  final?: boolean;
};

export function heatStyle(heat: CellVisual["heat"]): CSSProperties | undefined {
  if (!heat || heat.intensity <= 0) return undefined;
  return {
    backgroundColor: `color-mix(in srgb, ${heat.color} calc(${heat.intensity} * var(--heat) * 100%), var(--card))`,
  };
}

export function CellButton({
  visual,
  className,
  children,
  style,
  ...props
}: ComponentPropsWithoutRef<"button"> & { visual: CellVisual }) {
  const mine = visual.mineColor;
  return (
    <button
      type="button"
      data-nav=""
      className={cn(
        "relative flex size-full items-center justify-center rounded-md border text-sm select-none [-webkit-touch-callout:none]",
        "transition-[transform,background-color] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-[0.96]",
        "num disabled:border-transparent disabled:bg-transparent disabled:text-muted-foreground/60 disabled:active:scale-100",
        mine
          ? "border-transparent font-semibold text-white"
          : "border-border bg-card hover:border-input",
        visual.final && "ring-2 ring-hue ring-offset-1",
        className,
      )}
      style={{
        ...(mine ? { backgroundColor: mine } : heatStyle(visual.heat)),
        ...style,
      }}
      {...props}
    >
      {children}
      {visual.best ? (
        <BestMark
          className={cn(
            // Sits on the corner, off the content, like a badge.
            "absolute -top-1.5 -right-1.5 z-10",
            mine && "ring-white",
          )}
        />
      ) : null}
    </button>
  );
}

/**
 * Winner marker: a small crown badge in the accent hue. Reads as "best
 * option" without a legend, and holds up on any cell background.
 */
export function BestMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      aria-hidden={title ? undefined : true}
      title={title}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-hue text-white shadow-sm ring-1 ring-card",
        className,
      )}
    >
      <Crown className="size-2.5" strokeWidth={2.5} fill="currentColor" />
    </span>
  );
}

export type CellPerson = { name: string; color: string };

/** Most initials a cell shows; beyond it a "+" says there are more. */
export const MAX_INITIALS = 5;

function initialOf(name: string) {
  return (Array.from(name.trim())[0] ?? "?").toLocaleUpperCase();
}

/**
 * Overlapping circles with the first letter of who answered a cell, in the
 * colour of their answer. Decorative: the cell's label already says it.
 */
export function Initials({
  people,
  stack = false,
  className,
}: {
  people: CellPerson[];
  /** Small square cells: a 3×2 block on phones, one row from `sm`. */
  stack?: boolean;
  className?: string;
}) {
  if (people.length === 0) return null;
  const shown = people.slice(0, MAX_INITIALS);
  const more = people.length > MAX_INITIALS;
  const circle = cn(
    "flex shrink-0 items-center justify-center rounded-full leading-none font-semibold ring-1 ring-card",
    stack
      ? "size-3 text-[7px] sm:-ml-0.5 sm:size-4 sm:text-[9px] sm:first:ml-0"
      : "-ml-0.5 size-5 text-[10px] first:ml-0",
  );
  return (
    <span
      aria-hidden="true"
      data-initials=""
      className={cn(
        stack && shown.length + (more ? 1 : 0) > 3
          ? "grid grid-cols-3 gap-px sm:flex sm:items-center sm:gap-0"
          : cn("flex items-center", stack && "gap-px sm:gap-0"),
        className,
      )}
    >
      {shown.map((p, i) => (
        <span
          key={`${p.name}-${i}`}
          className={cn(circle, "text-white")}
          style={{ backgroundColor: p.color }}
        >
          {initialOf(p.name)}
        </span>
      ))}
      {more ? (
        <span
          className={cn(circle, "text-white")}
          // Same family as the circles it follows, a step lighter.
          style={{
            backgroundColor: `color-mix(in srgb, ${shown[shown.length - 1]!.color} 60%, white)`,
          }}
        >
          +
        </span>
      ) : null}
    </span>
  );
}
